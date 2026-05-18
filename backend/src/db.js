'use strict';
const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let pool;

async function init() {
  if (pool) return;
  pool = await oracledb.createPool({
    user:           process.env.DB_USER,
    password:       process.env.DB_PASSWORD,
    connectString:  process.env.DB_CONNECTION_STRING,
    configDir:      process.env.ORACLE_WALLET_LOCATION,
    walletLocation: process.env.ORACLE_WALLET_LOCATION,
    walletPassword: process.env.DB_PASSWORD,
    poolMin:        1,
    poolMax:        5,
    poolIncrement:  1,
  });
}

async function execute(sql, binds = {}, opts = {}) {
  const conn = await pool.getConnection();
  try {
    return await conn.execute(sql, binds, { autoCommit: true, ...opts });
  } finally {
    await conn.close();
  }
}

async function transaction(fn) {
  const conn = await pool.getConnection();
  try {
    const exec = (sql, binds = {}, opts = {}) =>
      conn.execute(sql, binds, { autoCommit: false, ...opts });
    const result = await fn(exec);
    await conn.commit();
    return result;
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    await conn.close();
  }
}

async function close() {
  if (pool) {
    await pool.close(0);
    pool = null;
  }
}

module.exports = { init, execute, transaction, close };
