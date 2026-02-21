const path = require('path');

function runMenuAndAdditionalTests({ test, assert, readFile, baseDir }) {
  const contextMenu = readFile(path.join(baseDir, 'src', 'shared', 'components', 'ui', 'context-menu.tsx'));
  const bedActions = readFile(path.join(baseDir, 'src', 'features', 'bed-dashboard', 'actions', 'bed-actions.ts'));
  const useBedUpdateState = readFile(path.join(baseDir, 'src', 'features', 'bed-dashboard', 'hooks', 'useBedUpdateState.ts'));
  const useBedStageUpdate = readFile(path.join(baseDir, 'src', 'features', 'bed-dashboard', 'hooks', 'useBedStageUpdate.ts'));

  console.log('\nTEST 3: Off-Screen Menu Fix - Position Clamping\n');

  test('context-menu.tsx imports useMemo', () => {
    assert(contextMenu.includes('useMemo'), 'Missing useMemo import');
  });

  test('getClampedPosition function exists', () => {
    assert(contextMenu.includes('function getClampedPosition'), 'Missing getClampedPosition function');
    assert(contextMenu.includes('x: number'), 'Missing x parameter');
    assert(contextMenu.includes('y: number'), 'Missing y parameter');
    assert(contextMenu.includes('menuWidth: number'), 'Missing menuWidth parameter');
    assert(contextMenu.includes('menuHeight: number'), 'Missing menuHeight parameter');
  });

  test('getClampedPosition clamps X position', () => {
    assert(contextMenu.includes('if (x + menuWidth > viewportWidth'), 'Missing X overflow check');
    assert(contextMenu.includes('clampedX = Math.max'), 'Missing X clamping logic');
  });

  test('getClampedPosition clamps Y position', () => {
    assert(contextMenu.includes('if (y + menuHeight > viewportHeight'), 'Missing Y overflow check');
    assert(contextMenu.includes('clampedY = Math.max'), 'Missing Y clamping logic');
  });

  test('clampedPosition is memoized', () => {
    assert(contextMenu.includes('const clampedPosition = useMemo'), 'Missing clampedPosition useMemo');
    assert(contextMenu.includes('getClampedPosition('), 'Missing getClampedPosition call in useMemo');
  });

  test('context-menu uses clampedPosition for styling', () => {
    assert(contextMenu.includes('style={{ top: clampedPosition.y, left: clampedPosition.x }}'), 'Missing clampedPosition in style');
  });

  console.log('\nTEST 4: Double-Click Fix - Event Detail Check\n');

  test('Button onClick checks e.detail', () => {
    assert(contextMenu.includes('if (e.detail > 1)'), 'Missing e.detail check for double-click');
    assert(contextMenu.includes('return'), 'Missing early return for double-click');
  });

  test('Double-click check comes before disabled check', () => {
    const content = contextMenu.substring(contextMenu.indexOf('onClick={(e)'));
    const detailCheck = content.indexOf('e.detail > 1');
    const disabledCheck = content.indexOf('if (item.disabled)');
    assert(detailCheck < disabledCheck, 'e.detail check should come before disabled check');
  });

  console.log('\nTEST 5: Additional Validations\n');

  test('bed-actions.ts has proper imports', () => {
    assert(bedActions.includes('logAudit'), 'Missing audit logging import');
    assert(bedActions.includes('requireWriteRole'), 'Missing role requirement import');
    assert(bedActions.includes('logger'), 'Missing logger import');
  });

  test('useBedStageUpdate properly initializes data state', () => {
    assert(useBedStageUpdate.includes('const [data, setData] = useState<BedGridData>(initialData)'), 'Missing data state initialization');
  });

  test('useBedUpdateState creates timeoutRefs', () => {
    assert(useBedUpdateState.includes('errorClearTimers'), 'Missing errorClearTimers useRef');
    assert(useBedUpdateState.includes('Map<string'), 'Missing Map for error timers');
    assert(useBedUpdateState.includes('successTimer'), 'Missing successTimer tracking');
  });

  test('No syntax errors in fixed files', () => {
    const files = [
      path.join(baseDir, 'src', 'features', 'bed-dashboard', 'actions', 'bed-actions.ts'),
      path.join(baseDir, 'src', 'features', 'bed-dashboard', 'hooks', 'useBedUpdateState.ts'),
      path.join(baseDir, 'src', 'shared', 'components', 'ui', 'context-menu.tsx'),
      path.join(baseDir, 'src', 'features', 'bed-dashboard', 'lib', 'bed-queries.ts'),
    ];

    files.forEach((file) => {
      const content = readFile(file);
      const openBraces = (content.match(/{/g) || []).length;
      const closeBraces = (content.match(/}/g) || []).length;
      assert(openBraces === closeBraces, `Mismatched braces in ${path.basename(file)}`);
    });
  });
}

module.exports = { runMenuAndAdditionalTests };