'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const db = require('../backend/src/db');

async function main() {
  await db.init();

  const r1 = await db.execute(
    `SELECT yandex_firm_id, name, lat, lon FROM merchants WHERE yandex_firm_id = :id`,
    { id: '5348552838656760' }
  );
  console.log('by 2gis id:', JSON.stringify(r1.rows));

  const r2 = await db.execute(
    `SELECT yandex_firm_id, name, lat, lon FROM merchants
     WHERE ABS(lat - 59.89223) < 0.0005 AND ABS(lon - 30.4483) < 0.0005`,
    {}
  );
  console.log('by coords:', JSON.stringify(r2.rows));

  await db.close();
}

main().catch(console.error);
