// Database validation helpers
// Purpose: Validate table and column names to prevent SQL injection

/**
 * Whitelist of allowed table names to prevent SQL injection
 */
export const ALLOWED_TABLES = new Set([
  'users',
  'beds',
  'stages',
  'wards',                        // migration 006 — was incorrectly 'ward'
  'audit_logs',
  'bed_stage_logs',
  'bed_stage_logs_archive',
  'token_blacklist',
  'bed_stage_log_corrections',
  'stage_transitions',
  'user_management_logs',         // migration 003
  'disposition_delay_reasons',    // migration 011/012
  'patient_admissions',           // migration 013
  'kiosk_sessions',               // migration 014
])

/**
 * Whitelist of allowed column names to prevent SQL injection
 */
export const ALLOWED_COLUMNS = new Set([
  'id',
  'user_id',
  'bed_id',
  'stage_id',
  'ward_id',
  'created_at',
  'updated_at',
  'is_active',
  'username',
  'email',
  'bed_number',
  'name',
  'status',
  'order_index',
  'elapsed_time_ms',
  'occupied_since',
  'jwt_token_hash',
  'created_by',
  'reason',
  'old_values',
  'new_values',
  'display_order',
  'color_code',
  'description',
])

/**
 * Validate table name against whitelist
 * @throws Error if table name is not in whitelist
 */
export function validateTableName(table: string): void {
  if (!ALLOWED_TABLES.has(table)) {
    throw new Error(
      `Invalid table name: "${table}". Allowed tables: ${Array.from(ALLOWED_TABLES).join(', ')}`
    )
  }
}

/**
 * Validate column name against whitelist
 * @throws Error if column name is not in whitelist
 */
export function validateColumnName(column: string): void {
  if (!ALLOWED_COLUMNS.has(column)) {
    throw new Error(
      `Invalid column name: "${column}". Allowed columns: ${Array.from(ALLOWED_COLUMNS).join(', ')}`
    )
  }
}

/**
 * Validate ORDER BY clause to prevent SQL injection
 * Only allows simple "column ASC/DESC" patterns
 * @throws Error if ORDER BY clause is invalid
 */
export function validateOrderBy(orderBy: string): void {
  if (orderBy && !orderBy.match(/^[a-zA-Z_][a-zA-Z0-9_]*\s+(ASC|DESC)?$/i)) {
    throw new Error(`Invalid ORDER BY clause: "${orderBy}"`)
  }
}
