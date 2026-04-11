import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from '@/shared/config/env';
import { logger } from '@/shared/config/logger';

/**
 * Slow-query thresholds for EPIC 13 SLA monitoring.
 * Dashboard SLA: <2 s — any single query over 500 ms is a warning signal.
 * Reports SLA:   <3 s — any query over 2 s risks breaching the page budget.
 */
const SLOW_QUERY_WARN_MS = 500;
const SLOW_QUERY_ERROR_MS = 2000;
const DB_LOG_QUERIES = process.env.DB_LOG_QUERIES === 'true';

/**
 * Initializes the PostgreSQL connection pool.
 * Supports scalability for hospital-grade deployment.
 * Includes error handling and automatic reconnection.
 * 
 * Configuration tuned for hospital-grade reliability:
 * - max: 50 connections (supports 10+ concurrent users with 4+ queries each)
 * - min: 10 connections (keeps warm pool for faster responses)
 * - connectionTimeoutMillis: 5000 (5s timeout instead of 2s)
 * - idleTimeoutMillis: 30000 (30s before idle connection closes)
 */
const globalForPg = global as unknown as { pgPool: Pool | undefined };

export const poolInit = () => {
  if (globalForPg.pgPool) {
    return globalForPg.pgPool;
  }

  const newPool = new Pool({
    connectionString: config.database.url,
    // Ensure secure connections in production
    ssl: config.database.ssl ? { rejectUnauthorized: true } : false,
    // Connection pool settings for reliability
    max: 50,           // BUG FIX #5: Increased from 20 to handle concurrent load
    min: 10,           // BUG FIX #5: Maintain warm connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,  // BUG FIX #5: Increased from 2000 to 5000
    statement_timeout: 10000,        // BUG FIX #5: Kill queries taking >10s
  });

  /**
   * Handle pool errors
   */
  newPool.on('error', (err: Error) => {
    logger.error('Unexpected error on idle client in pool', err);
  });

  newPool.on('connect', () => {
    if (DB_LOG_QUERIES) logger.debug('New client connected to database pool');
  });

  // Cache the pool globally in all environments to prevent connection exhaustion
  // across serverless function invocations and hot-reloads.
  globalForPg.pgPool = newPool;

  return newPool;
};

const pool = poolInit();

/**
 * BUG FIX #5: Monitor pool health and warn if exhausted
 * Check pool stats periodically to catch capacity issues early
 */
let lastPoolWarning = 0;
const checkPoolHealth = () => {
  const now = Date.now();
  // Only warn once per minute
  if (now - lastPoolWarning < 60000) return;

  const idleCount = pool.idleCount;
  const totalCount = pool.totalCount;
  const waitingCount = pool.waitingCount || 0;

  // Warn if pool is >80% utilized
  if (idleCount < totalCount * 0.2) {
    logger.warn('Database pool nearing capacity', {
      idle: idleCount,
      total: totalCount,
      waiting: waitingCount,
      utilization: `${((totalCount - idleCount) / totalCount * 100).toFixed(1)}%`
    });
    lastPoolWarning = now;
  }
};

/**
 * Standardized query helper.
 * Every action must be logged in stage_logs for Epic 3 & 12.
 * Includes error handling and query logging.
 */
export const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  checkPoolHealth();

  try {
    const start = Date.now();
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;

    if (DB_LOG_QUERIES) {
      logger.debug(`Query executed in ${duration}ms`, {
        queryLength: text.length,
        duration,
        affectedRows: result.rowCount,
      });
    }

    // EPIC 13: Detect queries that risk breaching page-level SLAs.
    if (duration > SLOW_QUERY_ERROR_MS) {
      logger.error('Very slow query (>2 s) — SLA breach risk', undefined, {
        duration,
        truncatedQuery: text.substring(0, 200),
      });
    } else if (duration > SLOW_QUERY_WARN_MS) {
      logger.warn('Slow query (>500 ms) — monitor for SLA impact', {
        duration,
        truncatedQuery: text.substring(0, 200),
      });
    }

    return result;
  } catch (error) {
    logger.error('Database query failed', error as Error, {
      query: text.substring(0, 100),
    });
    throw error;
  }
};

/**
 * Get current pool statistics for monitoring
 * BUG FIX #5: Added for pool capacity monitoring
 */
export const getPoolStats = () => {
  return {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount || 0,
    max: pool.options.max,
    utilization: `${((pool.totalCount - pool.idleCount) / (pool.options.max || 50) * 100).toFixed(1)}%`,
    timestamp: new Date().toISOString(),
  };
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
