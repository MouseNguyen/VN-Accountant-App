// scripts/fix-api-decimal-serialization.ts
// Script to add serializeDecimals to all API routes

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

// Get all route.ts files
const output = execSync('Get-ChildItem -Path "src/app/api" -Filter "route.ts" -Recurse | Select-Object -ExpandProperty FullName', {
    shell: 'powershell.exe',
    encoding: 'utf-8'
});

const files = output.trim().split('\n').map(f => f.trim()).filter(Boolean);

console.log(`Found ${files.length} API route files\n`);

let fixedCount = 0;
let skippedCount = 0;
const errors: string[] = [];

for (const filePath of files) {
    try {
        const content = readFileSync(filePath, 'utf-8');

        // Skip if already has serializeDecimals
        if (content.includes('serializeDecimals')) {
            console.log(`⏭️  ${filePath.replace(process.cwd(), '')} - already has serializeDecimals`);
            skippedCount++;
            continue;
        }

        // Skip auth routes (they don't return Decimal data)
        if (filePath.includes('\\auth\\')) {
            console.log(`⏭️  ${filePath.replace(process.cwd(), '')} - auth route, skipping`);
            skippedCount++;
            continue;
        }

        // Find NextResponse.json calls with data
        const hasDataReturn = /NextResponse\.json\(\s*\{\s*success:\s*true,\s*data:/g.test(content);

        if (!hasDataReturn) {
            console.log(`⏭️  ${filePath.replace(process.cwd(), '')} - no data return pattern`);
            skippedCount++;
            continue;
        }

        // Add import if not exists
        let newContent = content;
        if (!content.includes("from '@/lib/api-utils'")) {
            // Find last import line
            const importMatch = content.match(/^import .+ from ['"][^'"]+['"];?\s*$/gm);
            if (importMatch) {
                const lastImport = importMatch[importMatch.length - 1];
                newContent = content.replace(
                    lastImport,
                    `${lastImport}\nimport { serializeDecimals } from '@/lib/api-utils';`
                );
            }
        }

        // Replace data: result with data: serializeDecimals(result)
        // Pattern: data: someVariable (where not already wrapped)
        newContent = newContent.replace(
            /(\s*data:\s*)([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)(\s*[,}])/g,
            (match, prefix, variable, suffix) => {
                if (variable === 'serializeDecimals' || match.includes('serializeDecimals(')) {
                    return match; // Already wrapped
                }
                return `${prefix}serializeDecimals(${variable})${suffix}`;
            }
        );

        if (newContent !== content) {
            writeFileSync(filePath, newContent);
            console.log(`✅ ${filePath.replace(process.cwd(), '')} - fixed`);
            fixedCount++;
        } else {
            console.log(`⏭️  ${filePath.replace(process.cwd(), '')} - no changes needed`);
            skippedCount++;
        }
    } catch (error) {
        errors.push(`${filePath}: ${error}`);
        console.log(`❌ ${filePath.replace(process.cwd(), '')} - error`);
    }
}

console.log('\n========================================');
console.log('SUMMARY');
console.log('========================================');
console.log(`Fixed: ${fixedCount}`);
console.log(`Skipped: ${skippedCount}`);
console.log(`Errors: ${errors.length}`);

if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  - ${e}`));
}
