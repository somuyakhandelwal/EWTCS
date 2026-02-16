#!/usr/bin/env node

/**
 * Quick Start Setup Script for EWTCS
 * 
 * This script automates the initial setup process for new developers:
 * 1. Checks prerequisites (Node.js, PostgreSQL)
 * 2. Creates database if it doesn't exist
 * 3. Creates .env.local from .env.example if needed
 * 4. Runs migrations
 * 5. Seeds initial data
 * 6. Provides next steps
 * 
 * Usage:
 *   npm run setup
 *   OR
 *   node scripts/quick-start-setup.mjs
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { log, colors, askQuestion } from './setup-utils.mjs';
import { checkNodeVersion, checkPostgreSQL } from './setup-checks.mjs';
import { setupDatabase, createEnvFile } from './setup-database.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Main setup function
async function setup() {
  log.title('🚀 EWTCS Quick Start Setup');
  console.log('Welcome to the Emergency Ward Tracking & Communication System!\n');
  console.log('This script will help you set up your development environment.\n');

  const TOTAL_STEPS = 7;

  // Step 1: Check Node.js version
  const nodeVersion = await checkNodeVersion(1, TOTAL_STEPS);

  // Step 2: Check PostgreSQL
  await checkPostgreSQL(2, TOTAL_STEPS);

  // Step 3: Create database
  const dbConfig = await setupDatabase(3, TOTAL_STEPS);

  // Step 4: Create .env.local
  await createEnvFile(4, TOTAL_STEPS, ROOT_DIR, dbConfig);

  // Step 5: Install dependencies
  await installDependencies(5, TOTAL_STEPS);

  // Step 6: Run migrations
  await runMigrations(6, TOTAL_STEPS);

  // Step 7: Seed database
  const shouldSeed = await seedDatabase(7, TOTAL_STEPS);

  // Success!
  displaySuccessMessage(nodeVersion, dbConfig.dbName, shouldSeed);
}

/**
 * Install npm dependencies
 */
async function installDependencies(step, totalSteps) {
  log.step(step, totalSteps, 'Installing dependencies...');
  if (!existsSync(join(ROOT_DIR, 'node_modules'))) {
    log.info('Running npm install...');
    try {
      execSync('npm install', { cwd: ROOT_DIR, stdio: 'inherit' });
      log.success('Dependencies installed');
    } catch (error) {
      log.error('Failed to install dependencies');
      process.exit(1);
    }
  } else {
    log.success('Dependencies already installed');
  }
}

/**
 * Run database migrations
 */
async function runMigrations(step, totalSteps) {
  log.step(step, totalSteps, 'Running database migrations...');
  try {
    execSync('npm run db:migrate', { cwd: ROOT_DIR, stdio: 'inherit' });
    log.success('Migrations completed');
  } catch (error) {
    log.error('Migration failed. Check your database connection and try again.');
    console.log('\nManual fix:');
    console.log('  1. Verify DATABASE_URL in .env.local');
    console.log('  2. Run: npm run db:migrate\n');
    process.exit(1);
  }
}

/**
 * Seed database with sample data
 * @returns {Promise<boolean>} True if seeded, false if skipped
 */
async function seedDatabase(step, totalSteps) {
  log.step(step, totalSteps, 'Seeding initial data...');
  const shouldSeed = await askQuestion('Do you want to seed the database with sample data?');
  if (shouldSeed) {
    try {
      execSync('npm run db:seed', { cwd: ROOT_DIR, stdio: 'inherit' });
      log.success('Database seeded successfully');
      return true;
    } catch (error) {
      log.error('Seeding failed');
      console.log('\nYou can seed manually later with: npm run db:seed\n');
      return false;
    }
  } else {
    log.info('Skipping database seeding');
    return false;
  }
}

/**
 * Display success message with next steps
 */
function displaySuccessMessage(nodeVersion, dbName, shouldSeed) {
  log.title('✅ Setup Complete!');

  console.log('Your development environment is ready. Here\'s what was set up:\n');
  console.log(`  ${colors.green}✓${colors.reset} Node.js ${nodeVersion}`);
  console.log(`  ${colors.green}✓${colors.reset} PostgreSQL installed`);
  console.log(`  ${colors.green}✓${colors.reset} Database '${dbName}' created`);
  console.log(`  ${colors.green}✓${colors.reset} Environment configured (.env.local)`);
  console.log(`  ${colors.green}✓${colors.reset} Dependencies installed`);
  console.log(`  ${colors.green}✓${colors.reset} Database migrations applied`);
  if (shouldSeed) {
    console.log(`  ${colors.green}✓${colors.reset} Sample data seeded\n`);
  } else {
    console.log(`  ${colors.yellow}⚠${colors.reset} Database seeding skipped\n`);
  }

  console.log(`${colors.bright}Next Steps:${colors.reset}\n`);
  console.log(`  1. Start the development server:`);
  console.log(`     ${colors.cyan}npm run dev${colors.reset}\n`);
  console.log(`  2. Open your browser:`);
  console.log(`     ${colors.cyan}http://localhost:3000${colors.reset}\n`);
  console.log(`  3. Login with default credentials:`);
  console.log(`     Username: ${colors.cyan}admin${colors.reset}`);
  console.log(`     Password: ${colors.cyan}Admin@123${colors.reset}\n`);
  console.log(`${colors.bright}Documentation:${colors.reset}\n`);
  console.log(`  • Database Setup: ${colors.cyan}DATABASE_SETUP.md${colors.reset}`);
  console.log(`  • Configuration: ${colors.cyan}CONFIGURATION.md${colors.reset}`);
  console.log(`  • Contributing: ${colors.cyan}CONTRIBUTING.md${colors.reset}\n`);
  console.log(`${colors.green}Happy coding! 🚀${colors.reset}\n`);
}

// Error handling
process.on('SIGINT', () => {
  console.log('\n\nSetup cancelled by user.');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  log.error(`Unexpected error: ${error.message}`);
  process.exit(1);
});

// Run setup
setup().catch((error) => {
  log.error(`Setup failed: ${error.message}`);
  console.log('\nFor manual setup instructions, see DATABASE_SETUP.md\n');
  process.exit(1);
});
