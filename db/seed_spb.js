'use strict';
require('dotenv').config();
const db = require('./src/db');

const merchants = [
  { id: 'spb_001', name: 'Пятёрочка',    address: 'Невский пр., 88',       lat: 59.9311, lon: 30.3609 },
  { id: 'spb_002', name: 'Магнит',        address: 'ул. Рубинштейна, 15',   lat: 59.9285, lon: 30.3447 },
  { id: 'spb_003', name: 'ВкусВилл',      address: 'Литейный пр., 32',      lat: 59.9389, lon: 30.3497 },
  { id: 'spb_004', name: 'Лента',         address: 'Московский пр., 109',   lat: 59.8965, lon: 30.3195 },
  { id: 'spb_005', name: 'Аптека Невис',  address: 'Садовая ул., 21',       lat: 59.9271, lon: 30.3201 },
  { id: 'spb_006', name: 'Перекрёсток',   address: 'ул. Восстания, 1',      lat: 59.9335, lon: 30.3601 },
  { id: 'spb_007', name: 'Старбакс',      address: 'Невский пр., 25',       lat: 59.9356, lon: 30.3254 },
  { id: 'spb_008', name: 'Бургер Кинг',   address: 'Невский пр., 44',       lat: 59.9326, lon: 30.3424 },
  { id: 'spb_009', name: 'Спортмастер',   address: 'Сенная пл., 2',         lat: 59.9256, lon: 30.3190 },
  { id: 'spb_010', name: 'Аптека 36.6',   address: 'Невский пр., 60',       lat: 59.9312, lon: 30.3528 },
];

async function main() {
  await db.init();

  for (const m of merchants) {
    try {
      await db.execute(
        `INSERT INTO merchants (yandex_firm_id, name, address, lat, lon)
         VALUES (:id, :name, :address, :lat, :lon)`,
        { id: m.id, name: m.name, address: m.address, lat: m.lat, lon: m.lon }
      );
      console.log('OK:', m.name);
    } catch (e) {
      if (e.errorNum === 1) { console.log('SKIP (exists):', m.name); }
      else { console.error('ERR:', m.name, e.message); }
    }
  }

  await db.close();
  console.log('Done');
}

main().catch(console.error);
