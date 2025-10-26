import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config'; // To load .env variables

// Ensure the DATABASE_URL is loaded
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set!');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: connectionString,
  // Neon requires SSL
  ssl: {
    rejectUnauthorized: false,
  },
});

async function applySchema() {
  const client = await pool.connect();
  console.log('Connected to Neon database successfully!');

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = await fs.readFile(schemaPath, 'utf-8');

    console.log('Applying schema from src/db/schema.sql...');
    await client.query(schemaSql);
    console.log('Schema applied successfully!');
  } catch (err) {
    console.error('Error applying schema:', err);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
    console.log('Database connection closed.');
  }
}

applySchema();