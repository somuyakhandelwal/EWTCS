const fs = require('fs');
const readline = require('readline');

const filesToProcess = fs.readFileSync('hardcoded_files.txt', 'utf8').split('\n').filter(Boolean);

const replacements = [
    // Backgrounds
    { regex: /bg-zinc-950(\/[0-9]+)?/g, replace: 'bg-card' },
    { regex: /bg-zinc-900(\/[0-9]+)?/g, replace: 'bg-card' },
    { regex: /bg-zinc-800(\/[0-9]+)?/g, replace: 'bg-muted' },
    { regex: /bg-black(\/[0-9]+)?/g, replace: 'bg-background' },
    { regex: /bg-white(\/[0-9]+)?/g, replace: 'bg-foreground' },

    // Borders
    { regex: /border-zinc-800(\/[0-9]+)?/g, replace: 'border-border' },
    { regex: /border-zinc-700(\/[0-9]+)?/g, replace: 'border-border' },
    { regex: /border-zinc-900(\/[0-9]+)?/g, replace: 'border-border' },
    { regex: /border-white(\/[0-9]+)?/g, replace: 'border-border' },

    // Text colors
    { regex: /text-zinc-500/g, replace: 'text-muted-foreground' },
    { regex: /text-zinc-400/g, replace: 'text-muted-foreground' },
    { regex: /text-zinc-300/g, replace: 'text-card-foreground' },
    { regex: /text-zinc-200/g, replace: 'text-card-foreground' },
    { regex: /text-zinc-100/g, replace: 'text-foreground' },
    { regex: /text-white/g, replace: 'text-foreground' },
    { regex: /text-black/g, replace: 'text-background' }
];

let filesModified = 0;

for (const filePath of filesToProcess) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let originalContent = content;

        for (const rule of replacements) {
            content = content.replace(rule.regex, rule.replace);
        }

        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            filesModified++;
        }
    } catch (err) {
        console.error(`Error processing ${filePath}:`, err);
    }
}

console.log(`Successfully modified ${filesModified} files.`);
