// Quick setup script for beds and stages
// Runs only migration 005 directly via pg

import pg from 'pg'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const { Pool } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function setupBedsAndStages() {
  console.log('🚀 Setting up beds and stages tables...')

  try {
    // Read migration 005
    const migrationPath = path.join(__dirname, '..', 'migrations', '005_create_beds_and_stages.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Execute the migration
    await pool.query(migrationSQL)

    // Try to mark migration as applied (may fail if pgmigrations doesn't exist)
    try {
      await pool.query(
        `INSERT INTO pgmigrations (name, run_on) 
         VALUES ('005_create_beds_and_stages', NOW())`
      )
    } catch (err) {
      console.log('ℹ️  Could not mark migration (this is okay if pgmigrations is not set up)')
    }

    console.log('✅ Beds and stages tables created successfully!')

    // Show summary
    const bedCountResult = await pool.query('SELECT COUNT(*) as count FROM beds')
    const stageCountResult = await pool.query('SELECT COUNT(*) as count FROM stages')

    console.log('')
    console.log('📊 Summary:')
    console.log(`   Stages created: ${stageCountResult.rows[0].count}`)
    console.log(`   Beds created: ${bedCountResult.rows[0].count}`)
    console.log('')
    console.log('✨ Database is ready!')
    console.log('   Run: npm run seed:beds -- to create bed records')
    console.log('   Run: npm run seed:simulate -- to add test data')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

setupBedsAndStages()
