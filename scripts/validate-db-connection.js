#!/usr/bin/env node
'use strict';

/**
 * Validates database connection before running migrations or starting the app
 * Usage: node scripts/validate-db-connection.js
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

const validateDatabaseConnection = async () => {
  console.log('🔍 Validating database connection...\n');

  loadEnvFiles();

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not set in environment variables');
    console.error('Please ensure .env.local exists with DATABASE_URL configured');
    process.exit(1);
  }

  // Validate URL format
  try {
    const url = new URL(databaseUrl);
    if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
      console.error('❌ DATABASE_URL must be a PostgreSQL connection string');
      console.error(`Found protocol: ${url.protocol}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Invalid DATABASE_URL format');
    console.error(error.message);
    process.exit(1);
  }

  // Test connection
  const client = new Client({ connectionString: databaseUrl });

  try {
    console.log('🔌 Attempting to connect to database...');
    await client.connect();
    console.log('✅ Database connection successful\n');

    // Check PostgreSQL version
    const versionResult = await client.query('SELECT version()');
    const version = versionResult.rows[0].version;
    console.log(`📊 PostgreSQL Version: ${version.split(',')[0]}\n`);

    // Check if we can create tables (permission check)
    try {
      await client.query('CREATE TABLE IF NOT EXISTS _connection_test (id SERIAL PRIMARY KEY)');
      await client.query('DROP TABLE IF EXISTS _connection_test');
      console.log('✅ Database permissions verified (can create/drop tables)\n');
    } catch (permError) {
      console.error('⚠️  Warning: Limited database permissions');
      console.error(permError.message);
    }

    console.log('✅ Database validation complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed\n');
    console.error('Error details:');
    console.error(`  Code: ${error.code || 'N/A'}`);
    console.error(`  Message: ${error.message}`);
    console.error('');
    console.error('Common issues:');
    console.error('  • PostgreSQL server is not running');
    console.error('  • Incorrect host, port, or credentials in DATABASE_URL');
    console.error('  • Database does not exist (create it first)');
    console.error('  • Firewall blocking connection');
    console.error('');
    console.error('For setup help, see DATABASE_SETUP.md');
    process.exit(1);
  } finally {
    await client.end();
  }
};

validateDatabaseConnection();
