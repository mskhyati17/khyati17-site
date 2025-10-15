/*
  Run combined Supabase SQL script against a Postgres database.
  Usage:
    - Install dependencies: npm install pg
    - Set env var SUPABASE_DB_URL to your Supabase DB connection string (from Settings -> Database -> Connection string)
    - node scripts/run_sql_files.js

  Note: This connects directly to your Postgres DB. Keep your connection string secret.
*/
import fs from 'fs';
import { Client } from 'pg';

const sqlPath = new URL('../supabase/all.sql', import.meta.url).pathname;
if(!fs.existsSync(sqlPath)){ console.error('supabase/all.sql not found at', sqlPath); process.exit(2); }
const sql = fs.readFileSync(sqlPath,'utf8');

const dbUrl = process.env.SUPABASE_DB_URL;
if(!dbUrl){ console.error('Set SUPABASE_DB_URL environment variable to your Supabase DATABASE URL (Postgres connection).'); process.exit(2); }

const client = new Client({ connectionString: dbUrl });

(async ()=>{
  try{
    await client.connect();
    console.log('Connected to DB — running supabase/all.sql (this may take a moment)');
    // Run in a single transaction
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('all.sql executed successfully');
    await client.end();
    process.exit(0);
  }catch(e){
    console.error('Error running all.sql:', e.message || e);
    try{ await client.query('ROLLBACK'); }catch(_){/* ignore */}
    await client.end();
    process.exit(1);
  }
})();
