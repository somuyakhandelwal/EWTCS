'use strict';

const fs = require('fs');
const path = require('path');
const { createDecipheriv, scryptSync } = require('crypto');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

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

    const sharedPassword = 'Nurse@123';
    const users = [
      {
        username: 'nurse',
        password: sharedPassword,
        role: 'nurse',
      },
      {
        username: 'nurse1',
        password: sharedPassword,
        role: 'nurse',
      },
      {
        username: 'supervisor1',
        password: sharedPassword,
        role: 'supervisor',
      },
      {
        username: 'admin1',
        password: sharedPassword,
        role: 'admin',
      },
    ];

    for (const user of users) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await client.query(
        `
        INSERT INTO users (username, password_hash, role)
        VALUES ($1, $2, $3)
        ON CONFLICT (username) DO UPDATE
        SET password_hash = EXCLUDED.password_hash,
            role = EXCLUDED.role
        `,
        [user.username, passwordHash, user.role]
      );
    }

    const stageResult = await client.query(
      `SELECT id FROM stages WHERE name = $1 LIMIT 1`,
      ['Empty']
    );
    const emptyStageId = stageResult.rows[0]?.id;
    if (!emptyStageId) {
      throw new Error('Missing stage "Empty". Run migrations before seeding.');
    }

    const adminResult = await client.query(
      `SELECT id FROM users WHERE username = $1 LIMIT 1`,
      ['admin1']
    );
    const adminUserId = adminResult.rows[0]?.id;
    if (!adminUserId) {
      throw new Error('Admin user not found after seeding.');
    }

    const beds = Array.from({ length: 12 }, (_, index) => `EW-${String(index + 1).padStart(2, '0')}`);

    for (const bedCode of beds) {
      await client.query(
        `
        INSERT INTO beds (bed_number, current_stage_id, is_occupied, is_active, patient_start_time, last_stage_change)
        VALUES ($1, $2, $3, $4, NULL, NOW())
        ON CONFLICT (bed_number) DO NOTHING
        `,
        [bedCode, emptyStageId, false, true]
      );
    }

    await client.query(
      `
      INSERT INTO bed_stage_logs (bed_id, from_stage_id, to_stage_id, changed_by_user_id, transition_time)
      SELECT b.id, NULL, b.current_stage_id, $1, NOW()
      FROM beds b
      WHERE b.current_stage_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM bed_stage_logs s WHERE s.bed_id = b.id
        )
      `,
      [adminUserId]
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
