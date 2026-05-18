'use strict';
// Migration: rename mcc_code → category_name in card_cashback_rules
// Run on VM: NODE_PATH=backend/node_modules node db/migrate_category_name.js

const db = require('../backend/src/db');

async function run() {
  await db.init();
  console.log('Renaming column mcc_code → category_name...');

  await db.execute(`ALTER TABLE card_cashback_rules RENAME COLUMN mcc_code TO category_name`);
  console.log('Column renamed.');

  // Extend length separately — MODIFY VARCHAR2(100 CHAR) must not be skipped even if NOT NULL is already set
  await db.execute(`ALTER TABLE card_cashback_rules MODIFY category_name VARCHAR2(100 CHAR)`);
  console.log('Column length extended to VARCHAR2(100 CHAR).');

  await db.execute(`ALTER TABLE card_cashback_rules DROP CONSTRAINT uq_card_month_mcc`);
  await db.execute(`ALTER TABLE card_cashback_rules ADD CONSTRAINT uq_card_month_cat UNIQUE (card_id, rule_month, category_name)`);
  console.log('Unique constraint updated.');

  console.log('Migration complete.');
  await db.close();
}

run().catch(e => { console.error(e); process.exit(1); });
