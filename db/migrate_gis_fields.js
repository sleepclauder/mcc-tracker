'use strict';
// Run on VM: NODE_PATH=backend/node_modules node db/migrate_gis_fields.js
const path = require('path');
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({
  path: path.join(__dirname, '../backend/.env'),
});
const oracledb = require(path.join(__dirname, '../backend/node_modules/oracledb'));

async function run() {
  const conn = await oracledb.getConnection({
    user:           process.env.DB_USER,
    password:       process.env.DB_PASSWORD,
    connectString:  process.env.DB_CONNECTION_STRING,
    configDir:      process.env.ORACLE_WALLET_LOCATION,
    walletLocation: process.env.ORACLE_WALLET_LOCATION,
    walletPassword: process.env.DB_PASSWORD,
  });

  const cols = [
    ['gis_url',          'VARCHAR2(500)'],
    ['gis_rating',       'NUMBER(3,1)'],
    ['gis_review_count', 'NUMBER DEFAULT 0'],
    ['gis_fetched_at',   'TIMESTAMP'],
  ];

  for (const [col, type] of cols) {
    try {
      await conn.execute(`ALTER TABLE merchants ADD ${col} ${type}`);
      console.log(`Added column: ${col}`);
    } catch (e) {
      if (e.message.includes('ORA-01430')) console.log(`Column already exists: ${col}`);
      else throw e;
    }
  }

  await conn.execute(`
    CREATE OR REPLACE VIEW v_merchant_stats AS
    SELECT
        m.id,
        m.yandex_firm_id,
        m.name,
        m.address,
        m.lat,
        m.lon,
        m.gis_url,
        m.gis_rating,
        m.gis_review_count,
        m.gis_fetched_at,
        (SELECT v.mcc_code
         FROM   mcc_votes v
         WHERE  v.merchant_id = m.id
         ORDER  BY v.voted_at DESC
         FETCH FIRST 1 ROW ONLY
        ) AS last_mcc,
        (SELECT v2.mcc_code
         FROM   mcc_votes v2
         WHERE  v2.merchant_id = m.id
         AND    v2.voted_at >= SYSTIMESTAMP - INTERVAL '30' DAY
         GROUP  BY v2.mcc_code
         ORDER  BY COUNT(*) DESC
         FETCH FIRST 1 ROW ONLY
        ) AS top_mcc_30d,
        (SELECT COUNT(*)
         FROM   mcc_votes v
         WHERE  v.merchant_id = m.id
        ) AS votes_total,
        (SELECT COUNT(*)
         FROM   mcc_votes v
         WHERE  v.merchant_id = m.id
         AND    v.voted_at >= SYSTIMESTAMP - INTERVAL '30' DAY
        ) AS votes_30d
    FROM merchants m
  `);
  console.log('Updated view v_merchant_stats');

  await conn.commit();
  await conn.close();
  console.log('Migration done');
}

run().catch(e => { console.error(e); process.exit(1); });
