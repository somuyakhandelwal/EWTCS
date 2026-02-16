// Simulate Occupied Beds Script
// Creates realistic test data with occupied beds in various stages
// Run with: node scripts/simulate-occupied-beds.mjs

import pg from 'pg'
import dotenv from 'dotenv'
const { Pool } = pg

dotenv.config({ path: '.env.local' })

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function simulateOccupiedBeds() {
  console.log('🎭 Simulating occupied beds with realistic test data...')

  try {
    // Get all stages
    const stagesResult = await pool.query(
      `SELECT id, name FROM stages WHERE is_active = true ORDER BY display_order ASC`
    )

    if (stagesResult.rows.length === 0) {
      throw new Error('No stages found. Run migrations first.')
    }

    const stages = stagesResult.rows
    console.log(`Found ${stages.length} stages`)

    // Get a nurse user for logs (get first user or use a default)
    const userResult = await pool.query(
      `SELECT id FROM users WHERE role = 'nurse' LIMIT 1`
    )

    if (userResult.rows.length === 0) {
      throw new Error('No nurse user found. Create a user first.')
    }

    const nurseUserId = userResult.rows[0].id

    // Get all beds
    const bedsResult = await pool.query(
      `SELECT id, bed_number FROM beds WHERE is_active = true ORDER BY bed_number ASC`
    )

    if (bedsResult.rows.length === 0) {
      throw new Error('No beds found. Run seed-beds.mjs first.')
    }

    const beds = bedsResult.rows
    console.log(`Found ${beds.length} beds`)

    // Simulate different scenarios
    const scenarios = [
      { count: 5, stage: 'Triage', minHours: 0.25, maxHours: 1 },
      { count: 3, stage: 'Registration', minHours: 0.5, maxHours: 1.5 },
      { count: 4, stage: 'Doctor Assessment', minHours: 1, maxHours: 2.5 },
      { count: 3, stage: 'Treatment/Observation', minHours: 2, maxHours: 3.5 },
      { count: 2, stage: 'Treatment/Observation', minHours: 3.5, maxHours: 5 }, // Delayed
      { count: 2, stage: 'Decision Made', minHours: 0.5, maxHours: 1.5 },
      { count: 1, stage: 'Discharge Process', minHours: 0.25, maxHours: 0.75 },
    ]

    let bedIndex = 0

    for (const scenario of scenarios) {
      const stageName = scenario.stage
      const stage = stages.find(s => s.name === stageName)

      if (!stage) {
        console.warn(`⚠️  Stage "${stageName}" not found, skipping...`)
        continue
      }

      console.log(`\nSimulating ${scenario.count} beds in "${stageName}"...`)

      for (let i = 0; i < scenario.count && bedIndex < beds.length; i++) {
        const bed = beds[bedIndex]
        bedIndex++

        // Random time within range
        const hoursAgo = scenario.minHours + Math.random() * (scenario.maxHours - scenario.minHours)
        const minutesAgo = Math.floor(hoursAgo * 60)
        const patientStartTime = new Date(Date.now() - minutesAgo * 60 * 1000)

        // Update bed
        await pool.query(
          `
          UPDATE beds
          SET 
            current_stage_id = $1,
            is_occupied = true,
            patient_start_time = $2,
            last_stage_change = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          `,
          [stage.id, patientStartTime, bed.id]
        )

        // Create initial log entry
        await pool.query(
          `
          INSERT INTO bed_stage_logs (bed_id, from_stage_id, to_stage_id, changed_by_user_id, transition_time)
          VALUES ($1, NULL, $2, $3, $4)
          `,
          [bed.id, stage.id, nurseUserId, patientStartTime]
        )

        console.log(`   ✓ ${bed.bed_number}: ${hoursAgo.toFixed(1)}h ago`)
      }
    }

    console.log('\n✅ Simulation completed!')

    // Show summary
    const occupiedResult = await pool.query(
      `SELECT COUNT(*) as count FROM beds WHERE is_occupied = true`
    )
    const delayedResult = await pool.query(
      `
      SELECT COUNT(*) as count 
      FROM beds 
      WHERE is_occupied = true 
        AND patient_start_time IS NOT NULL
        AND EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - patient_start_time)) * 1000 > $1
      `,
      [10800000] // 3 hours in milliseconds
    )

    console.log('\n📊 Summary:')
    console.log(`   Total beds: ${beds.length}`)
    console.log(`   Occupied beds: ${occupiedResult.rows[0].count}`)
    console.log(`   Available beds: ${beds.length - parseInt(occupiedResult.rows[0].count)}`)
    console.log(`   Delayed beds (>3h): ${delayedResult.rows[0].count}`)
    console.log('')
    console.log('🎉 Ready to view dashboard!')

  } catch (error) {
    console.error('❌ Error simulating beds:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

simulateOccupiedBeds()
