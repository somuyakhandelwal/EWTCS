'use strict';

/**
 * Database validation helper functions
 * Shared utilities for database schema validation
 */

// Expected core tables based on migrations
const EXPECTED_TABLES = [
  'alert_preferences',
  'archival_runs',
  'audit_logs',
  'audit_logs_archive',
  'bed_stage_logs',
  'bed_stage_logs_archive',
  'beds',
  'cath_lab_procedures',
  'daily_summaries',
  'delay_reason_options',
  'diagnosis',
  'disposition_delay_reasons',
  'er_intake',
  'error_events',
  'kiosk_sessions',
  'ot_procedures',
  'ot_rooms',
  'patient_admissions',
  'patient_admissions_archive',
  'pgmigrations',
  'shifts',
  'stage_delay_thresholds',
  'stage_transitions',
  'stages',
  'system_settings',
  'token_blacklist',
  'user_feedback',
  'users',
  'wards',
  // Canonical table from migration 007
  'bed_stage_log_corrections',
  // Canonical table from migration 030
  'report_signoffs'
];

/**
 * Validate that a table has all required columns
 */
async function validateTableColumns(client, tableName, requiredColumns) {
  const result = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
    ORDER BY ordinal_position
  `, [tableName]);

  const columnNames = result.rows.map((row) => row.column_name);
  const missingColumns = requiredColumns.filter((col) => !columnNames.includes(col));

  if (missingColumns.length > 0) {
    console.error(`❌ ${tableName} table missing required columns:`);
    missingColumns.forEach((col) => console.error(`  ✗ ${col}`));
    return false;
  }

  console.log(`✅ ${tableName.charAt(0).toUpperCase() + tableName.slice(1)} table structure valid`);
  return true;
}

/**
 * Get all tables in public schema
 */
async function getAllTables(client) {
  const result = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `);
  return result.rows.map((row) => row.table_name);
}

/**
 * Get foreign key constraints
 */
async function getForeignKeyConstraints(client) {
  const result = await client.query(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name
  `);
  return result.rows;
}

/**
 * Get indexes
 */
async function getIndexes(client) {
  const result = await client.query(`
    SELECT
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
  `);
  return result.rows;
}

module.exports = {
  EXPECTED_TABLES,
  validateTableColumns,
  getAllTables,
  getForeignKeyConstraints,
  getIndexes
};
