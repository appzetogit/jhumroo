import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Use PG_URI, DATABASE_URL, or fall back to local dev defaults
const connectionString = process.env.PG_URI || process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/jhumroo';

console.log(`Connecting to PostgreSQL with URL: ${connectionString.replace(/:([^:@\/\s]+)@/, ':****@')}`);

const pool = new Pool({
  connectionString,
  max: 20, // Max clients in pool
  idleTimeoutMillis: 30000, // Close idle clients after 30s
  connectionTimeoutMillis: 5000, // Timeout after 5s
});

pool.on('error', (err) => {
  console.error('⚠️ Unexpected error on idle PostgreSQL client:', err);
});

// Helper function to query database
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`⚡ SQL Executed: ${text.substring(0, 100)}... [${duration}ms, rows: ${res.rowCount}]`);
    }
    return res;
  } catch (error) {
    console.error('❌ SQL Error:', error.message, '\nQuery:', text);
    throw error;
  }
};

// Transaction client helper
export const getClient = async () => {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;
  
  // Set a timeout of 5 seconds to prevent accidental resource leaks
  const timeout = setTimeout(() => {
    console.error('⚠️ A database client has been active for more than 5 seconds!');
    console.error('Ensure client.release() is called in all execution paths.');
  }, 5000);
  
  client.release = () => {
    clearTimeout(timeout);
    client.query = query;
    client.release = release;
    return release.apply(client);
  };
  
  return client;
};

export default pool;
