// Remove Performance Test Beds Script
// Removes PERF-* beds and their associated stage logs from the local database
// Run with: node scripts/remove-perf-beds.mjs

import pg from 'pg'
import dotenv from 'dotenv'
const { Pool } = pg

dotenv.config({ path: '.env.local' })

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
})

async function removePerfBeds() {
    console.log('🧹 Removing performance test beds (PERF-*) from local database...')

    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        // First, count what we're about to delete
        const countResult = await client.query(
            `SELECT COUNT(*) as count FROM beds WHERE bed_number LIKE 'PERF-%'`
        )
        const bedCount = Number(countResult.rows[0].count)

        if (bedCount === 0) {
            console.log('ℹ️  No PERF-* beds found in the database. Nothing to remove.')
            await client.query('ROLLBACK')
            return
        }

        console.log(`Found ${bedCount} PERF-* beds to remove.`)

        // Temporarily disable the immutability trigger (local dev cleanup only)
        await client.query(
            `ALTER TABLE bed_stage_logs DISABLE TRIGGER trg_prevent_bed_stage_log_delete`
        )
        console.log('🔓 Immutability trigger temporarily disabled for cleanup...')

        // Delete associated stage logs first (foreign key constraint)
        const logsResult = await client.query(
            `DELETE FROM bed_stage_logs
       WHERE bed_id IN (
         SELECT id FROM beds WHERE bed_number LIKE 'PERF-%'
       )
       RETURNING id`
        )
        console.log(`✅ Deleted ${logsResult.rowCount} stage log entries.`)

        // Re-enable the immutability trigger
        await client.query(
            `ALTER TABLE bed_stage_logs ENABLE TRIGGER trg_prevent_bed_stage_log_delete`
        )
        console.log('🔒 Immutability trigger re-enabled.')

        // Now delete the beds themselves
        const bedsResult = await client.query(
            `DELETE FROM beds WHERE bed_number LIKE 'PERF-%' RETURNING bed_number`
        )
        console.log(`✅ Deleted ${bedsResult.rowCount} PERF-* beds.`)

        await client.query('COMMIT')

        // Show remaining bed count
        const remainingResult = await client.query(
            `SELECT COUNT(*) as count FROM beds WHERE is_active = true`
        )
        console.log('')
        console.log('📊 Remaining active beds in database:', remainingResult.rows[0].count)
        console.log('🎉 Performance test data removed successfully!')

    } catch (error) {
        await client.query('ROLLBACK')
        console.error('❌ Error removing PERF beds:', error)
        process.exit(1)
    } finally {
        client.release()
        await pool.end()
    }
}

removePerfBeds()
