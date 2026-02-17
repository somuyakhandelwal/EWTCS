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
const { 
  EXPECTED_TABLES, 
  validateTableColumns, 
  getAllTables, 
  getForeignKeyConstraints, 
  getIndexes 
} = require('./lib-db-validation');

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

    // Check tables
    const existingTables = await getAllTables(client);
    console.log(`📊 Found ${existingTables.length} tables in database\n`);

    const missingTables = EXPECTED_TABLES.filter(
      (table) => !existingTables.includes(table)
    );

    if (missingTables.length > 0) {
      console.error('❌ Missing expected tables:\n');
      missingTables.forEach((table) => console.error(`  ✗ ${table}`));
      console.error('\nRun migrations to create missing tables: npm run db:migrate');
      process.exit(1);
    }

    console.log('✅ All expected tables exist:\n');
    EXPECTED_TABLES.forEach((table) => console.log(`  ✓ ${table}`));

    // Validate critical table structures
    console.log('\n🔍 Validating table structures...\n');

    const validations = [
      { 
        table: 'users', 
        cols: ['id', 'username', 'password_hash', 'role', 'created_at'] 
      },
      { 
        table: 'beds', 
        cols: ['id', 'bed_number', 'ward_id'] 
      },
      { 
        table: 'wards', 
        cols: ['id', 'code', 'name'] 
      }
    ];

    for (const v of validations) {
      if (!(await validateTableColumns(client, v.table, v.cols))) {
        process.exit(1);
      }
    }

    // Check FKs and Indexes
    const fkConstraints = await getForeignKeyConstraints(client);
    console.log(`\n🔗 Found ${fkConstraints.length} foreign key constraints`);

    const indexes = await getIndexes(client);
    console.log(`📇 Found ${indexes.length} indexes\n`);

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
