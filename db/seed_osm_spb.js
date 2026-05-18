'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const https = require('https');
const db = require('../backend/src/db');

const OVERPASS_QUERY = `
[out:json][timeout:120];
(
  node["shop"~"^(supermarket|convenience|grocery)$"](59.75,29.50,60.15,30.75);
  node["amenity"~"^(pharmacy|restaurant|cafe|fast_food|fuel)$"](59.75,29.50,60.15,30.75);
  node["shop"~"^(department_store|mall)$"](59.75,29.50,60.15,30.75);
);
out body 5000;
`.trim();

function osmTagToMcc(tags) {
  if (!tags) return '5411';
  const { shop, amenity } = tags;
  if (amenity === 'pharmacy')                                         return '5912';
  if (amenity === 'restaurant' || amenity === 'cafe'
      || amenity === 'fast_food')                                     return '5812';
  if (amenity === 'fuel')                                             return '5541';
  if (shop === 'department_store' || shop === 'mall')                 return '5311';
  return '5411'; // supermarket / convenience / grocery / default
}

function buildAddress(tags) {
  const parts = [];
  if (tags['addr:street'])      parts.push(tags['addr:street']);
  if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
  return parts.join(', ') || tags['addr:full'] || null;
}

function fetchOverpass(query) {
  return new Promise((resolve, reject) => {
    const body = 'data=' + encodeURIComponent(query);
    const opts = {
      hostname: 'overpass-api.de',
      path: '/api/interpreter',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'mcc-tracker-seed/1.0',
      },
    };
    const req = https.request(opts, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function ensureSeedUser() {
  const email = 'seed@mcc-tracker.internal';
  const hash  = '$2b$10$seedseedseedseedseedseOseedpasswordhashplaceholder0000';
  try {
    await db.execute(
      `INSERT INTO users (email, password_hash) VALUES (:email, :hash)`,
      { email, hash }
    );
  } catch (e) {
    if (e.errorNum !== 1) throw e; // ignore ORA-00001 unique violation
  }
  const result = await db.execute(
    `SELECT id FROM users WHERE email = :email`,
    { email }
  );
  return result.rows[0].ID;
}

async function main() {
  console.log('Fetching Saint Petersburg merchants from Overpass API...');
  const data = await fetchOverpass(OVERPASS_QUERY);

  const nodes = (data.elements || []).filter(e =>
    e.type === 'node' && e.lat && e.lon && e.tags?.name
  );
  console.log(`Fetched ${nodes.length} named nodes`);

  await db.init();
  const seedUserId = await ensureSeedUser();
  console.log(`Seed user id: ${seedUserId}`);

  let inserted = 0, skipped = 0, errors = 0;

  for (const node of nodes) {
    const firmId = `osm_${node.id}`;
    const name   = node.tags.name;
    const addr   = buildAddress(node.tags);
    const mcc    = osmTagToMcc(node.tags);

    let merchantId;
    try {
      const res = await db.execute(
        `INSERT INTO merchants (yandex_firm_id, name, address, lat, lon)
         VALUES (:id, :name, :address, :lat, :lon)
         RETURNING id INTO :mid`,
        { id: firmId, name, address: addr, lat: node.lat, lon: node.lon,
          mid: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER } }
      );
      merchantId = res.outBinds.mid[0];
      inserted++;
      if (inserted % 100 === 0) console.log(`  inserted ${inserted}...`);
    } catch (e) {
      if (e.errorNum === 1) {
        // already exists — get id for the vote
        const r = await db.execute(
          `SELECT id FROM merchants WHERE yandex_firm_id = :id`, { id: firmId }
        );
        merchantId = r.rows[0]?.ID;
        skipped++;
      } else {
        console.error('ERR insert merchant:', name, e.message);
        errors++;
        continue;
      }
    }

    if (!merchantId) continue;

    // insert seed vote so MCC shows up on map right away
    try {
      await db.execute(
        `INSERT INTO mcc_votes (merchant_id, user_id, mcc_code)
         VALUES (:merchantId, :userId, :mccCode)`,
        { merchantId, userId: seedUserId, mccCode: mcc }
      );
    } catch (e) {
      if (e.errorNum !== 1) console.error('ERR vote:', name, e.message);
    }
  }

  await db.close();
  console.log(`Done. inserted=${inserted} skipped=${skipped} errors=${errors}`);
}

main().catch(console.error);
