/**
 * seed-doctor-user.mjs
 * Creates a test doctor user for EPIC 22 manual verification.
 * Password: Nurse@123 (same as other test users)
 */
import pg from 'pg'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'

const { Pool } = pg
dotenv.config({ path: '.env.local' })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function seedDoctor() {
  const client = await pool.connect()
  try {
    // Check if doctor1 already exists
    const existing = await client.query(
      `SELECT id FROM users WHERE username = 'doctor1'`
    )
    if (existing.rows.length > 0) {
      console.log('ℹ️  doctor1 already exists — skipping.')
      return
    }

    const passwordHash = await bcrypt.hash('Nurse@123', 12)

    await client.query(
      `INSERT INTO users (username, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, 'doctor', NOW(), NOW())`,
      ['doctor1', passwordHash]
    )

    console.log('\n✅  Doctor test user created!')
    console.log('   Username : doctor1')
    console.log('   Password : Nurse@123')
    console.log('   Role     : doctor')
    console.log('   URL      : http://localhost:3000/login\n')
  } catch (err) {
    console.error('❌  Failed:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

seedDoctor()
