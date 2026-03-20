'use strict';

const healDatabaseMigrations = async (databaseUrl) => {
    const { Client } = require('pg');
    const healClient = new Client({ connectionString: databaseUrl });
    try {
        await healClient.connect();
        // 007/009 swap introduced by PRs #161/#162
        await healClient.query(
            "UPDATE pgmigrations SET name = '007_create_bed_stage_log_corrections' WHERE id = 7 AND name <> '007_create_bed_stage_log_corrections'"
        );
        await healClient.query(
            "UPDATE pgmigrations SET name = '009_token_blacklist' WHERE id = 9 AND name <> '009_token_blacklist'"
        );
        // 015-021 renumbering: teammates created duplicate 015 files; during conflict resolution
        // migrations were temporarily numbered 019-025 before settling on the final 015-021 sequence.
        // Heal any DB that went through the intermediate state.
        // Also heal renames for fixed SQL duplicates (038, 040, 047, 046, 047, 051).
        const renames = [
            ['019_add_password_reset', '015_add_password_reset'], ['020_add_tat_to_admissions', '016_add_tat_to_admissions'],
            ['015_add_tat_to_admissions', '016_add_tat_to_admissions'],
            ['021_add_temporary_beds', '017_add_temporary_beds'], ['022_create_shifts', '018_create_shifts'],
            ['023_add_shift_id_to_logs', '019_add_shift_id_to_logs'], ['024_create_system_settings', '020_create_system_settings'],
            ['025_create_stage_delay_thresholds', '021_create_stage_delay_thresholds'], ['015_add_housekeeping_role_and_stages', '024_add_housekeeping_role_and_stages'],
            ['022_create_daily_summaries', '023_create_daily_summaries'],
            ['038_create_alert_preferences', '052_create_alert_preferences'], ['040_enable_pgcrypto', '053_enable_pgcrypto'],
            ['047_enforce_symptom_40_char_limit', '054_enforce_symptom_40_char_limit'],
            ['046_create_cath_lab_procedures', '051_create_cath_lab_procedures_table'],
        ];
        for (const [oldName, newName] of renames) {
            await healClient.query(
                `UPDATE pgmigrations SET name = '${newName}' WHERE name = '${oldName}'`
            );
        }
    } catch {
        // pgmigrations may not exist yet on a fresh install — safe to ignore
    } finally {
        await healClient.end().catch(() => { });
    }
};

module.exports = { healDatabaseMigrations };
