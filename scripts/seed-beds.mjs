// Seed Beds Script
// Creates sample emergency ward beds for testing
// Run with: node scripts/seed-beds.mjs

import pg from 'pg'
import dotenv from 'dotenv'
const { Pool } = pg

dotenv.config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function seedBeds() {
  console.log('🌱 Seeding emergency ward beds...')

  try {
    // Get the Empty stage ID
    const stageResult = await pool.query(
      `SELECT id FROM stages WHERE name = 'Empty' LIMIT 1`
    )

    if (stageResult.rows.length === 0) {
      throw new Error('Empty stage not found. Run migrations first.')
    }

    const emptyStageId = stageResult.rows[0].id

    // Define beds to create
    const beds = [
      // Emergency beds (20 beds)
      ...Array.from({ length: 20 }, (_, i) => ({
        bedNumber: `ER-${String(i + 1).padStart(2, '0')}`,
        isOccupied: false,
        currentStageId: emptyStageId,
      })),
    ]

    console.log(`Creating ${beds.length} beds...`)

    // Insert beds
    for (const bed of beds) {
      await pool.query(
        `
        INSERT INTO beds (bed_number, current_stage_id, is_occupied, is_active)
        VALUES ($1, $2, $3, true)
        ON CONFLICT (bed_number) DO NOTHING
        `,
        [bed.bedNumber, bed.currentStageId, bed.isOccupied]
      )
    }

    console.log('✅ Beds seeded successfully!')

    // Show summary
    const bedCountResult = await pool.query('SELECT COUNT(*) as count FROM beds WHERE is_active = true')
    const stageCountResult = await pool.query('SELECT COUNT(*) as count FROM stages WHERE is_active = true')

    console.log('')
    console.log('📊 Summary:')
    console.log(`   Total active beds: ${bedCountResult.rows[0].count}`)
    console.log(`   Total active stages: ${stageCountResult.rows[0].count}`)
    console.log('')
    console.log('🎉 Database is ready for use!')
    console.log('   You can now log in and view the bed dashboard.')

  } catch (error) {
    console.error('❌ Error seeding beds:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

seedBeds()
