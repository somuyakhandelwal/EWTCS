const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file).replace(/\\/g, '/'));
        }
    });
    return arrayOfFiles;
}

const allFiles = getAllFiles('./src', []);
const fileMap = new Map();
allFiles.forEach(f => {
    const normalized = f.replace(/^\.\//, '');
    fileMap.set(normalized.toLowerCase(), normalized);
});

console.log(`Checking ${allFiles.length} files...`);

let errors = 0;
allFiles.forEach(f => {
    if (!f.endsWith('.ts') && !f.endsWith('.tsx')) return;
    const content = fs.readFileSync(f, 'utf8');
    const importRegex = /(?:import|export).*?from\s+['"](.*?)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        let importPath = match[1];
        let mappedPath;
        if (importPath.startsWith('@/')) {
            mappedPath = importPath.replace('@/', 'src/');
        } else if (importPath.startsWith('.')) {
            mappedPath = path.join(path.dirname(f), importPath).replace(/\\/g, '/');
        } else {
            continue;
        }

        const extensions = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];
        let found = false;
        for (const ext of extensions) {
            const checkPath = (mappedPath + ext).toLowerCase();
            if (fileMap.has(checkPath)) {
                const actualPath = fileMap.get(checkPath);
                const expectedPart = (mappedPath + ext);
                if (actualPath !== expectedPart && actualPath.toLowerCase() === expectedPart.toLowerCase()) {
                    console.log(`❌ Casing mismatch in ${f}:`);
                    console.log(`   Import: ${expectedPart}`);
                    console.log(`   Actual: ${actualPath}`);
                    errors++;
                }
                found = true;
                break;
            }
        }
    }
});

if (errors === 0) {
    console.log('✅ No casing mismatches found in @/ imports.');
} else {
    console.log(`Total errors: ${errors}`);
}
