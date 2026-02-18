'use strict';

const { Client } = require('pg');
const { log } = require('./lib-logger');
const { loadEnvironment, resolveDatabaseUrl } = require('./lib-env');

const REQUIRED_TABLES = [
  'users',
  'audit_logs',
  'stages',
  'beds',
  'bed_stage_logs',
  'pgmigrations',
];

const USERS_REQUIRED_COLUMNS = ['id', 'username', 'password_hash', 'role'];

async function fetchTables(client) {
  const result = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
  );
  return result.rows.map((row) => row.table_name);
}

async function fetchUserColumns(client) {
  const result = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users'"
  );
  return result.rows.map((row) => row.column_name);
}

async function run() {
  log.header('Database Schema Validation');
  log.step(1, 'Loading environment...');
  loadEnvironment();

  const databaseUrl = resolveDatabaseUrl();
  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();

    log.step(2, 'Checking required tables...');
    const tables = await fetchTables(client);
    const missingTables = REQUIRED_TABLES.filter((name) => !tables.includes(name));
    if (missingTables.length > 0) {
      throw new Error(`Missing tables: ${missingTables.join(', ')}`);
    }

    log.step(3, 'Checking users table columns...');
    const columns = await fetchUserColumns(client);
    const missingColumns = USERS_REQUIRED_COLUMNS.filter((name) => !columns.includes(name));
    if (missingColumns.length > 0) {
      throw new Error(`Missing users columns: ${missingColumns.join(', ')}`);
    }

    log.success('Database schema looks valid');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  log.error(error.message);
  process.exit(1);
});
