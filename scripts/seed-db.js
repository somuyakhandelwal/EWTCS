'use strict';

const fs = require('fs');
const path = require('path');
const { createDecipheriv, scryptSync } = require('crypto');
const dotenv = require('dotenv');
const { Pool } = require('pg');

const SALT = 'EWTCS_SALT_2026';
const DEFAULT_ENV = 'development';

const loadEnvFiles = () => {
  const nodeEnv = process.env.NODE_ENV || DEFAULT_ENV;

  // Load base .env first (defaults only, do not override existing values)
  const basePath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(basePath)) {
    dotenv.config({ path: basePath, override: false });
  }

  // Then load environment-specific .env.<NODE_ENV>, allowing it to override base values
  const envSpecificPath = path.resolve(process.cwd(), `.env.${nodeEnv}`);
  if (fs.existsSync(envSpecificPath)) {
    dotenv.config({ path: envSpecificPath, override: true });
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

const seed = async () => {
  loadEnvFiles();

  const databaseUrl = resolveDatabaseUrl();
  const pool = new Pool({ connectionString: databaseUrl });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const users = [
      {
        email: 'nurse1@ewtcs.local',
        password_hash: 'dev-only',
        display_name: 'Nurse One',
        role: 'nurse',
      },
      {
        email: 'supervisor1@ewtcs.local',
        password_hash: 'dev-only',
        display_name: 'Supervisor One',
        role: 'supervisor',
      },
      {
        email: 'admin1@ewtcs.local',
        password_hash: 'dev-only',
        display_name: 'Admin One',
        role: 'admin',
      },
    ];

    for (const user of users) {
      await client.query(
        `
        INSERT INTO users (email, password_hash, display_name, role)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (email) DO UPDATE
        SET display_name = EXCLUDED.display_name,
            role = EXCLUDED.role
        `,
        [user.email, user.password_hash, user.display_name, user.role]
      );
    }

    const beds = Array.from({ length: 12 }, (_, index) => `EW-${String(index + 1).padStart(2, '0')}`);

    for (const bedCode of beds) {
      await client.query(
        `
        INSERT INTO beds (bed_code, current_stage, status_color, active, admitted_at, last_stage_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        ON CONFLICT (bed_code) DO NOTHING
        `,
        [bedCode, 'patient_admitted', 'yellow', true]
      );
    }

    await client.query(
      `
      INSERT INTO stage_logs (bed_id, stage, changed_at)
      SELECT b.id, b.current_stage, NOW()
      FROM beds b
      WHERE NOT EXISTS (
        SELECT 1 FROM stage_logs s WHERE s.bed_id = b.id
      )
      `
    );

    await client.query('COMMIT');
    console.log('[seed] Database seeded successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[seed] Database seed failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
