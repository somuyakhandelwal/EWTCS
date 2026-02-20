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
