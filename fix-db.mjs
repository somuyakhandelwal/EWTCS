import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

await pool.query(`CREATE TABLE IF NOT EXISTS token_blacklist (
  token TEXT PRIMARY KEY,
  created_at TIMESTAMP DEFAULT NOW()
)`)

await pool.query(`CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  action TEXT,
  user_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
)`)

console.log('Tables created!')
await pool.end()
