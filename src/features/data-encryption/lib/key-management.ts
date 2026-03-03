/**
 * Key Rotation & Management Utilities
 * Handles encryption key generation and validation
 * 
 * SECURITY: This file contains sensitive key operations
 */

import crypto from 'crypto';

interface KeyRotationEntry {
  keyId: string;
  key: string;
  algorithm: string;
  createdAt: Date;
  isActive: boolean;
  dataEncrypted: number; // Count of records encrypted with this key
}

/**
 * Generate a new 256-bit encryption key (hex format)
 * @returns 64-character hex string
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate key ID for tracking rotated keys
 * Format: ek_<timestamp>_<random>
 */
export function generateKeyId(): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return `ek_${timestamp}_${random}`;
}

/**
 * Validate encryption key format
 * @param key - Encryption key to validate
 * @returns true if valid 64-char hex string
 */
export function validateKeyFormat(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  if (key.length !== 64) return false;
  return /^[a-f0-9]{64}$/i.test(key);
}

/**
 * Derive a sub-key for specific purpose (extra security layer)
 * @param masterKey - Main encryption key
 * @param purpose - Purpose identifier (e.g., 'patient-data', 'audit-logs')
 * @returns Derived key as hex string
 */
export function deriveSubKey(masterKey: string, purpose: string): string {
  // Use HMAC to derive a sub-key
  // Never expose the master key
  const hmac = crypto.createHmac('sha256', masterKey);
  hmac.update(purpose);
  return hmac.digest('hex');
}

/**
 * Template for key rotation entry (store in secure location)
 * This is NOT a real implementation - just documentation
 */
export const KEY_ROTATION_TEMPLATE: KeyRotationEntry = {
  keyId: 'ek_template_000000',
  key: 'encrypted_key_material_here',
  algorithm: 'aes-256-gcm',
  createdAt: new Date(),
  isActive: false,
  dataEncrypted: 0,
};

/**
 * Key rotation checklist (for runbook)
 */
export const KEY_ROTATION_CHECKLIST = {
  'Step 1': 'Generate new key using generateEncryptionKey()',
  'Step 2': 'Store new key in ENCRYPTION_KEY_NEW env variable',
  'Step 3': 'Deploy with both ENCRYPTION_KEY and ENCRYPTION_KEY_NEW',
  'Step 4': 'Run re-encryption job: npm run rotate:encryption-keys',
  'Step 5': 'Verify all data encrypted with new key',
  'Step 6': 'Deactivate old key (set ENCRYPTION_KEY_OLD)',
  'Step 7': 'Monitor for decryption errors (should be zero)',
  'Step 8': 'Remove old key after 30-day grace period',
} as const;

/**
 * Security best practices
 */
export const KEY_SECURITY_BEST_PRACTICES = {
  'Store Keys': 'Use AWS Secrets Manager, Google Cloud Secret Manager, or HashiCorp Vault',
  'Rotation': 'Rotate keys annually or after security incident',
  'Backups': 'Store backups in separate secure location',
  'Access Control': 'Restrict key access to production systems only',
  'Logging': 'Log key access events; never log key material',
  'Deployment': 'Use restricted CI/CD environment variables',
  'Testing': 'Never use production key in test/dev environments',
} as const;
