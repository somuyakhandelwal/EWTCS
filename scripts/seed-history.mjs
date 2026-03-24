/**
 * seed-history.mjs
 * Generates 14-day patient history per bed.
 * Called by seed-genuine-data.mjs inside its DB transaction.
 */

import { rand, randInt, pick, addMins, shiftFor } from './seed-helpers.mjs';
import { ARCHETYPES, DELAY_REASONS, pickArchetype } from './seed-config.mjs';

/**
 * Returns the weighted archetype bias list for a ward, keyed by ward code.
 * Fix: map by ward CODE not array index — index breaks silently when new wards
 * are added (e.g. EPIC 20 added Emergency Ward ER, shifting all indices).
 * ER gets a full clinical mix so COMPLEX & LONG_STAY appear in analytics.
 */
function wardBiasFor(wardCode) {
  const biasMap = {
    'ER':     ['STANDARD', 'FAST_TRACK', 'COMPLEX', 'LONG_STAY'],
    'TRIAGE': ['FAST_TRACK', 'QUICK_OUT', 'STANDARD'],
  };
  return biasMap[wardCode] ?? ['STANDARD', 'FAST_TRACK', 'QUICK_OUT'];
}

/**
 * Inserts 14 days of historical patient journeys for all beds.
 * Returns { totalAdmissions, totalDelays } counts.
 */
export async function seedHistory(client, { beds, wards, SM, shifts, staff, allStaff, nurse, supervisor, admin, housekeeping }) {
  const NOW   = new Date();
  const START = new Date(NOW.getTime() - 14 * 24 * 3600000);
  let totalAdmissions = 0;
  let totalDelays = 0;

  for (const bed of beds) {
    // Resolve ward code (wards[] now includes code — added in seed-genuine-data.mjs)
    const wardCode = wards.find(w => w.id === bed.ward_id)?.code ?? 'ER';
    const bias     = wardBiasFor(wardCode);
    const target   = randInt(18, 30);
    let cursor     = new Date(START.getTime() + rand(0, 3) * 3600000);

    for (let a = 0; a < target; a++) {
      if (cursor.getTime() > NOW.getTime() - 6 * 3600000) break;

      const archName = (Math.random() < 0.55) ? pick(bias) : pickArchetype();
      const arch     = ARCHETYPES[archName];
      const admittedAt   = new Date(cursor);
      let   t            = new Date(cursor);
      let   prevStageId  = SM['Empty'];
      const logEntries   = [];

      for (const step of arch) {
        const stageId   = SM[step.s];
        if (!stageId) continue;
        const transTime = new Date(t);
        const shiftId   = shiftFor(transTime, shifts);
        const dur       = rand(step.min, step.max);

        let changedBy;
        if (step.s === 'Cleaning')                                        changedBy = housekeeping?.id ?? pick(allStaff);
        else if (step.s === 'Doctor Assessment' || step.s === 'Decision Made') changedBy = pick([supervisor?.id, admin?.id, nurse.id].filter(Boolean));
        else                                                               changedBy = pick(staff);

        const { rows } = await client.query(
          `INSERT INTO bed_stage_logs (bed_id, from_stage_id, to_stage_id, changed_by_user_id, transition_time, shift_id)
           VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
          [bed.id, prevStageId, stageId, changedBy, transTime, shiftId]
        );
        logEntries.push({ id: rows[0].id, stageName: step.s, stageId, transTime, bottleneck: !!step.bottleneck });
        prevStageId = stageId;
        t = addMins(t, dur);
      }

      // Return bed to Empty
      const returnTime = new Date(t);
      await client.query(
        `INSERT INTO bed_stage_logs (bed_id, from_stage_id, to_stage_id, changed_by_user_id, transition_time, shift_id)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [bed.id, prevStageId, SM['Empty'], pick(allStaff), returnTime, shiftFor(returnTime, shifts)]
      );

      // patient_admissions
      const dischargeLog = logEntries.find(l => l.stageName === 'Discharge Process');
      const dischargedAt = dischargeLog?.transTime ?? t;
      const durationMs   = dischargedAt.getTime() - admittedAt.getTime();
      if (durationMs > 0) {
        await client.query(
          `INSERT INTO patient_admissions (bed_id, admitted_at, discharged_at, total_duration_ms, discharged_by_user_id, shift_id)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [bed.id, admittedAt, dischargedAt, durationMs, pick(staff), shiftFor(dischargedAt, shifts)]
        );
        totalAdmissions++;
      }

      // Disposition delays — always for bottleneck steps, 12% random otherwise
      const dmLog     = logEntries.find(l => l.stageName === 'Decision Made');
      const isBottle  = logEntries.some(l => l.bottleneck);
      if (dmLog && (isBottle || Math.random() < 0.12)) {
        const resolvedAt = logEntries.find(l => l.stageName === 'Discharge Process')?.transTime
          ?? addMins(dmLog.transTime, rand(30, 120));
        await client.query(
          `INSERT INTO disposition_delay_reasons (bed_id, bed_stage_log_id, reason, recorded_by_user_id, recorded_at, resolved_at)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [bed.id, dmLog.id, pick(DELAY_REASONS), pick(staff), dmLog.transTime, resolvedAt]
        );
        totalDelays++;
      }

      cursor = addMins(returnTime, rand(10, 150));
    }
  }

  return { totalAdmissions, totalDelays };
}
