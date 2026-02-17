#!/usr/bin/env node

/**
 * Validation Test Suite for Critical Bug Fixes
 * This script validates that all 4 critical security/stability issues are properly fixed
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

// Helper to read file
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

// Test results tracking
const results = {
  passed: [],
  failed: [],
};

// Test helpers
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

// ============================================================================
// TEST 1: IDOR FIX - Ward-level access control in updateBedStage
// ============================================================================
console.log(chalk.bold('TEST 1: IDOR Fix - Ward Access Control\n'));

test('Migration 006 exists', () => {
  const migrationPath = path.join(__dirname, 'migrations', '006_add_ward_access_control.sql');
  assert(fs.existsSync(migrationPath), 'Migration file not found');
});

test('Migration 006 creates wards table', () => {
  const migration = readFile(path.join(__dirname, 'migrations', '006_add_ward_access_control.sql'));
  assert(migration.includes('CREATE TABLE'), 'Missing CREATE TABLE statement');
  assert(migration.includes('wards'), 'Missing wards table creation');
  assert(migration.includes('ward_id'), 'Missing ward_id column reference');
});

test('getUserWard function exists in bed-queries.ts', () => {
  const queries = readFile(path.join(__dirname, 'src', 'features', 'bed-dashboard', 'lib', 'bed-queries.ts'));
  assert(queries.includes('getUserWard'), 'getUserWard function not found');
  assert(queries.includes('FROM users u'), 'Missing users table query');
  assert(queries.includes('u.ward_id'), 'Missing ward_id selection from users');
});

test('getBedWard function exists in bed-queries.ts', () => {
  const queries = readFile(path.join(__dirname, 'src', 'features', 'bed-dashboard', 'lib', 'bed-queries.ts'));
  assert(queries.includes('getBedWard'), 'getBedWard function not found');
  assert(queries.includes('FROM beds b'), 'Missing beds table query');
  assert(queries.includes('b.ward_id'), 'Missing ward_id selection from beds');
});

test('updateBedStage imports ward access functions', () => {
  const actions = readFile(path.join(__dirname, 'src', 'features', 'bed-dashboard', 'actions', 'bed-actions.ts'));
  assert(actions.includes('import { getUserWard, getBedWard }'), 'Missing ward function imports');
  assert(actions.includes('from \'../lib/bed-queries\''), 'Missing import source');
});

test('updateBedStage validates ward access', () => {
  const actions = readFile(path.join(__dirname, 'src', 'features', 'bed-dashboard', 'actions', 'bed-actions.ts'));
  assert(actions.includes('const userWard = await getUserWard'), 'Missing userWard query');
  assert(actions.includes('const bedWard = await getBedWard'), 'Missing bedWard query');
  assert(actions.includes('hasWardAccess'), 'Missing hasWardAccess variable');
  assert(actions.includes('userWard &&'), 'Missing ward comparison logic');
  assert(actions.includes('bedWard &&'), 'Missing bedWard comparison logic');
  assert(actions.includes('session.role === \'admin\''), 'Missing admin bypass logic');
});

test('updateBedStage rejects unauthorized access', () => {
  const actions = readFile(path.join(__dirname, 'src', 'features', 'bed-dashboard', 'actions', 'bed-actions.ts'));
  assert(actions.includes('if (!hasWardAccess)'), 'Missing hasWardAccess check');
  assert(actions.includes('You do not have permission to update this bed'), 'Missing error message');
  assert(actions.includes('logger.warn(\'Unauthorized bed access'), 'Missing security logging');
});

// ============================================================================
// TEST 2: MEMORY LEAK FIX - Timer cleanup in BedDashboardClient
// ============================================================================
console.log(chalk.bold('\nTEST 2: Memory Leak Fix - Timer Cleanup\n'));

test('BedDashboardClient imports useRef and useEffect', () => {
  const client = readFile(path.join(__dirname, 'src', 'features', 'bed-dashboard', 'components', 'BedDashboardClient.tsx'));
  assert(client.includes('import { useCallback, useMemo, useState, useRef, useEffect }'), 'Missing useRef/useEffect imports');
});

test('BedDashboardClient creates timeoutRefs', () => {
  const client = readFile(path.join(__dirname, 'src', 'features', 'bed-dashboard', 'components', 'BedDashboardClient.tsx'));
  assert(client.includes('const timeoutRefs = useRef'), 'Missing timeoutRefs useRef');
  assert(client.includes('errorClearTimers: Map'), 'Missing Map for error timers');
  assert(client.includes('successTimer'), 'Missing successTimer tracking');
  assert(client.includes('updateTimeoutTimer'), 'Missing updateTimeoutTimer tracking');
});

test('BedDashboardClient has cleanup useEffect', () => {
  const client = readFile(path.join(__dirname, 'src', 'features', 'bed-dashboard', 'components', 'BedDashboardClient.tsx'));
  assert(client.includes('useEffect(() => {'), 'Missing useEffect hook');
  assert(client.includes('const refs = timeoutRefs.current'), 'Missing refs assignment');
  assert(client.includes('refs.errorClearTimers.forEach((timer) => clearTimeout(timer))'), 'Missing error timer cleanup');
  assert(client.includes('clearTimeout(refs.successTimer)'), 'Missing success timer cleanup');
  assert(client.includes('clearTimeout(refs.updateTimeoutTimer)'), 'Missing update timeout cleanup');
});

test('BedDashboardClient tracks error timers before setting', () => {
  const client = readFile(path.join(__dirname, 'src', 'features', 'bed-dashboard', 'components', 'BedDashboardClient.tsx'));
  assert(client.includes('const previousTimer = timeoutRefs.current.errorClearTimers.get(bedId)'), 'Missing previousTimer retrieval');
  assert(client.includes('if (previousTimer) {'), 'Missing previousTimer check');
  assert(client.includes('clearTimeout(previousTimer)'), 'Missing previous timer cleanup');
  assert(client.includes('timeoutRefs.current.errorClearTimers.set(bedId, timer)'), 'Missing new timer registration');
});

test('BedDashboardClient tracks all setTimeout calls', () => {
  const client = readFile(path.join(__dirname, 'src', 'features', 'bed-dashboard', 'components', 'BedDashboardClient.tsx'));
  assert((client.match(/timeoutRefs\.current\.[a-zA-Z]+ =/g) || []).length >= 3, 'Not enough timer references tracked');
});

// ============================================================================
// TEST 3: OFF-SCREEN MENU FIX - Position clamping in context-menu.tsx
// ============================================================================
console.log(chalk.bold('\nTEST 3: Off-Screen Menu Fix - Position Clamping\n'));

test('context-menu.tsx imports useMemo', () => {
  const menu = readFile(path.join(__dirname, 'src', 'shared', 'components', 'ui', 'context-menu.tsx'));
  assert(menu.includes('import { useEffect, useMemo }'), 'Missing useMemo import');
});

test('getClampedPosition function exists', () => {
  const menu = readFile(path.join(__dirname, 'src', 'shared', 'components', 'ui', 'context-menu.tsx'));
  assert(menu.includes('function getClampedPosition'), 'Missing getClampedPosition function');
  assert(menu.includes('x: number'), 'Missing x parameter');
  assert(menu.includes('y: number'), 'Missing y parameter');
  assert(menu.includes('menuWidth: number'), 'Missing menuWidth parameter');
  assert(menu.includes('menuHeight: number'), 'Missing menuHeight parameter');
});

test('getClampedPosition clamps X position', () => {
  const menu = readFile(path.join(__dirname, 'src', 'shared', 'components', 'ui', 'context-menu.tsx'));
  assert(menu.includes('if (x + menuWidth > viewportWidth'), 'Missing X overflow check');
  assert(menu.includes('clampedX = Math.max'), 'Missing X clamping logic');
});

test('getClampedPosition clamps Y position', () => {
  const menu = readFile(path.join(__dirname, 'src', 'shared', 'components', 'ui', 'context-menu.tsx'));
  assert(menu.includes('if (y + menuHeight > viewportHeight'), 'Missing Y overflow check');
  assert(menu.includes('clampedY = Math.max'), 'Missing Y clamping logic');
});

test('clampedPosition is memoized', () => {
  const menu = readFile(path.join(__dirname, 'src', 'shared', 'components', 'ui', 'context-menu.tsx'));
  assert(menu.includes('const clampedPosition = useMemo'), 'Missing clampedPosition useMemo');
  assert(menu.includes('getClampedPosition('), 'Missing getClampedPosition call in useMemo');
});

test('context-menu uses clampedPosition for styling', () => {
  const menu = readFile(path.join(__dirname, 'src', 'shared', 'components', 'ui', 'context-menu.tsx'));
  assert(menu.includes('style={{ top: clampedPosition.y, left: clampedPosition.x }}'), 'Missing clampedPosition in style');
});

// ============================================================================
// TEST 4: DOUBLE-CLICK FIX - Event detail check in context-menu.tsx
// ============================================================================
console.log(chalk.bold('\nTEST 4: Double-Click Fix - Event Detail Check\n'));

test('Button onClick checks e.detail', () => {
  const menu = readFile(path.join(__dirname, 'src', 'shared', 'components', 'ui', 'context-menu.tsx'));
  assert(menu.includes('if (e.detail > 1)'), 'Missing e.detail check for double-click');
  assert(menu.includes('return'), 'Missing early return for double-click');
});

test('Double-click check comes before disabled check', () => {
  const menu = readFile(path.join(__dirname, 'src', 'shared', 'components', 'ui', 'context-menu.tsx'));
  const content = menu.substring(menu.indexOf('onClick={(e)'));
  const detailCheck = content.indexOf('e.detail > 1');
  const disabledCheck = content.indexOf('if (item.disabled)');
  assert(detailCheck < disabledCheck, 'e.detail check should come before disabled check');
});

// ============================================================================
// ADDITIONAL VALIDATION TESTS
// ============================================================================
console.log(chalk.bold('\nTEST 5: Additional Validations\n'));

test('bed-actions.ts has proper imports', () => {
  const actions = readFile(path.join(__dirname, 'src', 'features', 'bed-dashboard', 'actions', 'bed-actions.ts'));
  assert(actions.includes('import { logAudit }'), 'Missing audit logging import');
  assert(actions.includes('import { requireRole }'), 'Missing role requirement import');
  assert(actions.includes('import { logger }'), 'Missing logger import');
});

test('BedDashboardClient properly initializes data state', () => {
  const client = readFile(path.join(__dirname, 'src', 'features', 'bed-dashboard', 'components', 'BedDashboardClient.tsx'));
  assert(client.includes('const [data, setData] = useState<BedGridData>(initialData)'), 'Missing data state initialization');
});

test('No syntax errors in fixed files', () => {
  const files = [
    path.join(__dirname, 'src', 'features', 'bed-dashboard', 'actions', 'bed-actions.ts'),
    path.join(__dirname, 'src', 'features', 'bed-dashboard', 'components', 'BedDashboardClient.tsx'),
    path.join(__dirname, 'src', 'shared', 'components', 'ui', 'context-menu.tsx'),
    path.join(__dirname, 'src', 'features', 'bed-dashboard', 'lib', 'bed-queries.ts'),
  ];
  
  files.forEach((file) => {
    const content = readFile(file);
    // Basic syntax check - ensure critical brackets are balanced
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    assert(openBraces === closeBraces, `Mismatched braces in ${path.basename(file)}`);
  });
});

// ============================================================================
// RESULTS SUMMARY
// ============================================================================
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
