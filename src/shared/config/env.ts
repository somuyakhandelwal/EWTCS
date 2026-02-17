import { z } from 'zod';
import { logger } from './logger';
import { decryptSecret, maskSensitive, validatePostgresUrl } from './secrets';
import type { AppConfig } from '@/shared/types/config.types';

/**
 * Validates environment variables on startup
 * Supports development, staging, and production environments
 */
const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  DATABASE_URL_ENCRYPTED: z.string().optional(),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  ENCRYPTION_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string()
    .url('NEXT_PUBLIC_APP_URL must be a valid URL')
    .default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  RED_ALERT_THRESHOLD_MS: z.coerce.number().int().positive().default(10800000),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_API_KEY_ENCRYPTED: z.string().optional(),
}).superRefine((value, ctx) => {
  if (!value.DATABASE_URL && !value.DATABASE_URL_ENCRYPTED) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'DATABASE_URL or DATABASE_URL_ENCRYPTED is required',
      path: ['DATABASE_URL'],
    });
  }

  if (value.DATABASE_URL_ENCRYPTED && !value.ENCRYPTION_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'ENCRYPTION_KEY is required when DATABASE_URL_ENCRYPTED is provided',
      path: ['ENCRYPTION_KEY'],
    });
  }

  if (value.OPENAI_API_KEY_ENCRYPTED && !value.ENCRYPTION_KEY) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'ENCRYPTION_KEY is required when OPENAI_API_KEY_ENCRYPTED is provided',
      path: ['ENCRYPTION_KEY'],
    });
  }

  if (value.NODE_ENV === 'production' && !value.DATABASE_URL_ENCRYPTED) {
    const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';
    if (!isBuildTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'DATABASE_URL_ENCRYPTED is required in production for security',
        path: ['DATABASE_URL_ENCRYPTED'],
      });
    }
  }
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errorDetails = parsed.error.flatten();
  logger.critical('Environment validation failed during startup', undefined, {
    fieldErrors: errorDetails.fieldErrors,
    formErrors: errorDetails.formErrors,
  });
  throw new Error('System Foundation Setup Failed');
}

const envVars = parsed.data;

const resolveSecret = (
  label: string,
  plaintext: string | undefined,
  encrypted: string | undefined,
  encryptionKey: string | undefined,
  requireEncrypted: boolean
): { value: string; encrypted: boolean } => {
  if (encrypted) {
    if (!encryptionKey) {
      throw new Error(`ENCRYPTION_KEY is required to decrypt ${label}`);
    }
    try {
      return { value: decryptSecret(encrypted, encryptionKey), encrypted: true };
    } catch (error) {
      // During build time, return plaintext or provide a fallback
      const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';
      if (isBuildTime && plaintext) {
        logger.warn(`Decryption failed for ${label} during build, using plaintext fallback`);
        return { value: plaintext, encrypted: false };
      }
      // For DATABASE_URL during build, use a dummy PostgreSQL URL
      if (isBuildTime && label === 'DATABASE_URL') {
        logger.warn('Using dummy database URL during build');
        return { value: 'postgresql://dummy:dummy@localhost/dummy', encrypted: false };
      }
      throw error;
    }
  }

  // During build time, allow plaintext even in production
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';
  if (requireEncrypted && !isBuildTime) {
    throw new Error(`${label} must be encrypted in production`);
  }

  if (!plaintext) {
    throw new Error(`${label} is missing`);
  }

  return { value: plaintext, encrypted: false };
};

const databaseSecret = resolveSecret(
  'DATABASE_URL',
  envVars.DATABASE_URL,
  envVars.DATABASE_URL_ENCRYPTED,
  envVars.ENCRYPTION_KEY,
  envVars.NODE_ENV === 'production'
);

if (!validatePostgresUrl(databaseSecret.value)) {
  logger.critical('DATABASE_URL must be a valid PostgreSQL connection string', undefined, {
    databaseUrl: maskSensitive(databaseSecret.value),
  });
  throw new Error('System Foundation Setup Failed');
}

const aiSecret = envVars.OPENAI_API_KEY_ENCRYPTED || envVars.OPENAI_API_KEY
  ? resolveSecret(
      'OPENAI_API_KEY',
      envVars.OPENAI_API_KEY,
      envVars.OPENAI_API_KEY_ENCRYPTED,
      envVars.ENCRYPTION_KEY,
      false
    )
  : null;

const createAppConfig = (env: z.infer<typeof envSchema>): AppConfig => {
  const isDevelopment = env.NODE_ENV === 'development';
  const isStaging = env.NODE_ENV === 'staging';
  const isProduction = env.NODE_ENV === 'production';

  return {
    database: {
      url: databaseSecret.value,
      ssl: isProduction,
      encrypted: databaseSecret.encrypted,
    },
    app: {
      url: env.NEXT_PUBLIC_APP_URL,
      environment: env.NODE_ENV,
      isDevelopment,
      isStaging,
      isProduction,
    },
    alert: {
      delayThresholdMs: env.RED_ALERT_THRESHOLD_MS,
    },
    ...(aiSecret && {
      ai: {
        apiKey: aiSecret.value,
        encrypted: aiSecret.encrypted,
      },
    }),
  };
};

export const env = envVars;
export const config = Object.freeze(createAppConfig(envVars));

export const logConfigurationStatus = (): void => {
  logger.info('Environment configuration loaded successfully', {
    environment: env.NODE_ENV,
    appUrl: config.app.url,
    databaseUrl: maskSensitive(config.database.url),
    sslEnabled: config.database.ssl,
    databaseEncrypted: config.database.encrypted,
    aiKeyConfigured: Boolean(config.ai?.apiKey),
    aiKeyEncrypted: Boolean(config.ai?.encrypted),
    alertThreshold: `${env.RED_ALERT_THRESHOLD_MS}ms (${(env.RED_ALERT_THRESHOLD_MS / 3600000).toFixed(1)} hours)`,
  });
};