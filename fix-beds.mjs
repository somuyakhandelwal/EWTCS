import pg from 'pg'
import dotenv from 'dotenv'
import fs from 'fs'

dotenv.config({ path: '.env.local' })
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

// Drop and recreate
await pool.query(`DROP TABLE IF EXISTS bed_stage_logs CASCADE`)
await pool.query(`DROP TABLE IF EXISTS beds CASCADE`)
await pool.query(`DROP TABLE IF EXISTS stages CASCADE`)

const sql = fs.readFileSync('./migrations/005_create_beds_and_stages.sql', 'utf8')
await pool.query(sql)

console.log('✅ Beds and stages created!')
await pool.end()
