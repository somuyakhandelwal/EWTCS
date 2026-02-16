/**
 * Prerequisite checks for setup
 * Validates Node.js and PostgreSQL installation and versions
 */

import { log, execOutput, execSilent, askQuestion } from './setup-utils.mjs';

/**
 * Check Node.js version
 * @param {number} step - Current step number
 * @param {number} totalSteps - Total number of steps
 * @returns {string} Node.js version
 */
export async function checkNodeVersion(step, totalSteps) {
  log.step(step, totalSteps, 'Checking Node.js version...');
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
  return nodeVersion;
}

/**
 * Check PostgreSQL installation and running status
 * @param {number} step - Current step number
 * @param {number} totalSteps - Total number of steps
 * @returns {Promise<string>} PostgreSQL version
 */
export async function checkPostgreSQL(step, totalSteps) {
  log.step(step, totalSteps, 'Checking PostgreSQL...');
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
  
  return pgVersion;
}
