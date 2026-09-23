import {neon} from '@neondatabase/serverless';
if(!process.env.DATABASE_URL)throw new Error('Connect a Neon database and run vercel env pull .env.local --environment=production first.');
const sql=neon(process.env.DATABASE_URL);
await sql.query('CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1,position INTEGER NOT NULL)');
await sql.query('CREATE TABLE IF NOT EXISTS uploads (id TEXT PRIMARY KEY,owner TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,created_at TEXT NOT NULL,blob_url TEXT NOT NULL)');
await sql.query('CREATE TABLE IF NOT EXISTS login_attempts (id TEXT PRIMARY KEY,attempts INTEGER NOT NULL,window_start BIGINT NOT NULL)');
await sql.query("CREATE TABLE IF NOT EXISTS site_content (id TEXT PRIMARY KEY,payload TEXT NOT NULL,version INTEGER NOT NULL DEFAULT 1)");
console.log('Database ready. Existing project records have been preserved.');
