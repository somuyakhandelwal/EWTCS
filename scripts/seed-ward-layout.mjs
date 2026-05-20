/**
 * seed-ward-layout.mjs
 * EPIC 20 — Emergency Ward & Triage Area Layout
 *
 * Exports three idempotent ward-seeding functions:
 *   seedErBeds(client, SM)     — 30 Emergency Ward beds  (ER-01 … ER-30)
 *   seedTriageBeds(client, SM) —  6 Triage Area beds    (TRIAGE-01 … TRIAGE-06)
 *   seedOtRooms(client)        — 16 OT rooms             (OT-01 … OT-16)
 *
 * Design decisions:
 *  - createBeds() is a private generic used by both public bed seeders (DRY).
 *  - Bulk INSERT (single query per ward) — no N+1 loops.
 *  - optional:true returns empty result instead of throwing for missing wards,
 *    eliminating the redundant pre-check query that caused double ward lookups.
 *  - ON CONFLICT DO NOTHING — never silently overwrites manually-assigned ward data.
 *  - last_stage_change always seeded to CURRENT_TIMESTAMP so dashboard elapsed-time
 *    calculations never receive NULL on freshly-created beds.
 */

// ---------------------------------------------------------------------------
// Private generic — do not export
// ---------------------------------------------------------------------------

/**
 * Bulk-inserts numbered beds under a ward identified by wardCode.
 * All beds are inserted in a single parameterized query (no N+1 loops).
 *
 * @param {import('pg').PoolClient} client
 * @param {{
 *   prefix: string,
 *   count: number,
 *   wardCode: string,
 *   emptyStageId: string,
 *   optional?: boolean   // if true, returns empty result instead of throwing
 * }} opts
 * @returns {Promise<{ ward: object|null, beds: Array<{id,bed_number,ward_id}> }>}
 */
async function createBeds(client, { prefix, count, wardCode, emptyStageId, optional = false }) {
  // Single ward lookup — no duplicate checking needed (optional flag handles both paths)
  const { rows: wardRows } = await client.query(
    `SELECT id, name FROM wards WHERE code = $1 AND is_active = true LIMIT 1`,
    [wardCode]
  );

  if (!wardRows.length) {
    // optional:true → soft skip (e.g. TRIAGE may not exist in all environments)
    // optional:false → hard fail  (e.g. ER ward MUST exist for the seed to be valid)
    if (optional) return { ward: null, beds: [] };
    throw new Error(
      `Ward with code "${wardCode}" not found. Ensure all migrations have run.`
    );
  }
  const ward = wardRows[0];

  // Build bed numbers: ER-01, ER-02, … ER-30
  const bedNumbers = Array.from(
    { length: count },
    (_, i) => `${prefix}-${String(i + 1).padStart(2, '0')}`
  );

  // Each bed uses 4 dynamic params ($1…$4, $5…$8, …); static values are inlined.
  // Fix: last_stage_change is set to CURRENT_TIMESTAMP so the dashboard never
  // reads NULL when computing elapsed time for Empty beds.
  const placeholders = bedNumbers
    .map((_, i) => {
      const b = i * 4;
      return (
        `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4},` +
        ` false, true, false, false, CURRENT_TIMESTAMP, '{}')`
      );
    })
    .join(',\n    ');

  const params = bedNumbers.flatMap(n => [n, emptyStageId, ward.id, ward.name]);

  // Fix: ON CONFLICT DO NOTHING — never overwrites a bed that was manually
  // reassigned to a different ward outside of this seed script.
  // Fix: last_stage_change included in column list (was missing before).
  const { rows: inserted } = await client.query(
    `INSERT INTO beds
       (bed_number, current_stage_id, ward_id, ward_name,
        is_occupied, is_active, is_temporary, is_virtual,
        last_stage_change, metadata)
     VALUES
     ${placeholders}
     ON CONFLICT (bed_number) DO NOTHING
     RETURNING id, bed_number, ward_id`,
    params
  );

  return { ward, beds: inserted };
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

/**
 * Seeds 30 Emergency Ward beds (ER-01 … ER-30).
 * Returns the beds array — used by seedHistory() and seedLiveState().
 *
 * @param {import('pg').PoolClient} client
 * @param {Record<string, string>} SM  Stage name → id map
 * @returns {Promise<{ count: number, beds: Array<{id,bed_number,ward_id}> }>}
 */
export async function seedErBeds(client, SM) {
  const { ward, beds } = await createBeds(client, {
    prefix:       'ER',
    count:        30,
    wardCode:     'ER',
    emptyStageId: SM['Empty'],
    // optional: false (default) — ER ward is mandatory; throws if missing
  });
  console.log(`🛏️   ER beds seeded: ${beds.length} beds under "${ward.name}"`);
  return { count: beds.length, beds };
}

/**
 * Seeds 6 Triage Area beds (TRIAGE-01 … TRIAGE-06).
 * Uses optional:true so the seed does not crash if the TRIAGE ward does not
 * exist in the environment — a single ward lookup, no redundant pre-check.
 * Triage beds are excluded from ER stage history simulation (own workflow).
 *
 * @param {import('pg').PoolClient} client
 * @param {Record<string, string>} SM
 * @returns {Promise<{ count: number, beds: Array<{id,bed_number,ward_id}> }>}
 */
export async function seedTriageBeds(client, SM) {
  const { ward, beds } = await createBeds(client, {
    prefix:       'TRIAGE',
    count:        6,
    wardCode:     'TRIAGE',
    emptyStageId: SM['Empty'],
    optional:     true,   // soft-skip if TRIAGE ward absent — no duplicate pre-check
  });

  if (!ward) {
    console.warn('⚠️   Triage ward (code=TRIAGE) not found — skipping.');
    return { count: 0, beds: [] };
  }
  console.log(`🏥   Triage beds seeded: ${beds.length} beds under "${ward.name}"`);
  return { count: beds.length, beds };
}

/**
 * Seeds 16 OT rooms (OT-01 … OT-16) into the ot_rooms table.
 * Uses a single bulk INSERT — no N+1 loop.
 * ON CONFLICT DO NOTHING preserves any status changes made in the app.
 *
 * @param {import('pg').PoolClient} client
 * @returns {Promise<{ count: number }>}
 */
export async function seedOtRooms(client) {
  const OT_COUNT = 16;

  const roomNumbers = Array.from(
    { length: OT_COUNT },
    (_, i) => `OT-${String(i + 1).padStart(2, '0')}`
  );

  // Bulk INSERT: ($1,'available'), ($2,'available'), … — single round-trip
  const placeholders = roomNumbers.map((_, i) => `($${i + 1}, 'available')`).join(', ');

  const { rowCount } = await client.query(
    `INSERT INTO ot_rooms (room_number, status)
     VALUES ${placeholders}
     ON CONFLICT (room_number) DO NOTHING`,
    roomNumbers
  );

  console.log(`🔬   OT rooms seeded: ${OT_COUNT} rooms (OT-01…OT-16), ${rowCount ?? 0} new`);
  return { count: OT_COUNT };
}
