/**
 * Setup prerequisite checks for EWTCS
 * Verifies Node.js version and PostgreSQL availability
 */

import { log, execSilent, execOutput } from './setup-utils.mjs';

const MIN_NODE_MAJOR = 18;

/**
 * Check that Node.js meets the minimum version requirement.
 * @param {number} step - Current step number
 * @param {number} totalSteps - Total number of steps
 * @returns {Promise<string>} The current Node.js version string
 */
export async function checkNodeVersion(step, totalSteps) {
  log.step(step, totalSteps, 'Checking Node.js version...');

  const version = process.version; // e.g. "v18.17.0"
  const major = parseInt(version.slice(1).split('.')[0], 10);

  if (major < MIN_NODE_MAJOR) {
    log.error(
      `Node.js ${MIN_NODE_MAJOR}+ is required, but you have ${version}. Please upgrade Node.js.`
    );
    process.exit(1);
  }

  log.success(`Node.js ${version} detected`);
  return version;
}

/**
 * Check that PostgreSQL is installed and accessible.
 * @param {number} step - Current step number
 * @param {number} totalSteps - Total number of steps
 */
export async function checkPostgreSQL(step, totalSteps) {
  log.step(step, totalSteps, 'Checking PostgreSQL...');

  // Try psql --version first
  const psqlVersion = execOutput('psql --version');
  if (psqlVersion) {
    log.success(`PostgreSQL found: ${psqlVersion}`);
    return;
  }

  // Fallback: try pg_isready
  if (execSilent('pg_isready')) {
    log.success('PostgreSQL server is reachable');
    return;
  }

  log.error(
    'PostgreSQL does not appear to be installed or is not in your PATH.\n' +
    '  Please install PostgreSQL (https://www.postgresql.org/download/) and try again.'
  );
  process.exit(1);
}
