#!/usr/bin/env node
'use strict';

/**
 * Validates that all migrations have been applied successfully
 * Usage: node scripts/validate-migrations.js
 */

const { Client } = require('pg');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Legacy duplicates are already applied in production-like environments.
// Do not rename historical files in-place; instead guard against NEW duplicates.
const ALLOWED_LEGACY_DUPLICATES = {
  '015': ['015_add_password_reset', '015_add_tat_to_admissions'],
  '038': ['038_add_delay_reason_options', '038_create_alert_preferences'],
  '040': ['040_create_user_feedback', '040_enable_pgcrypto'],
  '046': ['046_add_patient_demographics_to_beds', '046_create_cath_lab_procedures'],
  '047': ['047_add_cath_lab_roles', '047_add_doctor_and_cardiologist_roles', '047_enforce_symptom_40_char_limit'],
};

// Load environment files
const loadEnvFiles = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const baseFiles = ['.env', `.env.${nodeEnv}`];

  baseFiles.forEach((file) => {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const override = file !== '.env';
      dotenv.config({ path: fullPath, override });
    }
  });

  const localPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(localPath)) {
    dotenv.config({ path: localPath, override: true });
  }
};

const validateMigrations = async () => {
  console.log('🔍 Validating database migrations...\n');

  loadEnvFiles();

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  const migrationsDir = path.resolve(process.cwd(), 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Migrations directory not found');
    process.exit(1);
  }

  // Get all migration files
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.sql'))
    .map((file) => path.parse(file).name)
    .sort();

  const invalidNaming = migrationFiles.filter(
    (name) => !/^\d{3}_.+/.test(name) && !/^\d{13}_.+/.test(name)
  );
  if (invalidNaming.length > 0) {
    console.error('❌ ERROR: Invalid migration filename format detected.');
    console.error('Migrations must use either NNN_description or TIMESTAMP_description.');
    invalidNaming.forEach((name) => console.error(`  ✗ ${name}`));
    process.exit(1);
  }

  const numberToNames = new Map();
  for (const name of migrationFiles) {
    const match = name.match(/^(\d+)_/);
    if (!match) continue;
    const number = match[1];
    const existing = numberToNames.get(number) ?? [];
    existing.push(name);
    numberToNames.set(number, existing);
  }

  const duplicates = Array.from(numberToNames.entries()).filter(([, names]) => names.length > 1);
  if (duplicates.length > 0) {
    const unexpectedDuplicates = [];
    const legacyDuplicates = [];

    for (const [number, names] of duplicates) {
      const allowedNames = ALLOWED_LEGACY_DUPLICATES[number];
      const normalizedActual = [...names].sort();
      const normalizedAllowed = allowedNames ? [...allowedNames].sort() : null;
      const isAllowedLegacy =
        Array.isArray(normalizedAllowed) &&
        normalizedAllowed.length === normalizedActual.length &&
        normalizedAllowed.every((name, idx) => name === normalizedActual[idx]);

      if (isAllowedLegacy) {
        legacyDuplicates.push([number, names]);
      } else {
        unexpectedDuplicates.push([number, names]);
      }
    }

    if (unexpectedDuplicates.length > 0) {
      console.error('❌ ERROR: Unexpected duplicate migration number prefixes detected.');
      for (const [number, names] of unexpectedDuplicates) {
        console.error(`  ${number}: ${names.join(', ')}`);
      }
      console.error('Use a new unique numeric prefix (or timestamp) for new migrations.');
      process.exit(1);
    }

    if (legacyDuplicates.length > 0) {
      console.log('ℹ️  Known legacy duplicate prefixes detected (allowed):');
      for (const [number, names] of legacyDuplicates) {
        console.log(`  ${number}: ${names.join(', ')}`);
      }
    }
  }

  const numericMigrations = migrationFiles
    .map((name) => ({ name, match: name.match(/^(\d{3})_/) }))
    .filter((entry) => entry.match)
    .map((entry) => ({ name: entry.name, number: Number(entry.match[1]) }));

  if (numericMigrations.length > 0) {
    const latestNumber = Math.max(...numericMigrations.map((entry) => entry.number));
    const latestPrefix = String(latestNumber).padStart(3, '0');
    const latestConflicts = numericMigrations.filter((entry) => entry.number === latestNumber);

    if (latestConflicts.length > 1) {
      console.error(`❌ ERROR: Latest numeric migration prefix ${latestPrefix} is duplicated.`);
      console.error('Create the next migration with a new incremented prefix to avoid ordering conflicts.');
      latestConflicts.forEach((entry) => console.error(`  ✗ ${entry.name}`));
      process.exit(1);
    }
  }

  console.log(`📁 Found ${migrationFiles.length} migration files\n`);

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();

    // Check if pgmigrations table exists
    const tableCheckResult = await client.query(
      "SELECT to_regclass('public.pgmigrations') AS table_name"
    );

    const tableExists = Boolean(tableCheckResult.rows[0]?.table_name);

    if (!tableExists) {
      console.error('❌ Migration tracking table (pgmigrations) does not exist');
      console.error('This usually means migrations have never been run.');
      console.error('Run: npm run db:migrate');
      process.exit(1);
    }

    // Get applied migrations
    const appliedResult = await client.query(
      'SELECT name, run_on FROM public.pgmigrations ORDER BY run_on'
    );

    const appliedMigrations = appliedResult.rows.map((row) => row.name);

    console.log(`✅ Applied migrations: ${appliedMigrations.length}`);
    
    if (appliedMigrations.length > 0) {
      console.log('\nApplied migrations:');
      appliedResult.rows.forEach((row) => {
        const runDate = new Date(row.run_on).toISOString();
        console.log(`  ✓ ${row.name} (${runDate})`);
      });
    }

    // Find pending migrations
    const pendingMigrations = migrationFiles.filter(
      (name) => !appliedMigrations.includes(name)
    );

    console.log(`\n📋 Pending migrations: ${pendingMigrations.length}`);

    if (pendingMigrations.length > 0) {
      console.error('\n❌ ERROR: Pending migrations detected!\n');
      console.error('Pending migrations:');
      pendingMigrations.forEach((name) => {
        console.error(`  ✗ ${name}`);
      });
      console.error('\nAll migrations must be applied before merging.');
      console.error('Run: npm run db:migrate');
      process.exit(1);
    }

    // Verify migration order (informational only)
    const expectedOrder = [...appliedMigrations].sort();
    const actualOrder = appliedMigrations;

    let orderMismatch = false;
    for (let i = 0; i < appliedMigrations.length; i++) {
      if (expectedOrder[i] !== actualOrder[i]) {
        orderMismatch = true;
        break;
      }
    }

    if (orderMismatch) {
      console.log('\nℹ️  NOTE: Migration apply timestamps differ from filename order.');
      console.log('This is informational when pending migrations = 0.');
      console.log('Expected order:', expectedOrder);
      console.log('Applied order:', actualOrder);
    }

    console.log('\n✅ All migrations validated successfully');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration validation failed');
    console.error(error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
};

validateMigrations();
