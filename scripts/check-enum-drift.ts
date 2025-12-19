// scripts/check-enum-drift.ts
// Finds strings that look like enum values but don't exist in Prisma schema
// Run: npx tsx scripts/check-enum-drift.ts
// Optional: npx tsx scripts/check-enum-drift.ts --json enum-drift.json

import fs from 'node:fs/promises';
import path from 'node:path';

type EnumMap = Record<string, Set<string>>;

const DEFAULT_SCAN_DIRS = ['src', 'scripts', 'tests', 'Docs', 'prisma'];
const DEFAULT_EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.md', '.sql']);

function parseArgs() {
    const args = process.argv.slice(2);
    const out: { json?: string; schema?: string; dirs?: string[] } = {};
    for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (a === '--json') out.json = args[++i];
        else if (a === '--schema') out.schema = args[++i];
        else if (a === '--dirs') out.dirs = args[++i].split(',').map(s => s.trim()).filter(Boolean);
    }
    return out;
}

function parsePrismaEnums(schemaText: string): EnumMap {
    const enums: EnumMap = {};
    const enumRe = /enum\s+(\w+)\s*\{([\s\S]*?)\}/g;

    for (const m of schemaText.matchAll(enumRe)) {
        const name = m[1];
        const body = m[2];
        const values = new Set<string>();

        for (const line of body.split('\n')) {
            const cleaned = line.replace(/\/\/.*$/, '').trim();
            if (!cleaned) continue;
            const token = cleaned.split(/\s+/)[0];
            if (/^[A-Z][A-Z0-9_]*$/.test(token)) values.add(token);
        }

        if (values.size > 0) enums[name] = values;
    }

    return enums;
}

async function walk(dir: string, files: string[] = []) {
    let entries: any[] = [];
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
        return files;
    }

    for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (e.name === 'node_modules' || e.name === '.next' || e.name === '.git') continue;
            await walk(p, files);
        } else {
            const ext = path.extname(e.name);
            if (DEFAULT_EXTS.has(ext)) files.push(p);
        }
    }
    return files;
}

// Levenshtein distance for suggestions
function levenshtein(a: string, b: string) {
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
        }
    }
    return dp[a.length][b.length];
}

function getLine(text: string, index: number) {
    return text.slice(0, index).split('\n').length;
}

async function main() {
    const args = parseArgs();
    const schemaPath = args.schema ?? path.join(process.cwd(), 'prisma', 'schema.prisma');
    const scanDirs = args.dirs ?? DEFAULT_SCAN_DIRS;

    console.log('🔍 ENUM DRIFT CHECKER');
    console.log('='.repeat(50));
    console.log(`Schema: ${schemaPath}`);
    console.log(`Scanning: ${scanDirs.join(', ')}`);
    console.log('');

    const schemaText = await fs.readFile(schemaPath, 'utf8');
    const enums = parsePrismaEnums(schemaText);

    console.log(`Found ${Object.keys(enums).length} enums in schema:`);
    for (const [name, values] of Object.entries(enums)) {
        console.log(`  ${name}: ${values.size} values`);
    }
    console.log('');

    const allEnumValues = new Set<string>();
    for (const s of Object.values(enums)) for (const v of s) allEnumValues.add(v);

    // Only look at "enum-like" strings: ALL_CAPS_WITH_UNDERSCORE
    const tokenRe = /['""`]([A-Z][A-Z0-9_]{2,})['""`]/g;

    const files: string[] = [];
    for (const d of scanDirs) await walk(path.join(process.cwd(), d), files);

    console.log(`Scanning ${files.length} files...`);

    const issues: any[] = [];

    for (const f of files) {
        const text = await fs.readFile(f, 'utf8');
        for (const m of text.matchAll(tokenRe)) {
            const token = m[1];

            // Reduce noise: require underscore (typical enum style in this repo)
            if (!token.includes('_')) continue;

            // Skip if it's a valid enum value
            if (allEnumValues.has(token)) continue;

            // Find best suggestion
            let best: { val: string; dist: number } | null = null;
            for (const v of allEnumValues) {
                // Quick filter: same first letter and share a chunk
                if (v[0] !== token[0]) continue;
                const d = levenshtein(token, v);
                if (!best || d < best.dist) best = { val: v, dist: d };
            }

            // Only report if it's "close enough" to likely be a typo/drift
            if (best && best.dist <= 5) {
                issues.push({
                    file: path.relative(process.cwd(), f),
                    line: getLine(text, m.index ?? 0),
                    found: token,
                    suggested: best.val,
                    distance: best.dist,
                });
            }
        }
    }

    if (args.json) {
        await fs.writeFile(args.json, JSON.stringify({ schemaPath, enums: Object.keys(enums), issues }, null, 2), 'utf8');
        console.log(`\nWrote ${args.json}`);
    }

    console.log('');
    console.log('='.repeat(50));

    if (issues.length === 0) {
        console.log('✅ Enum drift check: OK (no suspicious enum-like strings found)');
        process.exit(0);
    }

    console.log(`❌ Enum drift check: found ${issues.length} issue(s)\n`);
    for (const i of issues.slice(0, 50)) {
        console.log(`- ${i.file}:${i.line}  "${i.found}"  →  maybe "${i.suggested}"`);
    }
    if (issues.length > 50) console.log(`...and ${issues.length - 50} more`);

    process.exit(1);
}

main().catch((e) => {
    console.error(e);
    process.exit(2);
});
