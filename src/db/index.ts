import pg from 'pg';
import { DATABASE_URL } from '../config';

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = (text: string, params: any[] = []) => {
  return pool.query(text, params);
};

// Export the pool directly for transaction management
export const getClient = async () => {
  return pool.connect();
};

export default pool; // Export the pool for graceful shutdown in server.ts