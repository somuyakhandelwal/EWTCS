'use strict';

const fs = require('fs');
const path = require('path');
const { createDecipheriv, scryptSync } = require('crypto');
const dotenv = require('dotenv');
const { Client } = require('pg');

const SALT = 'EWTCS_SALT_2026';
const DEFAULT_ENV = 'development';

const loadEnvFiles = () => {
  const nodeEnv = process.env.NODE_ENV || DEFAULT_ENV;
  const baseFiles = ['.env', `.env.${nodeEnv}`];

  baseFiles.forEach((file) => {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath, override: false });
    }
  });

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

const reset = async () => {
  loadEnvFiles();

  const nodeEnv = process.env.NODE_ENV || DEFAULT_ENV;
  if (nodeEnv === 'production') {
    console.error('[reset] Refusing to reset database in production.');
    process.exit(1);
  }

  const databaseUrl = resolveDatabaseUrl();
  const client = new Client({ connectionString: databaseUrl });

  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query('DROP SCHEMA IF EXISTS public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('COMMIT');
    console.log('[reset] Database schema reset successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[reset] Database reset failed:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
};

reset();
