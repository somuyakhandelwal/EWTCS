/**
 * seed-genuine-data.mjs
 * Generates 14 days of realistic, varied emergency ward data.
 *
 * Six patient archetypes produce visibly different analytics:
 *   STANDARD    – full 8-stage journey, moderate timing (~3-5 h)
 *   FAST_TRACK  – minor case, skips Registration (~1-2 h)
 *   CRITICAL    – urgent, skips Registration, fast Treatment (~2-4 h)
 *   COMPLEX     – long Treatment + long Decision Made (~6-14 h)
 *   LONG_STAY   – extended stay with disposition bottleneck (~8-16 h)
 *   QUICK_OUT   – very minor, all stages fast (< 90 min)
 */

import pg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pg;
dotenv.config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ── helpers ──────────────────────────────────────────────────────────────────
const rand    = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick    = (arr)  => arr[Math.floor(Math.random() * arr.length)];
const minsAgo = (m)    => new Date(Date.now() - m * 60000);
const addMins = (d, m) => new Date(d.getTime() + m * 60000);

function shiftFor(date, shifts) {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 6  && h < 14) return shifts.find(s => s.name === 'Morning')?.id ?? null;
  if (h >= 14 && h < 22) return shifts.find(s => s.name === 'Evening')?.id ?? null;
  return shifts.find(s => s.name === 'Night')?.id ?? null;
}

// ── archetypes (stage name → [minMin, maxMin]) ───────────────────────────────
// Each archetype is an ordered array of steps.
// null stage = resolved at start of that archetype step (used as placeholder).

const ARCHETYPES = {
  STANDARD: [
    { s: 'Triage',                 min: 10, max: 35  },
    { s: 'Registration',           min: 15, max: 45  },
    { s: 'Doctor Assessment',      min: 20, max: 70  },
    { s: 'Treatment/Observation',  min: 90, max: 280 },
    { s: 'Decision Made',          min: 20, max: 80  },
    { s: 'Discharge Process',      min: 15, max: 45  },
    { s: 'Cleaning',               min: 12, max: 28  },
  ],
  FAST_TRACK: [                                   // minor – skips Registration
    { s: 'Triage',                 min: 5,  max: 15  },
    { s: 'Doctor Assessment',      min: 12, max: 30  },
    { s: 'Decision Made',          min: 8,  max: 25  },
    { s: 'Discharge Process',      min: 8,  max: 20  },
    { s: 'Cleaning',               min: 8,  max: 18  },
  ],
  CRITICAL: [                                     // urgent – straight to Treatment
    { s: 'Triage',                 min: 3,  max: 8   },
    { s: 'Doctor Assessment',      min: 8,  max: 20  },
    { s: 'Treatment/Observation',  min: 120, max: 260 },
    { s: 'Decision Made',          min: 15, max: 50  },
    { s: 'Discharge Process',      min: 12, max: 35  },
    { s: 'Cleaning',               min: 12, max: 22  },
  ],
  COMPLEX: [                                      // long stay
    { s: 'Triage',                 min: 15, max: 40  },
    { s: 'Registration',           min: 20, max: 50  },
    { s: 'Doctor Assessment',      min: 30, max: 90  },
    { s: 'Treatment/Observation',  min: 300, max: 600 },
    { s: 'Decision Made',          min: 60, max: 150 },
    { s: 'Discharge Process',      min: 25, max: 60  },
    { s: 'Cleaning',               min: 15, max: 30  },
  ],
  LONG_STAY: [                                    // disposition bottleneck
    { s: 'Triage',                 min: 10, max: 30  },
    { s: 'Registration',           min: 15, max: 40  },
    { s: 'Doctor Assessment',      min: 25, max: 75  },
    { s: 'Treatment/Observation',  min: 240, max: 480 },
    { s: 'Decision Made',          min: 120, max: 300, bottleneck: true },
    { s: 'Discharge Process',      min: 20, max: 50  },
    { s: 'Cleaning',               min: 12, max: 25  },
  ],
  QUICK_OUT: [                                    // very minor – all fast
    { s: 'Triage',                 min: 5,  max: 12  },
    { s: 'Registration',           min: 8,  max: 18  },
    { s: 'Doctor Assessment',      min: 10, max: 22  },
    { s: 'Decision Made',          min: 5,  max: 15  },
    { s: 'Discharge Process',      min: 5,  max: 12  },
    { s: 'Cleaning',               min: 8,  max: 15  },
  ],
};

