import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

await pool.query(`
  INSERT INTO users (username, password_hash, role, is_active) 
  VALUES ('admin', (SELECT password_hash FROM users WHERE username = 'nurse'), 'admin', true)
  ON CONFLICT (username) DO NOTHING
`)

await pool.query(`UPDATE users SET role = 'nurse' WHERE username = 'nurse'`)

console.log('Done! admin user created, nurse role set!')
await pool.end()
