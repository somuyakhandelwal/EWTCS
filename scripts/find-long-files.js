const fs = require('fs');
const path = require('path');

function getFiles(dir, allFiles = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const name = path.join(dir, file);
        if (fs.statSync(name).isDirectory()) {
            if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
                getFiles(name, allFiles);
            }
        } else {
            if (name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.js') || name.endsWith('.jsx') || name.endsWith('.mjs')) {
                allFiles.push(name);
            }
        }
    }
    return allFiles;
}

const srcDir = path.join(process.cwd(), 'src');
const files = getFiles(srcDir);

for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n').length;
    if (lines > 200) {
        console.log(`${file}: ${lines}`);
    }
}
