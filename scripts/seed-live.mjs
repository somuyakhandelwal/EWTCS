/**
 * seed-live.mjs
 * Places live (currently-occupied) patients onto beds so the dashboard
 * shows an immediately readable spread across all stages.
 * Called by seed-genuine-data.mjs inside its DB transaction.
 */

import { rand, pick, minsAgo, shiftFor } from './seed-helpers.mjs';
import { LIVE_PLAN, DELAY_REASONS } from './seed-config.mjs';

/**
 * Populates beds with live patients according to LIVE_PLAN.
 * Works through the `beds` array front-to-back; remaining beds stay Empty.
 * Returns the number of live patients placed.
 */
export async function seedLiveState(client, { beds, SM, shifts, staff, allStaff, housekeeping }) {
  let bIdx       = 0;
  let livePlaced = 0;

  for (const dist of LIVE_PLAN) {
    const stageId = SM[dist.stage];
    if (!stageId) continue;

    for (let i = 0; i < dist.count; i++) {
      if (bIdx >= beds.length) break;

      const bed      = beds[bIdx++];
      const hrsAgo   = rand(dist.minH, dist.maxH);
      const patStart = minsAgo(hrsAgo * 60);
      const shiftId  = shiftFor(patStart, shifts);

      let changedBy;
      if (dist.stage === 'Cleaning')      changedBy = housekeeping?.id ?? pick(allStaff);
      else if (dist.stage === 'Decision Made') changedBy = pick(staff);
      else                                changedBy = pick(staff);

      const { rows: logRow } = await client.query(
        `INSERT INTO bed_stage_logs (bed_id, from_stage_id, to_stage_id, changed_by_user_id, transition_time, shift_id)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [bed.id, SM['Empty'], stageId, changedBy, patStart, shiftId]
      );

      await client.query(
        `UPDATE beds SET current_stage_id=$1, is_occupied=true,
         patient_start_time=$2, last_stage_change=$2, updated_at=NOW()
         WHERE id=$3`,
        [stageId, patStart, bed.id]
      );

      // Active (unresolved) bottleneck for flagged Decision Made beds
      if (dist.stage === 'Decision Made' && dist.bottleneck) {
        await client.query(
          `INSERT INTO disposition_delay_reasons
             (bed_id, bed_stage_log_id, reason, recorded_by_user_id, recorded_at, resolved_at)
           VALUES ($1,$2,$3,$4,$5,NULL)`,
          [bed.id, logRow[0].id, pick(['no_bed_upstairs', 'awaiting_specialist']), pick(staff), patStart]
        );
      }

      livePlaced++;
    }
  }

  return livePlaced;
}
