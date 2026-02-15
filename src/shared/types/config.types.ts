/**
 * Configuration type definitions for EWTCS
 * Provides type safety and IDE autocomplete for environment variables
 */

/**
 * External environment variables from .env files
 * These are validated by Zod schema in lib/config/env.ts
 */
export interface EnvironmentVariables {
  DATABASE_URL?: string;
  DATABASE_URL_ENCRYPTED?: string;
  ENCRYPTION_KEY?: string;
  NEXT_PUBLIC_APP_URL: string;
  NODE_ENV: 'development' | 'staging' | 'production';
  RED_ALERT_THRESHOLD_MS?: number;
  OPENAI_API_KEY?: string;
  OPENAI_API_KEY_ENCRYPTED?: string;
}

/**
 * Application configuration derived from environment variables
 * Safe to use throughout the application after validation
 */
export interface AppConfig {
  database: {
    url: string;
    ssl: boolean;
    encrypted: boolean;
  };
  app: {
    url: string;
    environment: 'development' | 'staging' | 'production';
    isDevelopment: boolean;
    isStaging: boolean;
    isProduction: boolean;
  };
  alert: {
    delayThresholdMs: number;
  };
  ai?: {
    apiKey: string;
    encrypted: boolean;
  };
}

/**
 * Health check response structure
 */
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    config: boolean;
    database: boolean;
    environment: boolean;
  };
  errors?: string[];
}
