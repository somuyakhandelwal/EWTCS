import { execSync } from 'child_process';
import { log } from './setup-utils.mjs';

function majorVersion(version) {
  const value = String(version || '').replace(/^v/, '');
  const major = Number(value.split('.')[0]);
  return Number.isFinite(major) ? major : 0;
}

/**
 * Validate Node.js version.
 * @returns {Promise<string>} Node.js version string
 */
export async function checkNodeVersion(step, totalSteps) {
  log.step(step, totalSteps, 'Checking Node.js version...');

  const version = process.version.replace(/^v/, '');
  const major = majorVersion(process.version);

  if (major < 18) {
    log.error(`Node.js 18+ is required. Current: ${version}`);
    process.exit(1);
  }

  log.success(`Node.js ${version} detected`);
  return version;
}

/**
 * Validate PostgreSQL client availability.
 */
export async function checkPostgreSQL(step, totalSteps) {
  log.step(step, totalSteps, 'Checking PostgreSQL tools...');

  try {
    const versionOutput = execSync('psql --version', { encoding: 'utf-8' }).trim();
    log.success(versionOutput);
  } catch {
    log.error('psql not found. Install PostgreSQL and ensure psql is on PATH.');
    process.exit(1);
  }
}
