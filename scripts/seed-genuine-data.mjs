/**
 * seed-genuine-data.mjs
 * Entry point for the EWTCS data seed.
 * Orchestrates DB setup and delegates history + live-state generation to:
 *   seed-helpers.mjs      – shared utility functions
 *   seed-config.mjs       – archetypes, weights, delay reasons, live plan
 *   seed-history.mjs      – 14-day patient history per bed
 *   seed-live.mjs         – current live-patient distribution
 *   seed-ward-layout.mjs  – EPIC 20: ER beds, Triage beds, OT rooms
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { seedHistory }   from './seed-history.mjs';
import { seedLiveState } from './seed-live.mjs';
import {
  seedErBeds,
  seedTriageBeds,
  seedOtRooms,
} from './seed-ward-layout.mjs';
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
      `SELECT id, name, code FROM wards WHERE is_active = true ORDER BY name`
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
    // Fix: resolve by ward code — positional lookup (wards[0]) silently breaks
    // if any new ward name sorts alphabetically before 'Emergency Ward'.
    const erWard = wards.find(w => w.code === 'ER');
    if (!erWard) throw new Error('Emergency Ward (code=ER) not found — run migration 052 first.');
    await client.query(`UPDATE users SET ward_id=$1, updated_at=NOW() WHERE username='nurse'`,      [erWard.id]);
    await client.query(`UPDATE users SET ward_id=$1, updated_at=NOW() WHERE username='supervisor'`, [erWard.id]);
    if (housekeeping) {
      await client.query(`UPDATE users SET ward_id=$1, updated_at=NOW() WHERE username='housekeeping'`, [erWard.id]);
    }
    console.log('✅  Ward assignments updated (staff → Emergency Ward ER)');

    // 3. Clear existing bed data ──────────────────────────────────────────────
    // Fix: freeze the allowlist — table names MUST be compile-time constants.
    // PostgreSQL cannot parameterize identifiers ($1 only works for values),
    // so string interpolation here is only safe when the set is immutable.
    // Never derive these names from user input, ENV vars, or config files.
    const SEED_TABLES = Object.freeze([
      'disposition_delay_reasons', 'patient_admissions', 'bed_stage_logs', 'beds',
    ]);
    for (const t of SEED_TABLES) {
      await client.query(`TRUNCATE TABLE ${t} CASCADE`);
    }
    console.log('🗑️   Cleared old bed data');

    // 4. Seed ward layout — EPIC 20 ───────────────────────────────────────────
    // ER-01..ER-30: used for history + live-state simulation below.
    // TRIAGE-01..06 and OT-01..16 are seeded for correctness but intentionally
    // excluded from ER history/live context (they have separate workflows).
    const { beds } = await seedErBeds(client, SM);  // 30 Emergency Ward beds
    await seedTriageBeds(client, SM);               // 6 Triage Area beds (re-seed after TRUNCATE)
    await seedOtRooms(client);                      // 16 OT rooms (ot_rooms table)

    // 5. 14-day patient history ───────────────────────────────────────────────
    const ctx = { beds, wards, SM, shifts, staff, allStaff, nurse, supervisor, admin, housekeeping };
    const { totalAdmissions, totalDelays } = await seedHistory(client, ctx);
    console.log(`📋  History: ${totalAdmissions} admissions · ${totalDelays} disposition delays`);

    // 6. Live patient state ───────────────────────────────────────────────────
    const livePlaced = await seedLiveState(client, { beds, SM, shifts, staff, allStaff, housekeeping });

    await client.query('COMMIT');

    // 7. Summary ──────────────────────────────────────────────────────────────
    const { rows: bStats }    = await client.query(
      `SELECT is_occupied, COUNT(*) FROM beds WHERE bed_number LIKE 'ER-%' GROUP BY is_occupied`
    );
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

    // Count triage beds and OT rooms for the summary
    const { rows: triageCount } = await client.query(
      `SELECT COUNT(*) FROM beds WHERE bed_number LIKE 'TRIAGE-%'`
    );
    const { rows: otCount } = await client.query(
      `SELECT COUNT(*) FROM ot_rooms`
    );

    console.log('\n────────────────────────────────────────────────────────────');
    console.log('✅  Seed complete!\n');
    console.log(`   🛏️  ER Beds:        ${beds.length} (ER-01…ER-${String(beds.length).padStart(2, '0')}) — ${occupied} occupied · ${available} available`);
    console.log(`   🏥  Triage Beds:    ${triageCount[0].count} (TRIAGE-01…TRIAGE-06)`);
    console.log(`   🔬  OT Rooms:       ${otCount[0].count} (OT-01…OT-16)`);
    console.log(`   📝  Log entries:    ${logCount[0].count}`);
    console.log(`   📊  Admissions:     ${admCount[0].count}`);
    console.log(`   ⏳  Delays:         ${delCount[0].count}`);
    console.log(`   🏃  Live patients:  ${livePlaced}`);
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
