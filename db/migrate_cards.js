'use strict';
// Run on VM: NODE_PATH=backend/node_modules node db/migrate_cards.js
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

  async function createTable(sql, name) {
    try {
      await conn.execute(sql);
      console.log(`Created ${name}`);
    } catch (e) {
      if (e.message.includes('ORA-00955')) console.log(`${name} already exists`);
      else throw e;
    }
  }

  await createTable(`
    CREATE TABLE user_cards (
      id         NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      user_id    NUMBER NOT NULL,
      bank_name  VARCHAR2(100) NOT NULL,
      card_name  VARCHAR2(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_uc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `, 'user_cards');

  await createTable(`
    CREATE TABLE card_cashback_rules (
      id           NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      card_id      NUMBER NOT NULL,
      rule_month   VARCHAR2(7) NOT NULL,
      mcc_code     VARCHAR2(10) NOT NULL,
      cashback_pct NUMBER(5,2) NOT NULL,
      CONSTRAINT fk_ccr_card FOREIGN KEY (card_id) REFERENCES user_cards(id) ON DELETE CASCADE,
      CONSTRAINT uq_card_month_mcc UNIQUE (card_id, rule_month, mcc_code)
    )
  `, 'card_cashback_rules');

  await conn.commit();
  await conn.close();
  console.log('Migration done');
}

run().catch(e => { console.error(e); process.exit(1); });
