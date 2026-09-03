import sql from 'mssql';

let poolPromise = null;

function configFromEnv() {
  const {
    MULTIPROBE_DB_SERVER,
    MULTIPROBE_DB_PORT,
    MULTIPROBE_DB_DATABASE,
    MULTIPROBE_DB_USER,
    MULTIPROBE_DB_PASSWORD,
    MULTIPROBE_DB_ENCRYPT,
    MULTIPROBE_DB_TRUST_SERVER_CERT,
  } = process.env;

  if (!MULTIPROBE_DB_SERVER || !MULTIPROBE_DB_DATABASE || !MULTIPROBE_DB_USER || !MULTIPROBE_DB_PASSWORD) {
    throw new Error(
      'Missing Multiprobe DB config. Required env vars: MULTIPROBE_DB_SERVER, MULTIPROBE_DB_DATABASE, MULTIPROBE_DB_USER, MULTIPROBE_DB_PASSWORD'
    );
  }

  return {
    server: MULTIPROBE_DB_SERVER,
    port: MULTIPROBE_DB_PORT ? Number(MULTIPROBE_DB_PORT) : 1433,
    database: MULTIPROBE_DB_DATABASE,
    user: MULTIPROBE_DB_USER,
    password: MULTIPROBE_DB_PASSWORD,
    options: {
      encrypt: MULTIPROBE_DB_ENCRYPT !== 'false',
      trustServerCertificate: MULTIPROBE_DB_TRUST_SERVER_CERT === 'true',
    },
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000,
    },
    requestTimeout: 15000,
  };
}

export function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(configFromEnv()).connect();
    poolPromise.catch(() => {
      // allow retry on next call instead of caching a rejected pool
      poolPromise = null;
    });
  }
  return poolPromise;
}

export { sql };
