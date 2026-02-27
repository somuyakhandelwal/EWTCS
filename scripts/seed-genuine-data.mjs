/**
 * seed-genuine-data.mjs
 * Entry point for the EWTCS data seed.
 * Orchestrates DB setup and delegates history + live-state generation to:
 *   seed-helpers.mjs  – shared utility functions
 *   seed-config.mjs   – archetypes, weights, delay reasons, live plan
 *   seed-history.mjs  – 14-day patient history per bed
 *   seed-live.mjs     – current live-patient distribution
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { seedHistory }   from './seed-history.mjs';
import { seedLiveState } from './seed-live.mjs';
const { Pool } = pg;
dotenv.config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  console.log('\n🌟  EWTCS — Variety Data Seeder (14-day history, 6 archetypes)');
  console.log('────────────────────────────────────────────────────────────\n');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Load reference data ──────────────────────────────────────────────────
    const { rows: stages } = await client.query(
      `SELECT id, name FROM stages WHERE is_active = true ORDER BY display_order`
    );
    if (!stages.length) throw new Error('No stages — run migrations first.');
    const SM = Object.fromEntries(stages.map(s => [s.name, s.id]));
    if (!SM['Empty']) throw new Error('"Empty" stage missing from DB.');

    const { rows: wards } = await client.query(
      `SELECT id, name FROM wards WHERE is_active = true ORDER BY name`
    );
    if (!wards.length) throw new Error('No wards — run migrations first.');

    const { rows: shifts } = await client.query(
      `SELECT id, name FROM shifts WHERE is_active = true`
    );
    if (!shifts.length) throw new Error('No shifts — run migrations first.');

    const { rows: users } = await client.query(
      `SELECT id, username FROM users ORDER BY created_at`
    );
    const nurse        = users.find(u => u.username === 'nurse');
    const supervisor   = users.find(u => u.username === 'supervisor');
    const housekeeping = users.find(u => u.username === 'housekeeping');
    const admin        = users.find(u => u.username === 'admin');
    if (!nurse) throw new Error('"nurse" user not found — run npm run init first.');

    const staff    = [nurse, supervisor, admin].filter(Boolean).map(u => u.id);
    const allStaff = [nurse, supervisor, admin, housekeeping].filter(Boolean).map(u => u.id);

    // 2. Assign wards to staff ────────────────────────────────────────────────
    const w0 = wards[0].id;
    const w1 = (wards[1] ?? wards[0]).id;
    await client.query(`UPDATE users SET ward_id=$1, updated_at=NOW() WHERE username='nurse'`,      [w0]);
    await client.query(`UPDATE users SET ward_id=$1, updated_at=NOW() WHERE username='supervisor'`, [w1]);
    if (housekeeping) {
      await client.query(`UPDATE users SET ward_id=$1, updated_at=NOW() WHERE username='housekeeping'`, [w0]);
    }
    console.log('✅  Ward assignments updated');

    // 3. Clear existing bed data ──────────────────────────────────────────────
    for (const t of ['disposition_delay_reasons', 'patient_admissions', 'bed_stage_logs', 'beds']) {
      await client.query(`TRUNCATE TABLE ${t} CASCADE`);
    }
    console.log('🗑️   Cleared old bed data');

    // 4. Create 24 beds (8 per ward) ──────────────────────────────────────────
    const beds = [];
    const bedsPerWard = Math.ceil(24 / wards.length);
    for (const ward of wards) {
      const pfx   = ward.name.split(' ').map(w => w[0].toUpperCase()).join('');
      const count = Math.min(bedsPerWard, 24 - beds.length);
      for (let i = 1; i <= count; i++) {
        const { rows } = await client.query(
          `INSERT INTO beds (bed_number, current_stage_id, ward_id, is_occupied, is_active, metadata)
           VALUES ($1,$2,$3,false,true,'{}') RETURNING id, bed_number, ward_id`,
          [`${pfx}-${String(i).padStart(2, '0')}`, SM['Empty'], ward.id]
        );
        beds.push(rows[0]);
      }
    }
    console.log(`🛏️   Created ${beds.length} beds across ${wards.length} ward(s)`);

    // 5. 14-day patient history ───────────────────────────────────────────────
    const ctx = { beds, wards, SM, shifts, staff, allStaff, nurse, supervisor, admin, housekeeping };
    const { totalAdmissions, totalDelays } = await seedHistory(client, ctx);
    console.log(`📋  History: ${totalAdmissions} admissions · ${totalDelays} disposition delays`);

    // 6. Live patient state ───────────────────────────────────────────────────
    const livePlaced = await seedLiveState(client, { beds, SM, shifts, staff, allStaff, housekeeping });

    await client.query('COMMIT');

    // 7. Summary ──────────────────────────────────────────────────────────────
    const { rows: bStats }    = await client.query(`SELECT is_occupied, COUNT(*) FROM beds GROUP BY is_occupied`);
    const { rows: logCount }  = await client.query(`SELECT COUNT(*) FROM bed_stage_logs`);
    const { rows: admCount }  = await client.query(`SELECT COUNT(*) FROM patient_admissions`);
    const { rows: delCount }  = await client.query(`SELECT COUNT(*) FROM disposition_delay_reasons`);
    const { rows: topStages } = await client.query(
      `SELECT s.name, COUNT(*) as cnt FROM bed_stage_logs l
       JOIN stages s ON s.id = l.to_stage_id
       WHERE l.transition_time > NOW() - interval '14 days'
       GROUP BY s.name ORDER BY cnt DESC`
    );

    const occupied  = bStats.find(r => String(r.is_occupied) === 'true')?.count  ?? 0;
    const available = bStats.find(r => String(r.is_occupied) === 'false')?.count ?? 0;

    console.log('\n────────────────────────────────────────────────────────────');
    console.log('✅  Seed complete!\n');
    console.log(`   🛏️  Beds:          ${beds.length} total — ${occupied} occupied · ${available} available`);
    console.log(`   📝  Log entries:   ${logCount[0].count}`);
    console.log(`   🏥  Admissions:    ${admCount[0].count}`);
    console.log(`   ⏳  Delays:        ${delCount[0].count}`);
    console.log(`   🏃  Live patients: ${livePlaced}`);
    console.log('\n   Top stages (14-day history):');
    topStages.slice(0, 6).forEach(r => console.log(`      ${r.name.padEnd(26)} ${r.cnt}`));
    console.log('\n   Archetypes: STANDARD · FAST_TRACK · CRITICAL · COMPLEX · LONG_STAY · QUICK_OUT');
    console.log('────────────────────────────────────────────────────────────\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌  Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
