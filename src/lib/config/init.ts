/**
 * System initialization and health check module
 * Runs on application startup to verify all configurations are correct
 * Implements EPIC 0: System Foundation & Setup requirements
 */

import { testConnection } from '@/lib/db/client';
import { logger } from './logger';
import { config, logConfigurationStatus } from './env';
import type { HealthCheckResult } from '@/types/config';

let initializePromise: Promise<void> | null = null;

/**
 * Performs comprehensive health check during startup
 */
export const performHealthCheck = async (): Promise<HealthCheckResult> => {
  const errors: string[] = [];

  try {
    // Check 1: Configuration validation
    let configValid = true;
    if (!config) {
      configValid = false;
      errors.push('Configuration object is undefined');
    }
    if (!config.database.url) {
      configValid = false;
      errors.push('DATABASE_URL is not configured');
    }
    if (!config.app.url) {
      configValid = false;
      errors.push('NEXT_PUBLIC_APP_URL is not configured');
    }

    // Check 2: Environment validation
    let environmentValid = true;
    const validEnvs = ['development', 'staging', 'production'];
    if (!validEnvs.includes(config.app.environment)) {
      environmentValid = false;
      errors.push('Invalid NODE_ENV');
    }

    // Check 3: Database connectivity
    const dbConnected = await testConnection();
    if (!dbConnected) {
      errors.push('Database connection test failed');
    }

    // Determine overall health status
    const allHealthy = configValid && environmentValid && dbConnected;
    const status = allHealthy
      ? 'healthy'
      : errors.length <= 1
      ? 'degraded'
      : 'unhealthy';

    const result: HealthCheckResult = {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        config: configValid,
        environment: environmentValid,
        database: dbConnected,
      },
      ...(errors.length > 0 && { errors }),
    };

    return result;
  } catch (error) {
    logger.critical('Health check failed with exception', error as Error);
    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        config: false,
        environment: false,
        database: false,
      },
      errors: [(error as Error).message],
    };
  }
};

/**
 * Initialize the entire system on startup
 * Should be called once when the application starts
 */
export const initializeSystem = async (): Promise<void> => {
  if (initializePromise) {
    return initializePromise;
  }

  initializePromise = (async () => {
    logger.info('Starting system initialization...');

    // Log configuration status
    logConfigurationStatus();

    // Perform health check
    const health = await performHealthCheck();

    if (health.status === 'unhealthy') {
      logger.critical('System health check failed', undefined, {
        checks: health.checks,
        errors: health.errors,
      });
      throw new Error('System initialization failed: unhealthy status');
    }

    if (health.status === 'degraded') {
      logger.warn('System is running in degraded mode', {
        checks: health.checks,
        errors: health.errors,
      });
    }

    logger.info('System initialization completed successfully', {
      status: health.status,
      checks: health.checks,
    });
  })();

  return initializePromise;
};
