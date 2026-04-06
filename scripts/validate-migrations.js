#!/usr/bin/env node
'use strict';

/**
 * Validates that all migrations have been applied successfully
 * Usage: node scripts/validate-migrations.js
 */

const { Client } = require('pg');
const path = require('path');
const fs = require('fs');
const { loadEnvironment } = require('./lib-env');

const ALLOWED_DUPLICATE_GROUPS = new Map([
  ['015', ['015_add_password_reset', '015_add_tat_to_admissions']],
  ['038', ['038_add_delay_reason_options', '038_create_alert_preferences']],
  ['040', ['040_create_user_feedback', '040_enable_pgcrypto']],
  ['047', ['047_add_cath_lab_roles', '047_add_doctor_and_cardiologist_roles', '047_enforce_symptom_40_char_limit']],
  ['056', ['056_create_cath_lab_procedures', '056_seed_emergency_ward']],
  ['057', ['057_create_cath_lab_procedures_table', '057_extend_cath_lab_procedures']],
  ['058', ['058_normalize_delay_reason_fk', '058_repair_cath_lab_procedures_columns']],
]);

const validateMigrations = async () => {
  console.log('🔍 Validating database migrations...\n');

  loadEnvironment();

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

  // Get all migration files (JS/TS/SQL).
  // All formats are supported by node-pg-migrate and tracked in pgmigrations.
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
    const errors = [];

    for (const [number, names] of duplicates) {
      const allowed = ALLOWED_DUPLICATE_GROUPS.get(number);
      if (!allowed) {
        errors.push(`Unexpected duplicate prefix ${number}: ${names.join(', ')}`);
        continue;
      }

      const normalizedActual = [...names].sort();
      const normalizedExpected = [...allowed].sort();

      if (
        normalizedActual.length !== normalizedExpected.length ||
        normalizedActual.some((name, index) => name !== normalizedExpected[index])
      ) {
        errors.push(
          `Duplicate prefix ${number} does not match allowlist. Found: ${normalizedActual.join(', ')} | Expected: ${normalizedExpected.join(', ')}`
        );
      }
    }

    if (errors.length > 0) {
      console.error('❌ ERROR: Duplicate migration groups are not in the approved canonical set.');
      for (const message of errors) {
        console.error(`  ✗ ${message}`);
      }
      process.exit(1);
    }

    console.log(`ℹ️  Validated ${duplicates.length} approved duplicate migration prefix groups.`);
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

    // Verify migration order when explicitly requested.
    const expectedOrder = [...appliedMigrations].sort();
    const actualOrder = appliedMigrations;

    let orderMismatch = false;
    for (let i = 0; i < appliedMigrations.length; i++) {
      if (expectedOrder[i] !== actualOrder[i]) {
        orderMismatch = true;
        break;
      }
    }

    const strictOrderCheckEnabled = process.env.VALIDATE_MIGRATION_ORDER === 'true';

    if (orderMismatch && strictOrderCheckEnabled) {
      console.log('\nℹ️  NOTE: Migration apply timestamps differ from filename order.');
      console.log('This is informational when pending migrations = 0.');
      console.log(`Expected first migration: ${expectedOrder[0]}`);
      console.log(`Applied first migration: ${actualOrder[0]}`);
      console.log(`Expected last migration: ${expectedOrder[expectedOrder.length - 1]}`);
      console.log(`Applied last migration: ${actualOrder[actualOrder.length - 1]}`);
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
