import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

await pool.query(`UPDATE users SET role = 'admin' WHERE username = 'nurse'`)
console.log('Admin role restored!')
await pool.end()
