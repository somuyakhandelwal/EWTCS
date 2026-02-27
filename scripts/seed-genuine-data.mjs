import pg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pg;

dotenv.config({ path: '.env.local' });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function generateGenuineEnvironment() {
    console.log('🌟 Initializing genuine EWTCS environment...');

    try {
        // 1. Verify basic setup points
        const stageResult = await pool.query(`SELECT id, name FROM stages WHERE is_active = true`);
        if (stageResult.rows.length === 0) throw new Error('No stages found. Run migrations first.');
        const stages = stageResult.rows;

        const emptyStage = stages.find(s => s.name === 'Empty');
        if (!emptyStage) throw new Error('Empty stage not found.');

        const wardResult = await pool.query(`SELECT id, name FROM wards WHERE is_active = true ORDER BY name ASC`);
        if (wardResult.rows.length === 0) throw new Error('No wards found. Run migrations first.');
        const wards = wardResult.rows;

        // Assign nurse to the first ward, supervisor to the second (or first if only one)
        // housekeeping also gets the first ward (shared with nurse — both see /dashboard)
        // auditor has no ward — they access /analytics which is not ward-scoped
        const nurseWardId = wards[0].id;
        const supervisorWardId = wards[1]?.id ?? wards[0].id;

        await pool.query(
            `UPDATE users SET ward_id = $1, updated_at = NOW() WHERE username = 'nurse'`,
            [nurseWardId]
        );
        await pool.query(
            `UPDATE users SET ward_id = $1, updated_at = NOW() WHERE username = 'supervisor'`,
            [supervisorWardId]
        );
        await pool.query(
            `UPDATE users SET ward_id = $1, updated_at = NOW() WHERE username = 'housekeeping'`,
            [nurseWardId]
        );
        console.log(`✅ Nurse assigned to ward: ${wards[0].name}`);
        console.log(`✅ Housekeeping assigned to ward: ${wards[0].name}`);
        console.log(`✅ Supervisor assigned to ward: ${wards[1]?.name ?? wards[0].name}`);
        console.log(`✅ Auditor has no ward (analytics-only role)`);

        // We assume init-system.js set up admin, nurse, etc. Let's find the nurse user to make logs.
        const userResult = await pool.query(`SELECT id, ward_id FROM users WHERE username = 'nurse' LIMIT 1`);
        if (userResult.rows.length === 0) throw new Error('No nurse user found. Did you run npm run init?');
        const nurseUserId = userResult.rows[0].id;

        // 2. Generate exactly 24 Beds (8 per ward) for a realistic, clean look on UI
        console.log('🛏️ Creating 24 genuine hospital beds across wards...');

        // Clear old beds
        await pool.query('TRUNCATE TABLE beds CASCADE');

        const beds = [];
        let bedIndex = 1;
        for (const ward of wards) {
            for (let i = 0; i < 8; i++) {
                // e.g. EWA-01, EWA-02...
                const prefix = ward.name.split(' ').map(w => w[0]).join('');
                const code = String(i + 1).padStart(2, '0');

                const result = await pool.query(
                    `INSERT INTO beds (bed_number, current_stage_id, ward_id, is_occupied, is_active, metadata)
           VALUES ($1, $2, $3, false, true, '{}'::jsonb) RETURNING *`,
                    [`${prefix}-${code}`, emptyStage.id, ward.id]
                );
                beds.push(result.rows[0]);
            }
        }

        // 3. Populate genuine patient states
        console.log('🩺 Processing current patient flow...');

        // Scenarios spread across the available wards
        const realisticPatientDistributions = [
            { count: 3, stage: 'Triage', minHours: 0.1, maxHours: 0.5 },
            { count: 2, stage: 'Registration', minHours: 0.2, maxHours: 0.8 },
            { count: 2, stage: 'Doctor Assessment', minHours: 0.3, maxHours: 1.5 },
            { count: 3, stage: 'Treatment/Observation', minHours: 1.5, maxHours: 4.0 }, // normal flow
            { count: 1, stage: 'Treatment/Observation', minHours: 4.0, maxHours: 7.0 }, // slightly delayed
            { count: 1, stage: 'Decision Made', minHours: 0.1, maxHours: 1.0 },
            { count: 1, stage: 'Discharge Process', minHours: 0.1, maxHours: 0.8 },
            { count: 1, stage: 'Cleaning', minHours: 0.2, maxHours: 0.5 },
            // The remaining 10 beds will stay "Empty" (ready/available)
        ];

        let currentBedWalker = 0;

        for (const scenario of realisticPatientDistributions) {
            const stage = stages.find(s => s.name === scenario.stage);
            if (!stage) continue;

            for (let i = 0; i < scenario.count; i++) {
                const bed = beds[currentBedWalker++];

                // Random time
                const hoursAgo = scenario.minHours + Math.random() * (scenario.maxHours - scenario.minHours);
                const minutesAgo = Math.floor(hoursAgo * 60);
                const patientStartTime = new Date(Date.now() - minutesAgo * 60 * 1000);

                // Transition the bed
                await pool.query(
                    `UPDATE beds
           SET current_stage_id = $1, is_occupied = true, patient_start_time = $2, last_stage_change = $2, updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
                    [stage.id, patientStartTime, bed.id]
                );

                // Log the change
                await pool.query(
                    `INSERT INTO bed_stage_logs (bed_id, from_stage_id, to_stage_id, changed_by_user_id, transition_time)
           VALUES ($1, $2, $3, $4, $5)`,
                    [bed.id, emptyStage.id, stage.id, nurseUserId, patientStartTime]
                );
            }
        }

        console.log('✨ Genuine environment successfully seeded!');

        const stats = await pool.query('SELECT is_occupied, count(*) FROM beds GROUP BY is_occupied');
        const occ = stats.rows.find(r => r.is_occupied)?.count || 0;
        const vac = stats.rows.find(r => !r.is_occupied)?.count || 0;
        console.log(`\n📊 Status: ${occ} Occupied Patients, ${vac} Available Beds`);

    } catch (error) {
        console.error('❌ Error generating environment:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

generateGenuineEnvironment();
