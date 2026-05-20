'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
const db = require('../backend/src/db');

const NEW_CODES = [
  ['7538', 'Автосервис и ремонт автомобилей', 'Автосервис'],
  ['7534', 'Шиномонтаж', 'Автосервис'],
  ['6411', 'Страховые компании', 'Страхование'],
];

async function main() {
  await db.init();
  for (const [code, name, category] of NEW_CODES) {
    try {
      await db.execute(
        `INSERT INTO mcc_codes VALUES (:code, :name, :category)`,
        { code, name, category }
      );
      console.log(`inserted ${code} — ${name}`);
    } catch (e) {
      if (e.errorNum === 1) console.log(`skip ${code} — already exists`);
      else throw e;
    }
  }
  await db.close();
  console.log('done');
}

main().catch(console.error);
