'use strict';

const { Client } = require('pg');
const { log } = require('./lib-logger');
const { loadEnvironment, resolveDatabaseUrl } = require('./lib-env');

function isValidPostgresUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:';
  } catch {
    return false;
  }
}

async function run() {
  log.header('Database Connection Validation');
  log.step(1, 'Loading environment...');
  loadEnvironment();

  const databaseUrl = resolveDatabaseUrl();
  if (!isValidPostgresUrl(databaseUrl)) {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
  }

  log.step(2, 'Testing database connection...');
  const client = new Client({ connectionString: databaseUrl });
  try {
    await client.connect();
    await client.query('SELECT 1');
    log.success('Database connection successful');
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  log.error(error.message);
  process.exit(1);
});
