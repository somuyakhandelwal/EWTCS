/**
 * Database setup operations
 * Handles database creation and .env.local configuration
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { log, execSilent, askQuestion, askInput } from './setup-utils.mjs';

/**
 * Create database with user-provided credentials
 * @param {number} step - Current step number
 * @param {number} totalSteps - Total number of steps
 * @returns {Promise<Object>} Database configuration
 */
export async function setupDatabase(step, totalSteps) {
  log.step(step, totalSteps, 'Setting up database...');
  
  const dbName = await askInput('Enter database name', 'ewtcs');
  const dbUser = await askInput('Enter PostgreSQL username', 'postgres');
  const dbPassword = await askInput('Enter PostgreSQL password');
  const dbHost = await askInput('Enter database host', 'localhost');
  const dbPort = await askInput('Enter database port', '5432');

  // Try to create database
  const createDbCommand = process.platform === 'win32'
    ? `createdb -U ${dbUser} ${dbName}`
    : `createdb -U ${dbUser} ${dbName}`;

  if (execSilent(createDbCommand)) {
    log.success(`Database '${dbName}' created successfully`);
  } else {
    log.warning(`Database '${dbName}' may already exist or creation failed`);
    const shouldContinue = await askQuestion('Continue anyway?');
    if (!shouldContinue) {
      process.exit(1);
    }
  }

  return { dbName, dbUser, dbPassword, dbHost, dbPort };
}

/**
 * Create .env.local file with database credentials
 * @param {number} step - Current step number
 * @param {number} totalSteps - Total number of steps
 * @param {string} rootDir - Project root directory
 * @param {Object} dbConfig - Database configuration
 */
export async function createEnvFile(step, totalSteps, rootDir, dbConfig) {
  log.step(step, totalSteps, 'Creating environment configuration...');
  
  const envLocalPath = join(rootDir, '.env.local');
  const envExamplePath = join(rootDir, '.env.example');

  if (existsSync(envLocalPath)) {
    log.warning('.env.local already exists');
    const shouldOverwrite = await askQuestion('Do you want to overwrite it?');
    if (!shouldOverwrite) {
      log.info('Skipping .env.local creation');
      return;
    }
  }

  await writeEnvLocal(envExamplePath, envLocalPath, dbConfig);
}

/**
 * Write .env.local file with user's database credentials
 * @param {string} examplePath - Path to .env.example
 * @param {string} localPath - Path to .env.local
 * @param {Object} dbConfig - Database configuration
 */
async function writeEnvLocal(examplePath, localPath, dbConfig) {
  try {
    const { dbUser, dbPassword, dbHost, dbPort, dbName } = dbConfig;
    
    // Read template
    let envContent = readFileSync(examplePath, 'utf-8');

    // Replace DATABASE_URL
    const databaseUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
    envContent = envContent.replace(
      /DATABASE_URL=postgresql:\/\/postgres:password@localhost:5432\/ewtcs/,
      `DATABASE_URL=${databaseUrl}`
    );

    // Write to .env.local
    const fs = await import('fs/promises');
    await fs.writeFile(localPath, envContent);

    log.success('.env.local created successfully');
    log.info(`Database URL: postgresql://${dbUser}:***@${dbHost}:${dbPort}/${dbName}`);
  } catch (error) {
    log.error('Failed to create .env.local');
    console.log('\nPlease create it manually:');
    console.log(`  cp .env.example .env.local`);
    console.log(`  # Then edit DATABASE_URL in .env.local\n`);
  }
}
