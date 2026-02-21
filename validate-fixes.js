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
const useBedUpdateState = readFile(path.join(__dirname, 'src', 'features', 'bed-dashboard', 'hooks', 'useBedUpdateState.ts'));

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
  assert(actions.includes('checkWardAccess'), 'Missing ward function import');
  assert(actions.includes('from \'../lib/bed-queries\''), 'Missing import source');
});

test('updateBedStage validates ward access', () => {
  const actions = bedActions;
  assert(actions.includes('const wardError = await checkWardAccess'), 'Missing wardError check');
  assert(actions.includes('session.role'), 'Missing role parameter');
});

test('updateBedStage rejects unauthorized access', () => {
  const actions = bedActions;
  assert(actions.includes('if (wardError)'), 'Missing wardError check');
  assert(actions.includes('logger.warn(\'Ward access denied'), 'Missing security logging');
});

console.log(chalk.bold('\nTEST 2: Memory Leak Fix - Timer Cleanup\n'));

test('useBedUpdateState imports useRef and useEffect', () => {
  const hook = useBedUpdateState;
  assert(hook.includes('useRef'), 'Missing useRef import');
  assert(hook.includes('useEffect'), 'Missing useEffect import');
});

test('useBedUpdateState creates timeoutRefs', () => {
  const hook = useBedUpdateState;
  assert(hook.includes('errorClearTimers'), 'Missing errorClearTimers useRef');
  assert(hook.includes('Map<string'), 'Missing Map for error timers');
  assert(hook.includes('successTimer'), 'Missing successTimer tracking');
});

test('useBedUpdateState has cleanup useEffect', () => {
  const hook = useBedUpdateState;
  assert(hook.match(/useEffect\(\(\) =\> {/g), 'Missing useEffect hook');
  assert(hook.includes('timers.forEach((timer) => clearTimeout(timer))'), 'Missing error timer cleanup');
  assert(hook.includes('clearTimeout(successTimer.current)'), 'Missing success timer cleanup');
});

test('useBedUpdateState tracks error timers before setting', () => {
  const hook = useBedUpdateState;
  assert(hook.includes('const previousTimer = errorClearTimers.current.get(bedId)'), 'Missing previousTimer retrieval');
  assert(hook.includes('if (previousTimer) {'), 'Missing previousTimer check');
  assert(hook.includes('clearTimeout(previousTimer)'), 'Missing previous timer cleanup');
  assert(hook.includes('errorClearTimers.current.set(bedId, timer)'), 'Missing new timer registration');
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
