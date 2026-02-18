'use strict';

const fs = require('fs');
const path = require('path');
const { log } = require('./lib-logger');

const REQUIRED_KEYS = [
  'DATABASE_URL',
  'SESSION_SECRET',
  'NEXT_PUBLIC_APP_URL',
  'NODE_ENV',
];

function readEnvExample() {
  const filePath = path.resolve(process.cwd(), '.env.example');
  if (!fs.existsSync(filePath)) {
    throw new Error('.env.example not found');
  }
  return fs.readFileSync(filePath, 'utf-8');
}

function extractKeys(content) {
  const keys = new Set();
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    const match = trimmed.match(/^([A-Z0-9_]+)\s*=/);
    if (match) {
      keys.add(match[1]);
    }
  });
  return keys;
}

function validateRequiredKeys(keys) {
  const missing = REQUIRED_KEYS.filter((key) => !keys.has(key));
  if (missing.length > 0) {
    throw new Error(`Missing required keys in .env.example: ${missing.join(', ')}`);
  }
}

function run() {
  log.header('Environment Template Validation');
  log.step(1, 'Checking .env.example...');

  const content = readEnvExample();
  const keys = extractKeys(content);
  validateRequiredKeys(keys);

  log.success('.env.example contains all required keys');
}

try {
  run();
} catch (error) {
  log.error(error.message);
  process.exit(1);
}
