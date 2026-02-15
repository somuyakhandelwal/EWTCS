import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from '@/shared/config/env';
import { logger } from '@/shared/config/logger';

/**
 * Initializes the PostgreSQL connection pool.
 * Supports scalability for hospital-grade deployment.
 * Includes error handling and automatic reconnection.
 */
const pool = new Pool({
  connectionString: config.database.url,
  // Ensure secure connections in production
  ssl: config.database.ssl ? { rejectUnauthorized: true } : false,
  // Connection pool settings for reliability
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Handle pool errors
 */
pool.on('error', (err: Error) => {
  logger.error('Unexpected error on idle client in pool', err);
});

pool.on('connect', () => {
  logger.debug('New client connected to database pool');
});

/**
 * Standardized query helper.
 * Every action must be logged in stage_logs for Epic 3 & 12.
 * Includes error handling and query logging.
 */
export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  try {
    const start = Date.now();
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    logger.debug(`Query executed in ${duration}ms`, {
      queryLength: text.length,
      duration,
      affectedRows: result.rowCount,
    });

    return result;
  } catch (error) {
    logger.error('Database query failed', error as Error, {
      query: text.substring(0, 100),
    });
    throw error;
  }
};

/**
 * Test database connectivity
 * Used for health checks during startup
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    await pool.query('SELECT NOW()');
    logger.info('Database connectivity test passed');
    return true;
  } catch (error) {
    logger.error('Database connectivity test failed', error as Error);
    return false;
  }
};

/**
 * Graceful pool shutdown
 */
export const closePool = async (): Promise<void> => {
  try {
    await pool.end();
    logger.info('Database pool closed gracefully');
  } catch (error) {
    logger.error('Error closing database pool', error as Error);
  }
};

export default pool;
