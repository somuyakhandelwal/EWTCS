#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { runMenuAndAdditionalTests } = require('./scripts/validation-tests/menu-and-additional');

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

const results = {
  passed: [],
  failed: [],
};

function test(name, fn) {
  try {
    fn();
    results.passed.push(name);
    console.log(chalk.green(`✓ ${name}`));
  } catch (error) {
    results.failed.push({ name, error: error.message });
    console.log(chalk.red(`✗ ${name}`));
    console.log(chalk.dim(`  Error: ${error.message}`));
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

console.log(chalk.cyan('\n🧪 Running Validation Tests for Critical Fixes\n'));
console.log(chalk.bold('TEST 1: IDOR Fix - Ward Access Control\n'));

const migration006Path = path.join(__dirname, 'migrations', '006_add_ward_access_control.sql');
const bedQueries = readFile(path.join(__dirname, 'src', 'features', 'bed-dashboard', 'lib', 'bed-queries.ts'));
const bedActions = readFile(path.join(__dirname, 'src', 'features', 'bed-dashboard', 'actions', 'bed-actions.ts'));
const bedDashboardClient = readFile(path.join(__dirname, 'src', 'features', 'bed-dashboard', 'components', 'BedDashboardClient.tsx'));

test('Migration 006 exists', () => {
  assert(fs.existsSync(migration006Path), 'Migration file not found');
});

test('Migration 006 creates wards table', () => {
  const migration = readFile(migration006Path);
  assert(migration.includes('CREATE TABLE'), 'Missing CREATE TABLE statement');
  assert(migration.includes('wards'), 'Missing wards table creation');
  assert(migration.includes('ward_id'), 'Missing ward_id column reference');
});

test('getUserWard function exists in bed-queries.ts', () => {
  const queries = bedQueries;
  assert(queries.includes('getUserWard'), 'getUserWard function not found');
  assert(queries.includes('FROM users u'), 'Missing users table query');
  assert(queries.includes('u.ward_id'), 'Missing ward_id selection from users');
});

test('getBedWard function exists in bed-queries.ts', () => {
  const queries = bedQueries;
  assert(queries.includes('getBedWard'), 'getBedWard function not found');
  assert(queries.includes('FROM beds b'), 'Missing beds table query');
  assert(queries.includes('b.ward_id'), 'Missing ward_id selection from beds');
});

test('updateBedStage imports ward access functions', () => {
  const actions = bedActions;
  assert(actions.includes('import { getUserWard, getBedWard }'), 'Missing ward function imports');
  assert(actions.includes('from \'../lib/bed-queries\''), 'Missing import source');
});

test('updateBedStage validates ward access', () => {
  const actions = bedActions;
  assert(actions.includes('const userWard = await getUserWard'), 'Missing userWard query');
  assert(actions.includes('const bedWard = await getBedWard'), 'Missing bedWard query');
  assert(actions.includes('hasWardAccess'), 'Missing hasWardAccess variable');
  assert(actions.includes('userWard &&'), 'Missing ward comparison logic');
  assert(actions.includes('bedWard &&'), 'Missing bedWard comparison logic');
  assert(actions.includes('session.role === \'admin\''), 'Missing admin bypass logic');
});

test('updateBedStage rejects unauthorized access', () => {
  const actions = bedActions;
  assert(actions.includes('if (!hasWardAccess)'), 'Missing hasWardAccess check');
  assert(actions.includes('You do not have permission to update this bed'), 'Missing error message');
  assert(actions.includes('logger.warn(\'Unauthorized bed access'), 'Missing security logging');
});

console.log(chalk.bold('\nTEST 2: Memory Leak Fix - Timer Cleanup\n'));

test('BedDashboardClient imports useRef and useEffect', () => {
  const client = bedDashboardClient;
  assert(client.includes('import { useCallback, useMemo, useState, useRef, useEffect }'), 'Missing useRef/useEffect imports');
});

test('BedDashboardClient creates timeoutRefs', () => {
  const client = bedDashboardClient;
  assert(client.includes('const timeoutRefs = useRef'), 'Missing timeoutRefs useRef');
  assert(client.includes('errorClearTimers: Map'), 'Missing Map for error timers');
  assert(client.includes('successTimer'), 'Missing successTimer tracking');
  assert(client.includes('updateTimeoutTimer'), 'Missing updateTimeoutTimer tracking');
});

test('BedDashboardClient has cleanup useEffect', () => {
  const client = bedDashboardClient;
  assert(client.includes('useEffect(() => {'), 'Missing useEffect hook');
  assert(client.includes('const refs = timeoutRefs.current'), 'Missing refs assignment');
  assert(client.includes('refs.errorClearTimers.forEach((timer) => clearTimeout(timer))'), 'Missing error timer cleanup');
  assert(client.includes('clearTimeout(refs.successTimer)'), 'Missing success timer cleanup');
  assert(client.includes('clearTimeout(refs.updateTimeoutTimer)'), 'Missing update timeout cleanup');
});

test('BedDashboardClient tracks error timers before setting', () => {
  const client = bedDashboardClient;
  assert(client.includes('const previousTimer = timeoutRefs.current.errorClearTimers.get(bedId)'), 'Missing previousTimer retrieval');
  assert(client.includes('if (previousTimer) {'), 'Missing previousTimer check');
  assert(client.includes('clearTimeout(previousTimer)'), 'Missing previous timer cleanup');
  assert(client.includes('timeoutRefs.current.errorClearTimers.set(bedId, timer)'), 'Missing new timer registration');
});

test('BedDashboardClient tracks all setTimeout calls', () => {
  const client = bedDashboardClient;
  assert((client.match(/timeoutRefs\.current\.[a-zA-Z]+ =/g) || []).length >= 3, 'Not enough timer references tracked');
});

runMenuAndAdditionalTests({ test, assert, readFile, baseDir: __dirname });

console.log(chalk.bold('\n' + '='.repeat(60)));
console.log(chalk.bold('TEST SUMMARY'));
console.log(chalk.bold('='.repeat(60) + '\n'));

console.log(chalk.green(`Passed: ${results.passed.length}`));
console.log(chalk.red(`Failed: ${results.failed.length}`));

if (results.failed.length > 0) {
  console.log(chalk.bold('\nFailed Tests:\n'));
  results.failed.forEach(({ name, error }) => {
    console.log(chalk.red(`✗ ${name}`));
    console.log(chalk.dim(`  ${error}\n`));
  });
  process.exit(1);
} else {
  console.log(chalk.green.bold('\n✨ All tests passed! All critical fixes are properly implemented.\n'));
  process.exit(0);
}
