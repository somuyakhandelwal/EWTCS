import pg from 'pg'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config({ path: '.env.local' })
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const migrationsDir = './migrations'
const files = fs.readdirSync(migrationsDir).sort()

for (const file of files) {
  if (file.endsWith('.sql')) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
    try {
      await pool.query(sql)
      console.log(`✅ ${file}`)
    } catch (e) {
      console.log(`⚠️ ${file}: ${e.message}`)
    }
  }
}

await pool.end()
console.log('Done!')
