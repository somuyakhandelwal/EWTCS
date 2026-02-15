/**
 * Environment helpers: load env files and resolve DATABASE_URL (supports encrypted value)
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createDecipheriv, scryptSync } = require('crypto');

const SALT = 'EWTCS_SALT_2026';
const DEFAULT_ENV = 'development';

const loadEnvironment = () => {
  const nodeEnv = process.env.NODE_ENV || DEFAULT_ENV;

  const basePath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(basePath)) {
    dotenv.config({ path: basePath, override: false });
  }

  const envSpecific = path.resolve(process.cwd(), `.env.${nodeEnv}`);
  if (fs.existsSync(envSpecific)) {
    dotenv.config({ path: envSpecific, override: true });
  }

  const localPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(localPath)) {
    dotenv.config({ path: localPath, override: true });
  }
};

const deriveEncryptionKey = (seed) => scryptSync(seed, SALT, 32);

const decryptSecret = (encrypted, masterSecret) => {
  const [ivHex, encryptedHex] = encrypted.split(':');
  if (!ivHex || !encryptedHex) {
    throw new Error('Encrypted secret must be in ivhex:encryptedhex format');
  }

  const key = deriveEncryptionKey(masterSecret);
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = createDecipheriv('aes-256-cbc', key, iv);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

const resolveDatabaseUrl = () => {
  const encrypted = process.env.DATABASE_URL_ENCRYPTED;
  const plaintext = process.env.DATABASE_URL;
  const encryptionKey = process.env.ENCRYPTION_KEY;
  const nodeEnv = process.env.NODE_ENV || DEFAULT_ENV;

  if (encrypted) {
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY is required to decrypt DATABASE_URL_ENCRYPTED');
    }
    return decryptSecret(encrypted, encryptionKey);
  }

  if (nodeEnv === 'production' && !encrypted) {
    throw new Error('DATABASE_URL_ENCRYPTED is required in production');
  }

  if (!plaintext) {
    throw new Error('DATABASE_URL is required when no encrypted value is provided');
  }

  return plaintext;
};

module.exports = { loadEnvironment, resolveDatabaseUrl, deriveEncryptionKey, decryptSecret };
