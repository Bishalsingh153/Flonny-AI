const { Pool } = require('pg');

let pool;

async function initDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in environment variables.');
  }

  const url = new URL(connectionString);
  const config = {
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    host: url.hostname,
    port: url.port ? parseInt(url.port) : 5432,
    database: url.pathname.substring(1),
    ssl: { rejectUnauthorized: false }
  };

  pool = new Pool(config);

  try {
    const client = await pool.connect();
    console.log('Successfully connected to Supabase PostgreSQL database.');
    client.release();
  } catch (err) {
    console.error('Database connection test failed:', err);
    throw err;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount DOUBLE PRECISION NOT NULL,
      type VARCHAR(10) NOT NULL CHECK(type IN ('income', 'expense')),
      category VARCHAR(100) NOT NULL,
      merchant VARCHAR(255),
      date VARCHAR(50) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS budgets (
      category VARCHAR(100) NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount DOUBLE PRECISION NOT NULL,
      period VARCHAR(50) DEFAULT 'monthly',
      PRIMARY KEY (category, user_id)
    )
  `);

  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'manual'`);
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS receipt_url TEXT`);
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS original_amount DOUBLE PRECISION`);
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS original_currency VARCHAR(10)`);
  await pool.query(`ALTER TABLE transactions ADD COLUMN IF NOT EXISTS split_with VARCHAR(255)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS recurring_rules (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      merchant VARCHAR(255) NOT NULL,
      amount DOUBLE PRECISION NOT NULL,
      category VARCHAR(100) NOT NULL,
      cadence VARCHAR(50) DEFAULT 'monthly',
      next_date VARCHAR(50) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      target_amount DOUBLE PRECISION NOT NULL,
      current_amount DOUBLE PRECISION DEFAULT 0,
      deadline VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS insights_cache (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      cache_date VARCHAR(20) NOT NULL,
      payload JSONB NOT NULL
    )
  `);

  console.log('PostgreSQL Database tables verified and ready.');
  return pool;
}

function getDb() {
  if (!pool) {
    throw new Error('Database not initialized! Call initDb() first.');
  }
  return pool;
}

module.exports = {
  initDb,
  getDb
};
