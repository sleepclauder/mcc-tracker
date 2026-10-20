'use strict';
const oracledb = require('oracledb');

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let connConfig;

const CONNECT_TIMEOUT_MS = 10000;

async function init() {
  if (connConfig) return;
  connConfig = {
    user:           process.env.DB_USER,
    password:       process.env.DB_PASSWORD,
    connectString:  process.env.DB_CONNECTION_STRING,
    configDir:      process.env.ORACLE_WALLET_LOCATION,
    walletLocation: process.env.ORACLE_WALLET_LOCATION,
    walletPassword: process.env.ORACLE_WALLET_PASSWORD,
  };
  // oracledb's connection pool hangs indefinitely against this wallet (NJS-040
  // queue timeout even with a single idle connection) — connect directly per
  // call instead. See incident 2026-10-20. Deliberately not test-connecting
  // here: a slow/unreachable DB must not block the HTTP server from starting.
}

async function getConn() {
  return Promise.race([
    oracledb.getConnection(connConfig),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`DB connect timed out after ${CONNECT_TIMEOUT_MS}ms`)), CONNECT_TIMEOUT_MS)
    ),
  ]);
}

async function execute(sql, binds = {}, opts = {}) {
  const conn = await getConn();
  try {
    return await conn.execute(sql, binds, { autoCommit: true, ...opts });
  } finally {
    await conn.close();
  }
}

async function transaction(fn) {
  const conn = await getConn();
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
  connConfig = null;
}

module.exports = { init, execute, transaction, close };
