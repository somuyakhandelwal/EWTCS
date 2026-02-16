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
import { existsSync, copyFileSync, readFileSync } from 'fs';
import { createInterface } from 'readline';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Helper functions
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`),
  step: (step, total, msg) => console.log(`${colors.bright}[${step}/${total}]${colors.reset} ${msg}`),
};

// Execute command silently and return success/failure
function execSilent(command) {
  try {
    execSync(command, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Execute command and return output
function execOutput(command) {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim();
  } catch (error) {
    return null;
  }
}

// Ask user a yes/no question
function askQuestion(question) {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${colors.cyan}?${colors.reset} ${question} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

// Ask user for input
function askInput(question, defaultValue = '') {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const prompt = defaultValue 
      ? `${colors.cyan}?${colors.reset} ${question} (default: ${defaultValue}): `
      : `${colors.cyan}?${colors.reset} ${question}: `;

    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

// Main setup function
async function setup() {
  log.title('🚀 EWTCS Quick Start Setup');
  console.log('Welcome to the Emergency Ward Tracking & Communication System!\n');
  console.log('This script will help you set up your development environment.\n');

  const TOTAL_STEPS = 7;

  // Step 1: Check Node.js version
  log.step(1, TOTAL_STEPS, 'Checking Node.js version...');
  const nodeVersion = execOutput('node --version');
  if (!nodeVersion) {
    log.error('Node.js is not installed. Please install Node.js 18 or higher.');
    process.exit(1);
  }
  const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
  if (majorVersion < 18) {
    log.error(`Node.js ${nodeVersion} is too old. Please upgrade to Node.js 18 or higher.`);
    process.exit(1);
  }
  log.success(`Node.js ${nodeVersion} detected`);

  // Step 2: Check PostgreSQL
  log.step(2, TOTAL_STEPS, 'Checking PostgreSQL...');
  const pgVersion = execOutput('psql --version') || execOutput('postgres --version');
  if (!pgVersion) {
    log.error('PostgreSQL is not installed or not in PATH.');
    console.log('\nPlease install PostgreSQL 14 or higher:');
    console.log('  Windows: https://www.postgresql.org/download/windows/');
    console.log('  macOS: brew install postgresql@14');
    console.log('  Linux: sudo apt install postgresql-14\n');
    process.exit(1);
  }
  log.success(`PostgreSQL detected: ${pgVersion}`);

  // Check if PostgreSQL is running
  const pgRunning = execSilent('pg_isready') || execSilent('psql -U postgres -c "SELECT 1" 2>nul');
  if (!pgRunning) {
    log.warning('PostgreSQL may not be running.');
    const shouldContinue = await askQuestion('Do you want to continue anyway?');
    if (!shouldContinue) {
      console.log('\nTo start PostgreSQL:');
      console.log('  Windows: net start postgresql-x64-14');
      console.log('  macOS: brew services start postgresql@14');
      console.log('  Linux: sudo systemctl start postgresql\n');
      process.exit(1);
    }
  } else {
    log.success('PostgreSQL is running');
  }

  // Step 3: Create database
  log.step(3, TOTAL_STEPS, 'Setting up database...');
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

  // Step 4: Create .env.local
  log.step(4, TOTAL_STEPS, 'Creating environment configuration...');
  const envLocalPath = join(ROOT_DIR, '.env.local');
  const envExamplePath = join(ROOT_DIR, '.env.example');

  if (existsSync(envLocalPath)) {
    log.warning('.env.local already exists');
    const shouldOverwrite = await askQuestion('Do you want to overwrite it?');
    if (!shouldOverwrite) {
      log.info('Skipping .env.local creation');
    } else {
      await createEnvLocal(envExamplePath, envLocalPath, dbUser, dbPassword, dbHost, dbPort, dbName);
    }
  } else {
    await createEnvLocal(envExamplePath, envLocalPath, dbUser, dbPassword, dbHost, dbPort, dbName);
  }

  // Step 5: Install dependencies
  log.step(5, TOTAL_STEPS, 'Installing dependencies...');
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

  // Step 6: Run migrations
  log.step(6, TOTAL_STEPS, 'Running database migrations...');
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

  // Step 7: Seed database
  log.step(7, TOTAL_STEPS, 'Seeding initial data...');
  const shouldSeed = await askQuestion('Do you want to seed the database with sample data?');
  if (shouldSeed) {
    try {
      execSync('npm run db:seed', { cwd: ROOT_DIR, stdio: 'inherit' });
      log.success('Database seeded successfully');
    } catch (error) {
      log.error('Seeding failed');
      console.log('\nYou can seed manually later with: npm run db:seed\n');
    }
  } else {
    log.info('Skipping database seeding');
  }

  // Success!
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

// Create .env.local file with user's database credentials
async function createEnvLocal(examplePath, localPath, user, password, host, port, dbName) {
  try {
    // Read template
    let envContent = readFileSync(examplePath, 'utf-8');

    // Replace DATABASE_URL
    const databaseUrl = `postgresql://${user}:${password}@${host}:${port}/${dbName}`;
    envContent = envContent.replace(
      /DATABASE_URL=postgresql:\/\/postgres:password@localhost:5432\/ewtcs/,
      `DATABASE_URL=${databaseUrl}`
    );

    // Write to .env.local
    const fs = await import('fs/promises');
    await fs.writeFile(localPath, envContent);

    log.success('.env.local created successfully');
    log.info(`Database URL: postgresql://${user}:***@${host}:${port}/${dbName}`);
  } catch (error) {
    log.error('Failed to create .env.local');
    console.log('\nPlease create it manually:');
    console.log(`  cp .env.example .env.local`);
    console.log(`  # Then edit DATABASE_URL in .env.local\n`);
  }
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
