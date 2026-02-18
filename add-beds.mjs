import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

for (let i = 1; i <= 12; i++) {
  const bedNumber = `EW-${String(i).padStart(2, '0')}`
  await pool.query(
    `INSERT INTO beds (bed_number) VALUES ($1) ON CONFLICT DO NOTHING`,
    [bedNumber]
  )
}

console.log('✅ 12 beds added!')
await pool.end()
