/**
 * Field Encryption Utility (AES-256-GCM)
 * 
 * Encrypts/decrypts sensitive data fields at rest
 * Features:
 * • AES-256-GCM authenticated encryption
 * • Integrity protection (authTag)
 * • Random IV per encryption
 * • Base64 encoding for database storage
 * • Error handling & validation
 */

import crypto from 'crypto';
import { ENCRYPTION_KEY, ENCRYPTION_CONFIG } from './encryption-config';
import type { EncryptedFieldValue } from '../types/encryption';

/**
 * Encrypt a sensitive field using AES-256-GCM
 * @param plaintext - Raw data to encrypt
 * @param masterKey - Encryption master key (optional, uses env if not provided)
 * @returns Encrypted field object (data, tag, iv)
 * @throws Error if encryption fails
 */
export function encryptField(
  plaintext: string,
  masterKey: string = ENCRYPTION_KEY
): EncryptedFieldValue {
  try {
    if (!plaintext || typeof plaintext !== 'string') {
      throw new Error('Plaintext must be non-empty string');
    }

    if (!masterKey || typeof masterKey !== 'string') {
      throw new Error('Master key is missing or invalid');
    }

    // Validate key format
    if (masterKey.length !== 64 || !/^[a-f0-9]{64}$/i.test(masterKey)) {
      throw new Error('Master key must be 64-char hex string (256-bit)');
    }

    // Convert hex key to buffer
    const keyBuffer = Buffer.from(masterKey, 'hex');

    // Generate random IV for this encryption
    const iv = crypto.randomBytes(ENCRYPTION_CONFIG.ivLength);

    // Create cipher
    const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.algorithm, keyBuffer, iv);

    // Encrypt data
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag
    const authTag = cipher.getAuthTag();

    return {
      data: encrypted,
      tag: authTag.toString('base64'),
      iv: iv.toString('base64'),
      kv: 1, // Key version
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Field encryption failed: ${errorMessage}`);
  }
}

/**
 * Decrypt a sensitive field using AES-256-GCM
 * @param encryptedField - Encrypted field object
 * @param masterKey - Encryption master key (optional, uses env if not provided)
 * @returns Decrypted plaintext
 * @throws Error if decryption fails (tampering detected, wrong key, etc.)
 */
export function decryptField(
  encryptedField: EncryptedFieldValue,
  masterKey: string = ENCRYPTION_KEY
): string {
  try {
    if (!encryptedField || !encryptedField.data) {
      throw new Error('Encrypted field data is missing');
    }

    if (!masterKey || typeof masterKey !== 'string') {
      throw new Error('Master key is missing or invalid');
    }

    // Validate key format
    if (masterKey.length !== 64 || !/^[a-f0-9]{64}$/i.test(masterKey)) {
      throw new Error('Master key must be 64-char hex string');
    }

    // Convert hex key to buffer
    const keyBuffer = Buffer.from(masterKey, 'hex');

    // Convert base64 back to buffers
    const iv = Buffer.from(encryptedField.iv, 'base64');
    const authTag = Buffer.from(encryptedField.tag, 'base64');

    // Validate IV length
    if (iv.length !== ENCRYPTION_CONFIG.ivLength) {
      throw new Error('Invalid IV length (tampering detected)');
    }

    // Validate auth tag length
    if (authTag.length !== ENCRYPTION_CONFIG.authTagLength) {
      throw new Error('Invalid auth tag length (tampering detected)');
    }

    // Create decipher
    const decipher = crypto.createDecipheriv(ENCRYPTION_CONFIG.algorithm, keyBuffer, iv);

    // Set authentication tag (must be set before final() call)
    decipher.setAuthTag(authTag);

    // Decrypt data
    let decrypted = decipher.update(encryptedField.data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Field decryption failed: ${errorMessage}`);
  }
}

/**
 * Encrypt multiple fields in a batch
 * @param fields - Object with plaintext values
 * @param keys - Optional list of field names to encrypt (if not provided, encrypts all)
 * @returns Object with encrypted values
 */
export function encryptFieldsBatch(
  fields: Record<string, string>,
  keys?: string[]
): Record<string, EncryptedFieldValue | string> {
  const result: Record<string, EncryptedFieldValue | string> = {};

  const fieldsToEncrypt = keys || Object.keys(fields);

  for (const key of fieldsToEncrypt) {
    if (key in fields) {
      try {
        result[key] = encryptField(fields[key]);
      } catch (error) {
        // If encryption fails for one field, include error info
        result[key] = fields[key];
      }
    }
  }

  return result;
}

/**
 * Decrypt multiple fields in a batch
 * @param fields - Object with encrypted values
 * @param keys - Optional list of field names to decrypt (if not provided, decrypts all)
 * @returns Object with decrypted values
 */
export function decryptFieldsBatch(
  fields: Record<string, EncryptedFieldValue | string>,
  keys?: string[]
): Record<string, string> {
  const result: Record<string, string> = {};

  const fieldsToDecrypt = keys || Object.keys(fields);

  for (const key of fieldsToDecrypt) {
    if (key in fields) {
      const value = fields[key];
      if (typeof value === 'object' && value !== null && 'data' in value) {
        try {
          result[key] = decryptField(value as EncryptedFieldValue);
        } catch (error) {
          result[key] = ''; // Return empty on decryption failure
        }
      } else {
        result[key] = String(value);
      }
    }
  }

  return result;
}

/**
 * Check if a value appears to be encrypted
 * @param value - Value to check
 * @returns true if value looks like encrypted field
 */
export function isEncryptedField(
  value: unknown
): value is EncryptedFieldValue {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const field = value as Record<string, unknown>;
  return (
    typeof field.data === 'string' &&
    typeof field.tag === 'string' &&
    typeof field.iv === 'string' &&
    typeof field.kv === 'number'
  );
}
