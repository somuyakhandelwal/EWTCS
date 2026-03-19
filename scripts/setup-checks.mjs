#!/usr/bin/env node

import { execOutput, execSilent, log } from './setup-utils.mjs';

function parseMajorVersion(versionString) {
  const cleaned = versionString.replace(/^v/, '');
  const major = Number.parseInt(cleaned.split('.')[0], 10);
  return Number.isFinite(major) ? major : null;
}

export async function checkNodeVersion(step, totalSteps) {
  log.step(step, totalSteps, 'Checking Node.js version...');

  const version = process.version;
  const major = parseMajorVersion(version);

  if (!major) {
    log.error(`Unable to parse Node.js version: ${version}`);
    process.exit(1);
  }

  if (major < 20) {
    log.error(`Node.js ${version} detected. Minimum required: v20.x`);
    process.exit(1);
  }

  log.success(`Node.js ${version} is compatible`);
  return version;
}

export async function checkPostgreSQL(step, totalSteps) {
  log.step(step, totalSteps, 'Checking PostgreSQL tools...');

  const hasPsql = execSilent('psql --version');
  const hasPgIsReady = execSilent('pg_isready --version');

  if (!hasPsql && !hasPgIsReady) {
    log.error('PostgreSQL CLI tools not found in PATH (psql/pg_isready).');
    log.info('Install PostgreSQL and ensure command-line tools are available.');
    process.exit(1);
  }

  const version = execOutput('psql --version') || execOutput('pg_isready --version') || 'PostgreSQL tools detected';
  log.success(version);
}
