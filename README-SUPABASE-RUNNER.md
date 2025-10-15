Run the combined Supabase SQL locally using a direct DB connection (safer than sharing service_role keys).

1) Install dependencies (Node must be installed):

   npm install pg

2) Obtain your Supabase Database connection string (from Supabase dashboard):
   - Settings → Database → Connection string → Connection string (URI format)
   - It looks like: postgres://postgres:password@db.abc123.supabase.co:5432/postgres

3) Run the script (PowerShell example):

   $env:SUPABASE_DB_URL = 'postgres://postgres:YOUR_PASSWORD@db.YOUR_PROJECT.supabase.co:5432/postgres';
   node scripts/run_sql_files.js

Notes:
- This will execute `supabase/all.sql` directly against your database.
- Keep the connection string secret. Do not commit it to source control.
- If you prefer to use the Supabase SQL Editor GUI, paste the contents of `supabase/all.sql` there and run.
