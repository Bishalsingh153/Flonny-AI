const { Pool } = require('pg');

let pool;

async function initDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in environment variables.');
  }

  // Parse connection URL to configure SSL correctly (bypassing SELF_SIGNED_CERT_IN_CHAIN issue)
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

  // Test the connection
  try {
    const client = await pool.connect();
    console.log('Successfully connected to Supabase PostgreSQL database.');
    client.release();
  } catch (err) {
    console.error('Database connection test failed:', err);
    throw err;
  }

  // Create users table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create transactions table if not exists
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

  // Create budgets table if not exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS budgets (
      category VARCHAR(100) NOT NULL,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount DOUBLE PRECISION NOT NULL,
      period VARCHAR(50) DEFAULT 'monthly',
      PRIMARY KEY (category, user_id)
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
