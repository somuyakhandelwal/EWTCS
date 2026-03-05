/**
 * Password Hashing Utility
 * Wrapper around bcrypt for secure password storage
 * 
 * Features:
 * • Automatic salt generation
 * • Configurable cost factor (12 rounds)
 * • Constant-time comparison (prevents timing attacks)
 * • Error handling & logging
 */

import bcrypt from 'bcryptjs';
import { ENCRYPTION_CONFIG } from './encryption-config';

/**
 * Hash a plain-text password for storage
 * @param plainPassword - Raw password from user
 * @returns Hashed password (ready for database storage)
 * @throws Error if hashing fails
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  try {
    if (!plainPassword || typeof plainPassword !== 'string') {
      throw new Error('Invalid password: must be non-empty string');
    }

    if (plainPassword.length < 8) {
      throw new Error('Password too short: minimum 8 characters');
    }

    if (plainPassword.length > 128) {
      throw new Error('Password too long: maximum 128 characters');
    }

    // Salt rounds = 12 (default from ENCRYPTION_CONFIG)
    const salt = await bcrypt.genSalt(ENCRYPTION_CONFIG.saltRounds);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    return hashedPassword;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Password hashing failed: ${errorMessage}`);
  }
}

/**
 * Verify a plain-text password against stored hash
 * @param plainPassword - Password from login form
 * @param storedHash - Hashed password from database
 * @returns true if password matches, false otherwise
 * @throws Error if comparison fails
 */
export async function verifyPassword(
  plainPassword: string,
  storedHash: string
): Promise<boolean> {
  try {
    if (!plainPassword || !storedHash) {
      return false;
    }

    if (typeof plainPassword !== 'string' || typeof storedHash !== 'string') {
      return false;
    }

    // Constant-time comparison (prevents timing attacks)
    const isValid = await bcrypt.compare(plainPassword, storedHash);
    return isValid;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Password verification failed: ${errorMessage}`);
  }
}

/**
 * Check if a hash appears to be valid bcrypt hash
 * @param hash - String to validate
 * @returns true if hash looks like bcrypt format
 */
export function isValidBcryptHash(hash: string): boolean {
  if (!hash || typeof hash !== 'string') {
    return false;
  }

  // bcrypt hashes start with $2a$, $2b$, or $2y$ and are ~60 chars
  const bcryptPattern = /^\$2[aby]\$\d{2}\$.{53}$/;
  return bcryptPattern.test(hash);
}

/**
 * Hash generation time (for monitoring)
 * Used for performance testing & load testing
 */
let lastHashDuration = 0;

/**
 * Get last hashing duration in milliseconds
 * @returns Duration in ms
 */
export function getLastHashDuration(): number {
  return lastHashDuration;
}

/**
 * Hash password with timing information
 * (For development/monitoring only)
 */
export async function hashPasswordWithTiming(
  plainPassword: string
): Promise<{ hash: string; duration: number }> {
  const startTime = Date.now();
  const hash = await hashPassword(plainPassword);
  lastHashDuration = Date.now() - startTime;

  return {
    hash,
    duration: lastHashDuration,
  };
}
