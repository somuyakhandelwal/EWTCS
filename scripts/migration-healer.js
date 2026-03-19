'use strict';
const { Client } = require('pg');

/**
 * Heals known duplicate migration sequence bugs where files were identically numbered.
 * Safely updates the pgmigrations ledger to reflect final non-conflicting names.
 */
async function healMigrations(databaseUrl) {
    const healClient = new Client({ connectionString: databaseUrl });
    try {
        await healClient.connect();

        // Parameterized update to prevent SQL injection during heal
        const heal = async (newName, oldNameOrId, isId = false) => {
            const query = isId 
                ? `UPDATE pgmigrations SET name = $1 WHERE id = $2 AND name <> $1`
                : `UPDATE pgmigrations SET name = $1 WHERE name = $2`;
            
            const { rowCount } = await healClient.query(query, [newName, oldNameOrId]);
            if (rowCount > 0) console.log(`[migrations] self-heal: fixed "${oldNameOrId}" → "${newName}"`);
        };

        // Historical PR #161/#162 conflicts
        await heal('007_create_bed_stage_log_corrections', 7, true);
        await heal('009_token_blacklist', 9, true);

        // 015-021 Sequence Conflict Resolution mapping
        const renames = [
            ['015_add_password_reset', '019_add_password_reset'],
            ['016_add_tat_to_admissions', '020_add_tat_to_admissions'],
            ['017_add_temporary_beds', '021_add_temporary_beds'],
            ['018_create_shifts', '022_create_shifts'],
            ['019_add_shift_id_to_logs', '023_add_shift_id_to_logs'],
            ['020_create_system_settings', '024_create_system_settings'],
            ['021_create_stage_delay_thresholds', '025_create_stage_delay_thresholds'],
            ['024_add_housekeeping_role_and_stages', '015_add_housekeeping_role_and_stages'],
            ['023_create_daily_summaries', '022_create_daily_summaries'],
        ];

        for (const [newName, oldName] of renames) {
            await heal(newName, oldName);
        }
    } catch (e) {
        // Table may not exist yet on fresh install, safe to ignore
    } finally {
        await healClient.end().catch(() => {});
    }
}

module.exports = { healMigrations };
