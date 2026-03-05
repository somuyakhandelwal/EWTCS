/**
 * Unit Tests for Encryption Functions
 * Tests for password hashing, field encryption, and configuration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  isValidBcryptHash,
} from '@/features/data-encryption/lib/password-hasher';
import {
  encryptField,
  decryptField,
  isEncryptedField,
  encryptFieldsBatch,
  decryptFieldsBatch,
} from '@/features/data-encryption/lib/field-encryptor';
import {
  isValidEncryptionKey,
  validateEncryptionKey,
  ENCRYPTION_CONFIG,
} from '@/features/data-encryption/lib/encryption-config';
import {
  generateEncryptionKey,
  validateKeyFormat,
} from '@/features/data-encryption/lib/key-management';

describe('Password Hasher', () => {
  it('should hash password successfully', async () => {
    const plainPassword = 'SecurePassword123!';
    const hash = await hashPassword(plainPassword);

    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(20);
    expect(isValidBcryptHash(hash)).toBe(true);
  });

  it('should verify correct password', async () => {
    const plainPassword = 'TestPassword123!';
    const hash = await hashPassword(plainPassword);
    const isValid = await verifyPassword(plainPassword, hash);

    expect(isValid).toBe(true);
  });

  it('should reject wrong password', async () => {
    const plainPassword = 'TestPassword123!';
    const hash = await hashPassword(plainPassword);
    const isValid = await verifyPassword('WrongPassword456!', hash);

    expect(isValid).toBe(false);
  });

  it('should reject short passwords', async () => {
    await expect(hashPassword('short')).rejects.toThrow('too short');
  });

  it('should detect valid bcrypt hash format', async () => {
    // Generate a real hash to test against
    const plainPassword = 'TestPassword123!';
    const hash = await hashPassword(plainPassword);

    expect(isValidBcryptHash(hash)).toBe(true);
    expect(isValidBcryptHash('not-a-hash')).toBe(false);
    expect(isValidBcryptHash('')).toBe(false);
    expect(isValidBcryptHash(null as any)).toBe(false);
  });
});

describe('Field Encryptor', () => {
  const testPlaintext = 'This is sensitive data for testing';
  const testKey = 'a1b2c3d4e5f6f7f8f9f0f1f2f3f4f5f6'.slice(0, 32) + '0'.repeat(32); // Valid 64-char hex

  it('should encrypt and decrypt field', () => {
    const encrypted = encryptField(testPlaintext, testKey);
    const decrypted = decryptField(encrypted, testKey);

    expect(decrypted).toBe(testPlaintext);
  });

  it('should produce different IV for each encryption', () => {
    const encrypted1 = encryptField(testPlaintext, testKey);
    const encrypted2 = encryptField(testPlaintext, testKey);

    expect(encrypted1.iv).not.toBe(encrypted2.iv);
  });

  it('should detect tampered encrypted field', () => {
    const encrypted = encryptField(testPlaintext, testKey);
    encrypted.data = encrypted.data.slice(0, -4) + 'xxxx'; // Tamper with data

    expect(() => decryptField(encrypted, testKey)).toThrow();
  });

  it('should validate encrypted field structure', () => {
    const encrypted = encryptField(testPlaintext, testKey);

    expect(isEncryptedField(encrypted)).toBe(true);
    expect(isEncryptedField({ data: 'test' })).toBe(false);
    expect(isEncryptedField(null)).toBe(false);
    expect(isEncryptedField('')).toBe(false);
  });

  it('should batch encrypt and decrypt', () => {
    const fields = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1-555-1234',
    };

    const encrypted = encryptFieldsBatch(fields);
    const decrypted = decryptFieldsBatch(encrypted);

    expect(decrypted.name).toBe(fields.name);
    expect(decrypted.email).toBe(fields.email);
    expect(decrypted.phone).toBe(fields.phone);
  });
});

describe('Encryption Configuration', () => {
  it('should validate correct encryption key format', () => {
    const validKey = 'a'.repeat(64);
    expect(isValidEncryptionKey(validKey)).toBe(true);
  });

  it('should reject invalid encryption key formats', () => {
    expect(isValidEncryptionKey('too-short')).toBe(false);
    expect(isValidEncryptionKey('x'.repeat(63))).toBe(false); // 63 chars
    expect(isValidEncryptionKey('x'.repeat(65))).toBe(false); // 65 chars
    expect(isValidEncryptionKey('z'.repeat(64))).toBe(false); // Not hex
    expect(isValidEncryptionKey('')).toBe(false);
    expect(isValidEncryptionKey(null as any)).toBe(false);
  });

  it('should have correct encryption config', () => {
    expect(ENCRYPTION_CONFIG.algorithm).toBe('aes-256-gcm');
    expect(ENCRYPTION_CONFIG.keyLength).toBe(32);
    expect(ENCRYPTION_CONFIG.ivLength).toBe(16);
    expect(ENCRYPTION_CONFIG.authTagLength).toBe(16);
    expect(ENCRYPTION_CONFIG.saltRounds).toBe(12);
  });
});

describe('Key Management', () => {
  it('should generate valid encryption key', () => {
    const key = generateEncryptionKey();

    expect(key.length).toBe(64);
    expect(validateKeyFormat(key)).toBe(true);
  });

  it('should generate different keys each time', () => {
    const key1 = generateEncryptionKey();
    const key2 = generateEncryptionKey();

    expect(key1).not.toBe(key2);
  });
});
