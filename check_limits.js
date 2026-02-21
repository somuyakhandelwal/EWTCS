const fs = require('fs');
const path = require('path');

let checked = 0;
const overLimit = [];

function countLines(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === '.next') continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            countLines(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.sql')) {
            checked++;
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split(/\r?\n/).length;
            if (lines > 200) {
                overLimit.push(`${fullPath}: ${lines} lines`);
            }
        }
    }
}

countLines('.');
console.log('--- LINE COUNT CHECK ---');
console.log(`Checked ${checked} files.`);
if (overLimit.length === 0) {
    console.log('✅ All files are under 200 lines!');
} else {
    console.log('❌ The following files exceed 200 lines:');
    overLimit.forEach(f => console.log(f));
}
