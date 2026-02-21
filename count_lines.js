const fs = require('fs');
const path = require('path');

let checked = 0;
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
                console.log(`${fullPath}: ${lines}`);
            }
        }
    }
}

countLines(process.argv[2] || '.');
console.log(`Checked ${checked} files.`);
