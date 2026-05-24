'use strict';
// Seed merchants from OpenStreetMap via Overpass API for any configured city.
// Usage (run on VM — needs Oracle wallet):
//   NODE_PATH=backend/node_modules node db/seed_osm_cities.js              # all cities
//   NODE_PATH=backend/node_modules node db/seed_osm_cities.js moscow        # one city
//   NODE_PATH=backend/node_modules node db/seed_osm_cities.js moscow podolsk # multiple

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const https = require('https');
const db = require('../backend/src/db');

// bbox format: [south, west, north, east]
const CITIES = {
  moscow:  { name: 'Moscow',  bbox: [55.49, 37.32, 55.92, 37.97] },
  podolsk: { name: 'Podolsk', bbox: [55.38, 37.47, 55.51, 37.62] },
};

function buildQuery(bbox) {
  const b = bbox.join(',');
  return `
[out:json][timeout:180];
(
  node["shop"~"^(supermarket|convenience|grocery)$"](${b});
  node["amenity"~"^(pharmacy|restaurant|cafe|fast_food|pub|bar|fuel|car_repair)$"](${b});
  node["shop"~"^(department_store|mall|car_repair|tyres|alcohol|wine|hairdresser|beauty)$"](${b});
  node["office"="insurance"](${b});
  way["shop"~"^(supermarket|convenience|grocery)$"](${b});
  way["amenity"~"^(pharmacy|restaurant|cafe|fast_food|pub|bar|fuel|car_repair)$"](${b});
  way["shop"~"^(department_store|mall|car_repair|tyres|alcohol|wine|hairdresser|beauty)$"](${b});
  way["office"="insurance"](${b});
);
out body center 50000;
`.trim();
}

function osmTagToMcc(tags) {
  if (!tags) return '5411';
  const { shop, amenity, office } = tags;
  if (office === 'insurance')                                          return '6411';
  if (amenity === 'pharmacy')                                          return '5912';
  if (amenity === 'restaurant' || amenity === 'cafe'
      || amenity === 'fast_food' || amenity === 'pub'
      || amenity === 'bar')                                            return '5812';
  if (amenity === 'fuel')                                              return '5541';
  if (amenity === 'car_repair' || shop === 'car_repair')               return '7538';
  if (shop === 'tyres')                                                return '7534';
  if (shop === 'alcohol' || shop === 'wine')                           return '5921';
  if (shop === 'hairdresser' || shop === 'beauty')                     return '7230';
  if (shop === 'department_store' || shop === 'mall')                  return '5311';
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
    if (e.errorNum !== 1) throw e;
  }
  const result = await db.execute(
    `SELECT id FROM users WHERE email = :email`, { email }
  );
  return result.rows[0].ID;
}

async function seedCity(cityKey, seedUserId) {
  const city = CITIES[cityKey];
  console.log(`\n=== Seeding ${city.name} (bbox: ${city.bbox.join(', ')}) ===`);

  const data = await fetchOverpass(buildQuery(city.bbox));
  const elements = (data.elements || []).filter(e => {
    if (!e.tags?.name) return false;
    if (e.type === 'node') return e.lat && e.lon;
    if (e.type === 'way')  return e.center?.lat && e.center?.lon;
    return false;
  });
  console.log(`Fetched ${elements.length} named elements`);

  let inserted = 0, skipped = 0, errors = 0;

  for (const node of elements) {
    const isWay  = node.type === 'way';
    const prefix = cityKey === 'moscow' ? 'osm_msk' : `osm_${cityKey}`;
    const firmId = isWay ? `${prefix}_w_${node.id}` : `${prefix}_${node.id}`;
    const lat    = isWay ? node.center.lat : node.lat;
    const lon    = isWay ? node.center.lon : node.lon;
    const name   = node.tags.name;
    const addr   = buildAddress(node.tags);
    const mcc    = osmTagToMcc(node.tags);

    let merchantId;
    try {
      const res = await db.execute(
        `INSERT INTO merchants (yandex_firm_id, name, address, lat, lon)
         VALUES (:id, :name, :address, :lat, :lon)
         RETURNING id INTO :mid`,
        { id: firmId, name, address: addr, lat, lon,
          mid: { dir: require('oracledb').BIND_OUT, type: require('oracledb').NUMBER } }
      );
      merchantId = res.outBinds.mid[0];
      inserted++;
      if (inserted % 200 === 0) console.log(`  inserted ${inserted}...`);
    } catch (e) {
      if (e.errorNum === 1) {
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

  console.log(`${city.name}: inserted=${inserted} skipped=${skipped} errors=${errors}`);
}

async function main() {
  const args = process.argv.slice(2).map(a => a.toLowerCase());
  const keys = args.length > 0 ? args : Object.keys(CITIES);

  const unknown = keys.filter(k => !CITIES[k]);
  if (unknown.length) {
    console.error(`Unknown city keys: ${unknown.join(', ')}`);
    console.error(`Available: ${Object.keys(CITIES).join(', ')}`);
    process.exit(1);
  }

  await db.init();
  const seedUserId = await ensureSeedUser();
  console.log(`Seed user id: ${seedUserId}`);

  for (const key of keys) {
    await seedCity(key, seedUserId);
  }

  await db.close();
  console.log('\nAll done.');
}

main().catch(console.error);
