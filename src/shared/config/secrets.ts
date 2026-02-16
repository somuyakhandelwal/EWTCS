/**
 * Secrets management for encryption/decryption
 * For production, use AWS Secrets Manager, HashiCorp Vault, or similar
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { logger } from './logger';

const deriveEncryptionKey = (seed: string): Buffer => {
  const key = scryptSync(seed, 'EWTCS_SALT_2026', 32);
  return key;
};

/**
 * Encrypt sensitive string
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

    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    logger.error('Failed to encrypt secret', error as Error);
    throw new Error('Encryption failed');
  }
};

/**
 * Decrypt sensitive string
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
 */
export const maskSensitive = (value: string): string => {
  if (value.length <= 8) {
    return '*'.repeat(value.length);
  }
  return value.substring(0, 3) + '*'.repeat(value.length - 6) + value.substring(value.length - 3);
};

/**
 * Validate PostgreSQL URL format
 */
export const validatePostgresUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'postgresql:' || urlObj.protocol === 'postgres:';
  } catch {
    return false;
  }
};
