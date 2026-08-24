const { Pool } = require('pg');
const config = require('./index');

const pool = new Pool({
  connectionString: config.database.url,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (duration > 1000) {
    console.warn(`Slow query (${duration}ms):`, text.substring(0, 100));
  }
  return res;
};

const getClient = async () => {
  const client = await pool.connect();
  return client;
};

module.exports = { pool, query, getClient };
