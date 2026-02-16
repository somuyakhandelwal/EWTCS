/**
 * Secrets management module for EWTCS
 * Handles encryption of sensitive data like database credentials
 * For production, consider using AWS Secrets Manager, HashiCorp Vault, or similar
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { logger } from './logger';

/**
 * Encryption key generation from a master secret (in production, use proper secret management)
 * For MVP: key is derived from DATABASE_URL itself to avoid hardcoding
 */
const deriveEncryptionKey = (seed: string): Buffer => {
  const key = scryptSync(seed, 'EWTCS_SALT_2026', 32);
  return key;
};

/**
 * Encrypt sensitive string (for future use)
 * Currently disabled for MVP to avoid complexity
 * Enable when integrating with proper secret management
 */
export const encryptSecret = (
  plaintext: string,
  masterSecret: string
): string => {
  try {
    const key = deriveEncryptionKey(masterSecret);
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return IV + encrypted as single string
    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    logger.error('Failed to encrypt secret', error as Error);
    throw new Error('Encryption failed');
  }
};

/**
 * Decrypt sensitive string (for future use)
 */
export const decryptSecret = (
  encrypted: string,
  masterSecret: string
): string => {
  try {
    const [ivHex, encryptedHex] = encrypted.split(':');
    const key = deriveEncryptionKey(masterSecret);
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Failed to decrypt secret', error as Error);
    throw new Error('Decryption failed');
  }
};

/**
 * Mask sensitive values for logging
 * Replace password/key portions with asterisks
 */
export const maskSensitive = (value: string): string => {
  if (value.length <= 8) {
    return '*'.repeat(value.length);
  }
  return value.substring(0, 3) + '*'.repeat(value.length - 6) + value.substring(value.length - 3);
};

/**
 * Validate DATABASE_URL format (PostgreSQL)
 * Checks for postgresql:// protocol and basic structure
 */
export const validatePostgresUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'postgresql:' || urlObj.protocol === 'postgres:';
  } catch {
    return false;
  }
};
