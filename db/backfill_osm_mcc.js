'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const db = require('../backend/src/db');

// Guess MCC from merchant name (fallback when OSM tags are unavailable)
function guessMcc(name) {
  if (!name) return '5411';
  const n = name.toLowerCase();
  if (/аптека|фармац|сана|риа|имплозия|здоров/.test(n)) return '5912';
  if (/ресторан|кафе|кофе|суши|пицца|бургер|макдо|kfc|subway|столов|буфет|шаурм|рамен|dining/.test(n)) return '5812';
  if (/азс|заправк|нефть|лукойл|роснефть|bp |shell|neste/.test(n)) return '5541';
  if (/универмаг|универмакет|торговый центр|\bтц\b|гум|цум/.test(n)) return '5311';
  return '5411';
}

async function main() {
  await db.init();

  const email = 'seed@mcc-tracker.internal';
  const hash  = '$2b$10$seedseedseedseedseedseOseedpasswordhashplaceholder0000';
  try {
    await db.execute(`INSERT INTO users (email, password_hash) VALUES (:email, :hash)`, { email, hash });
  } catch (e) {
    if (e.errorNum !== 1) throw e;
  }
  const { rows: seedRows } = await db.execute(
    `SELECT id FROM users WHERE email = :email`, { email }
  );
  const seedUserId = seedRows[0].ID;

  const { rows } = await db.execute(`
    SELECT m.id, m.name, m.yandex_firm_id
    FROM   merchants m
    WHERE  m.yandex_firm_id LIKE 'osm_%'
      AND  NOT EXISTS (SELECT 1 FROM mcc_votes v WHERE v.merchant_id = m.id)
  `);

  console.log(`OSM merchants without votes: ${rows.length}`);

  let inserted = 0, errors = 0;
  for (const row of rows) {
    const mcc = guessMcc(row.NAME);
    try {
      await db.execute(
        `INSERT INTO mcc_votes (merchant_id, user_id, mcc_code) VALUES (:merchantId, :userId, :mccCode)`,
        { merchantId: row.ID, userId: seedUserId, mccCode: mcc }
      );
      inserted++;
      if (inserted % 500 === 0) console.log(`  inserted ${inserted}...`);
    } catch (e) {
      console.error('ERR:', row.NAME, e.message);
      errors++;
    }
  }

  await db.close();
  console.log(`Done. inserted=${inserted} errors=${errors}`);
}

main().catch(console.error);
