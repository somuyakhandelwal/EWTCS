import 'server-only'
import pool from '@/shared/lib/db'
import { logger } from '@/shared/config/logger'
import { validateTableName, validateColumnName, validateOrderBy } from './db-validators'

/**
 * Generic database query helpers for common CRUD patterns
 * Use these to reduce boilerplate in feature-specific queries
 */

/**
 * Get all records from a table with optional filtering
 * @param table - Table name
 * @param where - Optional WHERE clause (without 'WHERE' keyword)
 * @param params - Query parameters
 * @param orderBy - Optional ORDER BY clause (without 'ORDER BY' keyword)
 */
export async function getAll<T = unknown>(
  table: string,
  where?: string,
  params: unknown[] = [],
  orderBy = 'created_at DESC'
): Promise<T[]> {
  try {
    validateTableName(table)
    validateOrderBy(orderBy)

    let query = `SELECT * FROM ${table}`
    if (where) {
      query += ` WHERE ${where}`
    }
    query += ` ORDER BY ${orderBy}`

    const { rows } = await pool.query(query, params)
    return rows as T[]
  } catch (error) {
    logger.error(`Failed to get all from ${table}`, error as Error)
    throw error
  }
}

/**
 * Check if a record exists
 * @param table - Table name
 * @param where - WHERE clause (without 'WHERE' keyword)
 * @param params - Query parameters
 */
export async function exists(
  table: string,
  where: string,
  params: unknown[]
): Promise<boolean> {
  try {
    validateTableName(table)

    const { rows } = await pool.query(
      `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${where})`,
      params
    )
    return rows[0].exists
  } catch (error) {
    logger.error(`Failed to check existence in ${table}`, error as Error)
    throw error
  }
}

/**
 * Soft delete (set is_active = false)
 * @param table - Table name
 * @param id - Record ID
 * @param idColumn - ID column name (default: 'id')
 */
export async function softDelete(
  table: string,
  id: string,
  idColumn = 'id'
): Promise<void> {
  try {
    validateTableName(table)
    validateColumnName(idColumn)

    await pool.query(
      `UPDATE ${table} SET is_active = false, updated_at = NOW() WHERE ${idColumn} = $1`,
      [id]
    )
  } catch (error) {
    logger.error(`Failed to soft delete from ${table}`, error as Error)
    throw error
  }
}

/**
 * Reactivate (set is_active = true)
 * @param table - Table name
 * @param id - Record ID
 * @param idColumn - ID column name (default: 'id')
 */
export async function reactivate(
  table: string,
  id: string,
  idColumn = 'id'
): Promise<void> {
  try {
    validateTableName(table)
    validateColumnName(idColumn)

    await pool.query(
      `UPDATE ${table} SET is_active = true, updated_at = NOW() WHERE ${idColumn} = $1`,
      [id]
    )
  } catch (error) {
    logger.error(`Failed to reactivate in ${table}`, error as Error)
    throw error
  }
}
