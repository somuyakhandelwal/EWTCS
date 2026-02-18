import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

await pool.query(`DROP TABLE IF EXISTS audit_logs`)
await pool.query(`CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  action TEXT,
  performed_by_user_id INTEGER,
  user_id INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  details JSONB
)`)

console.log('audit_logs fixed!')
await pool.end()
