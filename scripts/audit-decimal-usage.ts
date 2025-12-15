// scripts/audit-decimal-usage.ts
// Audit script to find all Decimal field usages that need conversion

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const DECIMAL_FIELDS = [
    // Product
    'stock_qty', 'min_stock', 'avg_cost', 'selling_price', 'purchase_price',
    // Transaction
    'amount', 'total_amount', 'paid_amount', 'subtotal', 'vat_amount',
    // ARTransaction
    'balance', 'credit_limit',
    // StockMovement
    'quantity', 'unit_price', 'qty_before', 'qty_after',
    // Partner
    'balance',
    // PayrollItem
    'amount', 'base_salary', 'gross_salary', 'net_salary',
];

const EXTENSIONS = ['.ts', '.tsx'];
const EXCLUDE_DIRS = ['node_modules', '.next', 'dist', 'scripts'];

interface Issue {
    file: string;
    line: number;
    field: string;
    code: string;
    issue: string;
}

const issues: Issue[] = [];

function scanDirectory(dir: string) {
    const files = readdirSync(dir);

    for (const file of files) {
        const filePath = join(dir, file);
        const stat = statSync(filePath);

        if (stat.isDirectory()) {
            if (!EXCLUDE_DIRS.includes(file)) {
                scanDirectory(filePath);
            }
        } else if (EXTENSIONS.some(ext => file.endsWith(ext))) {
            scanFile(filePath);
        }
    }
}

function scanFile(filePath: string) {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
        for (const field of DECIMAL_FIELDS) {
            // Check for arithmetic operations without Number() conversion
            const patterns = [
                // pattern: field + something (or - * /)
                new RegExp(`\\.${field}\\s*[-+*/]`, 'g'),
                // pattern: something + field
                new RegExp(`[-+*/]\\s*\\w+\\.${field}`, 'g'),
                // pattern: comparison without Number()
                new RegExp(`\\.${field}\\s*[<>]=?\\s*\\d`, 'g'),
                // pattern: using || 0 without Number() for Decimal
                new RegExp(`\\.${field}\\s*\\|\\|\\s*0(?!\\))`, 'g'),
            ];

            for (const pattern of patterns) {
                if (pattern.test(line)) {
                    // Check if Number() is used
                    if (!line.includes(`Number(`) && !line.includes('toDecimal(')) {
                        issues.push({
                            file: filePath.replace(process.cwd(), ''),
                            line: index + 1,
                            field,
                            code: line.trim().substring(0, 100),
                            issue: 'Possible Decimal arithmetic without Number() conversion',
                        });
                    }
                }
            }
        }
    });
}

// Run audit
console.log('🔍 Auditing Decimal field usage...\n');
scanDirectory(join(process.cwd(), 'src'));

// Report
if (issues.length === 0) {
    console.log('✅ No obvious Decimal issues found!');
} else {
    console.log(`⚠️  Found ${issues.length} potential issues:\n`);

    // Group by file
    const byFile = new Map<string, Issue[]>();
    for (const issue of issues) {
        if (!byFile.has(issue.file)) byFile.set(issue.file, []);
        byFile.get(issue.file)!.push(issue);
    }

    for (const [file, fileIssues] of byFile) {
        console.log(`📄 ${file}`);
        for (const issue of fileIssues) {
            console.log(`   Line ${issue.line}: ${issue.field}`);
            console.log(`   > ${issue.code}`);
        }
        console.log('');
    }
}

console.log('\n📊 Summary:');
console.log(`   Total files with issues: ${new Set(issues.map(i => i.file)).size}`);
console.log(`   Total potential issues: ${issues.length}`);
