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

const LEGACY_DUPLICATE_PREFIXES = new Set(['015', '038', '040', '047']);

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
  const legacyDuplicates = duplicates.filter(([number]) => LEGACY_DUPLICATE_PREFIXES.has(number));
  const unexpectedDuplicates = duplicates.filter(([number]) => !LEGACY_DUPLICATE_PREFIXES.has(number));

  if (legacyDuplicates.length > 0) {
    console.log('ℹ️  Legacy duplicate migration prefixes detected (allowed for backward compatibility):');
    for (const [number, names] of legacyDuplicates) {
      console.log(`  ${number}: ${names.join(', ')}`);
    }
  }

  if (unexpectedDuplicates.length > 0) {
    console.warn('⚠️  WARNING: New duplicate migration number prefixes detected:');
    for (const [number, names] of unexpectedDuplicates) {
      console.warn(`  ${number}: ${names.join(', ')}`);
    }
    console.warn('Use unique numeric prefixes for new migration files.');
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