// Weight for history generation (how often each archetype appears)
const ARCHETYPE_WEIGHTS = [
  { type: 'STANDARD',   weight: 35 },
  { type: 'FAST_TRACK', weight: 25 },
  { type: 'CRITICAL',   weight: 10 },
  { type: 'COMPLEX',    weight: 12 },
  { type: 'LONG_STAY',  weight: 8  },
  { type: 'QUICK_OUT',  weight: 10 },
];

function pickArchetype() {
  const total = ARCHETYPE_WEIGHTS.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const w of ARCHETYPE_WEIGHTS) {
    r -= w.weight;
    if (r <= 0) return w.type;
  }
  return 'STANDARD';
}

const DELAY_REASONS = [
  'no_bed_upstairs', 'awaiting_transport', 'family_consent',
  'awaiting_specialist', 'other',
];

// ── main ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('\n���  EWTCS — Variety Data Seeder (14-day history)');
  console.log('────────────────────────────────────────────────\n');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Reference data ───────────────────────────────────────────────────────
    const { rows: stages } = await client.query(
      `SELECT id, name FROM stages WHERE is_active = true ORDER BY display_order`
    );
    if (!stages.length) throw new Error('No stages — run migrations first.');
    const SM = Object.fromEntries(stages.map(s => [s.name, s.id]));
    if (!SM['Empty']) throw new Error('"Empty" stage missing.');

    const { rows: wards } = await client.query(
      `SELECT id, name FROM wards WHERE is_active = true ORDER BY name`
    );
    if (!wards.length) throw new Error('No wards — run migrations first.');

    const { rows: shifts } = await client.query(
      `SELECT id, name FROM shifts WHERE is_active = true`
    );
    if (!shifts.length) throw new Error('No shifts — run migrations first.');

    const { rows: users } = await client.query(`SELECT id, username FROM users ORDER BY created_at`);
    const nurse        = users.find(u => u.username === 'nurse');
    const supervisor   = users.find(u => u.username === 'supervisor');
    const housekeeping = users.find(u => u.username === 'housekeeping');
    const admin        = users.find(u => u.username === 'admin');
    if (!nurse) throw new Error('"nurse" user not found — run npm run init first.');

    const staff = [nurse, supervisor, admin].filter(Boolean).map(u => u.id);
    const allStaff = [nurse, supervisor, admin, housekeeping].filter(Boolean).map(u => u.id);

    // 2. Assign wards ─────────────────────────────────────────────────────────
    const w0 = wards[0].id, w1 = (wards[1] ?? wards[0]).id;
    await client.query(`UPDATE users SET ward_id=$1, updated_at=NOW() WHERE username='nurse'`,       [w0]);
    await client.query(`UPDATE users SET ward_id=$1, updated_at=NOW() WHERE username='supervisor'`,  [w1]);
    if (housekeeping) await client.query(`UPDATE users SET ward_id=$1, updated_at=NOW() WHERE username='housekeeping'`, [w0]);
    console.log('✅  Ward assignments updated');

    // 3. Clear old data ────────────────────────────────────────────────────────
    for (const t of ['disposition_delay_reasons','patient_admissions','bed_stage_logs','beds']) {
      await client.query(`TRUNCATE TABLE ${t} CASCADE`);
    }
    console.log('���️   Cleared old data');

    // 4. Create 24 beds (8 per ward) ─────────────────────────────────────────
    const beds = [];
    for (const ward of wards) {
      const pfx = ward.name.split(' ').map(w => w[0].toUpperCase()).join('');
      for (let i = 1; i <= 8; i++) {
        const { rows } = await client.query(
          `INSERT INTO beds (bed_number, current_stage_id, ward_id, is_occupied, is_active, metadata)
           VALUES ($1,$2,$3,false,true,'{}') RETURNING id, bed_number, ward_id`,
          [`${pfx}-${String(i).padStart(2,'0')}`, SM['Empty'], ward.id]
        );
        beds.push(rows[0]);
      }
    }
    console.log(`���️   Created ${beds.length} beds`);

    // 5. 14-day history ───────────────────────────────────────────────────────
    const NOW   = new Date();
    const START = new Date(NOW.getTime() - 14 * 24 * 3600000);
    let totalAdmissions = 0, totalDelays = 0;

    // Stagger archetype distribution across wards for visual variety
    const wardArchetypeBase = {
      [wards[0].id]: ['STANDARD','FAST_TRACK','QUICK_OUT'],   // Ward A: faster/lighter
      [wards[1]?.id]: ['COMPLEX','LONG_STAY','CRITICAL'],     // Ward B: heavier
    };

    for (const bed of beds) {
      const target = randInt(18, 30); // 18-30 patients per bed over 14 days
      let cursor = new Date(START.getTime() + rand(0, 3) * 3600000);

      for (let a = 0; a < target; a++) {
        if (cursor.getTime() > NOW.getTime() - 6 * 3600000) break;

        // Pick archetype — bias by ward but allow any
        let archName;
        const wardBias = wardArchetypeBase[bed.ward_id];
        if (wardBias && Math.random() < 0.55) {
          archName = pick(wardBias);
        } else {
          archName = pickArchetype();
        }
        const arch = ARCHETYPES[archName];

        const admittedAt = new Date(cursor);
        let t = new Date(cursor);
        let prevStageId = SM['Empty'];
        const logEntries = [];

        for (const step of arch) {
          const stageId = SM[step.s];
          if (!stageId) continue;

          let dur = rand(step.min, step.max);
          const transTime = new Date(t);
          const shiftId   = shiftFor(transTime, shifts);

          // Vary who records the transition based on stage
          let changedBy;
          if (step.s === 'Cleaning') changedBy = housekeeping?.id ?? pick(allStaff);
          else if (step.s === 'Doctor Assessment' || step.s === 'Decision Made') changedBy = pick([supervisor?.id, admin?.id, nurse.id].filter(Boolean));
          else changedBy = pick(staff);

          const { rows } = await client.query(
            `INSERT INTO bed_stage_logs
               (bed_id, from_stage_id, to_stage_id, changed_by_user_id, transition_time, shift_id)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
            [bed.id, prevStageId, stageId, changedBy, transTime, shiftId]
          );
          logEntries.push({ id: rows[0].id, stageName: step.s, stageId, transTime, bottleneck: !!step.bottleneck });

          prevStageId = stageId;
          t = addMins(t, dur);
        }

        // Return to Empty
        const returnTime = new Date(t);
        await client.query(
          `INSERT INTO bed_stage_logs (bed_id,from_stage_id,to_stage_id,changed_by_user_id,transition_time,shift_id)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [bed.id, prevStageId, SM['Empty'], pick(allStaff), returnTime, shiftFor(returnTime, shifts)]
        );

        // patient_admissions
        const dischargeLog = logEntries.find(l => l.stageName === 'Discharge Process');
        const dischargedAt = dischargeLog?.transTime ?? t;
        const durationMs   = dischargedAt.getTime() - admittedAt.getTime();
        if (durationMs > 0) {
          await client.query(
            `INSERT INTO patient_admissions
               (bed_id,admitted_at,discharged_at,total_duration_ms,discharged_by_user_id,shift_id)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [bed.id, admittedAt, dischargedAt, durationMs, pick(staff), shiftFor(dischargedAt, shifts)]
          );
          totalAdmissions++;
        }

        // Disposition delays: bottleneck archetypes + random 12% of others
        const dmLog = logEntries.find(l => l.stageName === 'Decision Made');
        const isBotNeck = logEntries.some(l => l.bottleneck);
        if (dmLog && (isBotNeck || Math.random() < 0.12)) {
          const resolvedAt = logEntries.find(l => l.stageName === 'Discharge Process')?.transTime ?? addMins(dmLog.transTime, rand(30, 120));
          await client.query(
            `INSERT INTO disposition_delay_reasons
               (bed_id,bed_stage_log_id,reason,recorded_by_user_id,recorded_at,resolved_at)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [bed.id, dmLog.id, pick(DELAY_REASONS), pick(staff), dmLog.transTime, resolvedAt]
          );
          totalDelays++;
        }

        // Gap between patients: 10-150 min, shorter for busy wards
        cursor = addMins(returnTime, rand(10, 150));
      }
    }
    console.log(`���  Generated ${totalAdmissions} admissions, ${totalDelays} disposition delays`);

    // 6. Live state — every stage represented ────────────────────────────────
    // Distribute current patients so EVERY stage has at least one live bed
    const LIVE = [
      { stage: 'Triage',                count: 2, minH: 0.05, maxH: 0.4  },
      { stage: 'Triage',                count: 1, minH: 0.4,  maxH: 0.9, overdue: true }, // overdue triage
      { stage: 'Registration',          count: 2, minH: 0.1,  maxH: 0.7  },
      { stage: 'Doctor Assessment',     count: 2, minH: 0.2,  maxH: 1.2  },
      { stage: 'Doctor Assessment',     count: 1, minH: 1.2,  maxH: 1.8, overdue: true },
      { stage: 'Treatment/Observation', count: 2, minH: 1.0,  maxH: 4.0  },
      { stage: 'Treatment/Observation', count: 1, minH: 6.0,  maxH: 10.0, overdue: true }, // long stay
      { stage: 'Decision Made',         count: 1, minH: 0.3,  maxH: 1.5  },
      { stage: 'Decision Made',         count: 1, minH: 2.5,  maxH: 5.0, bottleneck: true },
      { stage: 'Discharge Process',     count: 1, minH: 0.1,  maxH: 0.7  },
      { stage: 'Cleaning',              count: 1, minH: 0.05, maxH: 0.4  },
      // 6 beds remain Empty
    ];

    let bIdx = 0;
    for (const dist of LIVE) {
      const stageId = SM[dist.stage];
      if (!stageId) continue;
      for (let i = 0; i < dist.count; i++) {
        if (bIdx >= beds.length) break;
        const bed     = beds[bIdx++];
        const hrsAgo  = rand(dist.minH, dist.maxH);
        const pStart  = minsAgo(hrsAgo * 60);
        const shiftId = shiftFor(pStart, shifts);

        // Pick appropriate staff for each stage
        let changedBy;
        if (dist.stage === 'Cleaning') changedBy = housekeeping?.id ?? pick(allStaff);
        else changedBy = pick(staff);

        const { rows: logRow } = await client.query(
          `INSERT INTO bed_stage_logs (bed_id,from_stage_id,to_stage_id,changed_by_user_id,transition_time,shift_id)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [bed.id, SM['Empty'], stageId, changedBy, pStart, shiftId]
        );
        await client.query(
          `UPDATE beds SET current_stage_id=$1,is_occupied=true,patient_start_time=$2,last_stage_change=$2,updated_at=NOW() WHERE id=$3`,
          [stageId, pStart, bed.id]
        );

        // Active bottleneck for Decision Made beds
        if (dist.stage === 'Decision Made' && dist.bottleneck) {
          await client.query(
            `INSERT INTO disposition_delay_reasons (bed_id,bed_stage_log_id,reason,recorded_by_user_id,recorded_at,resolved_at)
             VALUES ($1,$2,$3,$4,$5,NULL)`,
            [bed.id, logRow[0].id, pick(['no_bed_upstairs','awaiting_specialist']), pick(staff), pStart]
          );
        }
      }
    }

    await client.query('COMMIT');

    // 7. Summary ──────────────────────────────────────────────────────────────
    const { rows: bs }  = await client.query(`SELECT is_occupied,COUNT(*) FROM beds GROUP BY is_occupied`);
    const { rows: lc }  = await client.query(`SELECT COUNT(*) FROM bed_stage_logs`);
    const { rows: ac }  = await client.query(`SELECT COUNT(*) FROM patient_admissions`);
    const { rows: dc }  = await client.query(`SELECT COUNT(*) FROM disposition_delay_reasons`);
    const { rows: ssc } = await client.query(
      `SELECT s.name, COUNT(*) FROM bed_stage_logs l JOIN stages s ON s.id=l.to_stage_id
       WHERE l.transition_time > NOW()-interval'14 days' GROUP BY s.name ORDER BY COUNT(*) DESC`
    );

    console.log('\n────────────────────────────────────────────────');
    console.log('✅  Seed complete!\n');
    console.log(`   ���️  Beds:           ${beds.length} total — ${bs.find(r=>r.is_occupied)?.count??0} occupied, ${bs.find(r=>!r.is_occupied)?.count??0} available`);
    console.log(`   ���  Log entries:    ${lc[0].count}`);
    console.log(`   ���  Admissions:     ${ac[0].count}`);
    console.log(`   ⏳  Delays:         ${dc[0].count}`);
    console.log(`\n   Top stages by transitions:`);
    ssc.slice(0, 6).forEach(r => console.log(`      ${r.name.padEnd(25)} ${r.count}`));
    console.log('\n   6 patient archetypes seeded: STANDARD · FAST_TRACK · CRITICAL · COMPLEX · LONG_STAY · QUICK_OUT');
    console.log('────────────────────────────────────────────────\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌  Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
