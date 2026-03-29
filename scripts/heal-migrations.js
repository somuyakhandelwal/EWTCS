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
            ['046_create_cath_lab_procedures', '056_create_cath_lab_procedures'],
            ['051_create_cath_lab_procedures_table', '057_create_cath_lab_procedures_table'],
            ['055_repair_cath_lab_procedures_columns', '058_repair_cath_lab_procedures_columns'],
        ];
        for (const [oldName, newName] of renames) {
            await healClient.query(
                `UPDATE pgmigrations SET name = '${newName}' WHERE name = '${oldName}'`
            ).catch(() => {});
        }

        // Heal user_role enum (ALTER TYPE ... ADD VALUE cannot be in a transaction)
        const roles = ['doctor', 'cardiologist', 'cath_lab_nurse'];
        for (const role of roles) {
            await healClient.query(
                `ALTER TYPE user_role ADD VALUE IF NOT EXISTS '${role}'`
            ).catch(() => {});
        }

        // Final verification for report_signoffs migration dependency bug
        // Migration 030 uses gen_random_uuid() which may fail if pgcrypto (040) isn't there yet.
        const signoffCheck = await healClient.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'report_signoffs'
            )
        `);
        if (!signoffCheck.rows[0].exists) {
            // Re-apply signoffs table if it failed during 030 but was marked applied
            await healClient.query(`
                CREATE TABLE IF NOT EXISTS report_signoffs (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    report_date DATE NOT NULL,
                    report_type VARCHAR(50) NOT NULL DEFAULT 'daily',
                    status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'superseded')),
                    signed_off_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                    signed_off_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    notes TEXT,
                    superseded_by UUID REFERENCES report_signoffs(id) ON DELETE RESTRICT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `).catch(() => {});
        }

        // Repair bed_stage_log_corrections if missing (Migration 007)
        const correctionCheck = await healClient.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'bed_stage_log_corrections'
            )
        `);
        if (!correctionCheck.rows[0].exists) {
            await healClient.query(`
                CREATE TABLE IF NOT EXISTS bed_stage_log_corrections (
                    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                    bed_stage_log_id UUID NOT NULL REFERENCES bed_stage_logs(id) ON DELETE CASCADE,
                    corrected_by_user_id UUID NOT NULL REFERENCES users(id),
                    correction_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    old_duration_ms BIGINT,
                    new_duration_ms BIGINT,
                    reason TEXT,
                    metadata JSONB DEFAULT '{}'::jsonb
                )
            `).catch(() => {});
        }
    } catch {
        // pgmigrations may not exist yet on a fresh install — safe to ignore
    } finally {
        await healClient.end().catch(() => { });
    }
};

module.exports = { healDatabaseMigrations };
