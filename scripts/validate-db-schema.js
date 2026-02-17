#!/usr/bin/env node
'use strict';

/**
 * Validates database schema matches expected structure
 * Usage: node scripts/validate-db-schema.js
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

// Expected core tables based on migrations
const EXPECTED_TABLES = [
  'users',
  'audit_logs',
  'beds',
  'bed_stages',
  'wards',
  'token_blacklist',
  'pgmigrations'
];

const validateDatabaseSchema = async () => {
  console.log('🔍 Validating database schema...\n');

  loadEnvFiles();

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();

    // Get all tables in public schema
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    const existingTables = tablesResult.rows.map((row) => row.table_name);

    console.log(`📊 Found ${existingTables.length} tables in database\n`);

    // Check for missing expected tables
    const missingTables = EXPECTED_TABLES.filter(
      (table) => !existingTables.includes(table)
    );

    if (missingTables.length > 0) {
      console.error('❌ Missing expected tables:\n');
      missingTables.forEach((table) => {
        console.error(`  ✗ ${table}`);
      });
      console.error('\nRun migrations to create missing tables: npm run db:migrate');
      process.exit(1);
    }

    console.log('✅ All expected tables exist:\n');
    EXPECTED_TABLES.forEach((table) => {
      console.log(`  ✓ ${table}`);
    });

    // Validate critical table structures
    console.log('\n🔍 Validating table structures...\n');

    // Validate users table
    const usersColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `);

    const requiredUserColumns = ['id', 'username', 'password_hash', 'role', 'created_at'];
    const userColumnNames = usersColumns.rows.map((row) => row.column_name);

    const missingUserColumns = requiredUserColumns.filter(
      (col) => !userColumnNames.includes(col)
    );

    if (missingUserColumns.length > 0) {
      console.error('❌ Users table missing required columns:');
      missingUserColumns.forEach((col) => console.error(`  ✗ ${col}`));
      process.exit(1);
    }

    console.log('✅ Users table structure valid');

    // Validate beds table
    const bedsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'beds'
      ORDER BY ordinal_position
    `);

    const requiredBedColumns = ['id', 'bed_number', 'status', 'ward_id'];
    const bedColumnNames = bedsColumns.rows.map((row) => row.column_name);

    const missingBedColumns = requiredBedColumns.filter(
      (col) => !bedColumnNames.includes(col)
    );

    if (missingBedColumns.length > 0) {
      console.error('❌ Beds table missing required columns:');
      missingBedColumns.forEach((col) => console.error(`  ✗ ${col}`));
      process.exit(1);
    }

    console.log('✅ Beds table structure valid');

    // Validate wards table
    const wardsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'wards'
      ORDER BY ordinal_position
    `);

    const requiredWardColumns = ['id', 'code', 'name'];
    const wardColumnNames = wardsColumns.rows.map((row) => row.column_name);

    const missingWardColumns = requiredWardColumns.filter(
      (col) => !wardColumnNames.includes(col)
    );

    if (missingWardColumns.length > 0) {
      console.error('❌ Wards table missing required columns:');
      missingWardColumns.forEach((col) => console.error(`  ✗ ${col}`));
      process.exit(1);
    }

    console.log('✅ Wards table structure valid');

    // Check for foreign key constraints
    const fkResult = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name
    `);

    console.log(`\n🔗 Found ${fkResult.rows.length} foreign key constraints`);

    // Check for indexes
    const indexResult = await client.query(`
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);

    console.log(`📇 Found ${indexResult.rows.length} indexes\n`);

    console.log('✅ Database schema validation complete');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Schema validation failed');
    console.error(error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
};

validateDatabaseSchema();
