#!/usr/bin/env node

import { randomBytes } from 'crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import pg from 'pg';
import { log } from './setup-utils.mjs';

const { Client } = pg;

function parseDatabaseUrl(databaseUrl) {
  const parsed = new URL(databaseUrl);
  return {
    dbName: parsed.pathname.replace(/^\//, ''),
    username: decodeURIComponent(parsed.username || 'postgres'),
    password: decodeURIComponent(parsed.password || ''),
    host: parsed.hostname || 'localhost',
    port: parsed.port || '5432',
    ssl: parsed.searchParams.get('sslmode') === 'require',
  };
}

function readDatabaseUrlFromEnvFile(filePath) {
  if (!existsSync(filePath)) return null;
  const text = readFileSync(filePath, 'utf-8');
  const match = text.match(/^DATABASE_URL=(.*)$/m);
  return match ? match[1].trim() : null;
}

export async function setupDatabase(step, totalSteps) {
  log.step(step, totalSteps, 'Ensuring database exists...');

  const rootDir = process.cwd();
  const envLocal = join(rootDir, '.env.local');
  const envExample = join(rootDir, '.env.example');

  const databaseUrl =
    process.env.DATABASE_URL ||
    readDatabaseUrlFromEnvFile(envLocal) ||
    readDatabaseUrlFromEnvFile(envExample);

  if (!databaseUrl) {
    log.error('DATABASE_URL not found in environment or env files.');
    process.exit(1);
  }

  const dbConfig = parseDatabaseUrl(databaseUrl);

  const adminUrl = `postgresql://${encodeURIComponent(dbConfig.username)}:${encodeURIComponent(dbConfig.password)}@${dbConfig.host}:${dbConfig.port}/postgres`;
  const client = new Client({ connectionString: adminUrl, ssl: dbConfig.ssl ? { rejectUnauthorized: false } : false });

  try {
    await client.connect();

    const existsResult = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbConfig.dbName]);
    if (existsResult.rowCount === 0) {
      const safeDbName = dbConfig.dbName.replace(/"/g, '""');
      await client.query(`CREATE DATABASE "${safeDbName}"`);
      log.success(`Database created: ${dbConfig.dbName}`);
    } else {
      log.success(`Database already exists: ${dbConfig.dbName}`);
    }
  } catch (error) {
    log.error(`Database setup failed: ${error.message}`);
    process.exit(1);
  } finally {
    await client.end();
  }

  return { ...dbConfig, databaseUrl };
}

export async function createEnvFile(step, totalSteps, rootDir, dbConfig) {
  log.step(step, totalSteps, 'Preparing .env.local...');

  const envLocal = join(rootDir, '.env.local');
  const envExample = join(rootDir, '.env.example');

  if (!existsSync(envLocal)) {
    copyFileSync(envExample, envLocal);
  }

  let content = readFileSync(envLocal, 'utf-8');
  content = content.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${dbConfig.databaseUrl}`);

  if (/^SESSION_SECRET=your-secret-key/m.test(content)) {
    const secret = randomBytes(32).toString('hex');
    content = content.replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET=${secret}`);
  }

  writeFileSync(envLocal, content, 'utf-8');
  log.success('.env.local configured');
}
