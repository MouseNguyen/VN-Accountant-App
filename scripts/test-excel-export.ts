// scripts/test-excel-export.ts
// Test Excel export functionality

import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

async function testExport() {
    console.log('🧪 Testing Excel Export...\n');

    // Need to login first to get cookies
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: 'test@test.com',
            password: 'Test1234',
        }),
    });

    if (!loginRes.ok) {
        console.error('❌ Login failed');
        return;
    }

    const cookies = loginRes.headers.get('set-cookie') || '';
    console.log('✅ Login successful\n');

    const tests = [
        {
            name: 'Inventory Report',
            url: '/api/reports/export?report_type=inventory&format=excel',
            filename: 'test-inventory.xlsx',
        },
        {
            name: 'Income/Expense Report',
            url: '/api/reports/export?report_type=income_expense&format=excel&from=2024-01-01&to=2024-12-31',
            filename: 'test-income-expense.xlsx',
        },
    ];

    for (const test of tests) {
        console.log(`📊 Testing: ${test.name}`);

        try {
            const res = await fetch(`${BASE_URL}${test.url}`, {
                headers: { Cookie: cookies },
            });

            if (!res.ok) {
                const error = await res.text();
                console.log(`   ❌ Failed: ${error}\n`);
                continue;
            }

            const contentType = res.headers.get('content-type');
            if (contentType?.includes('spreadsheetml')) {
                const buffer = await res.arrayBuffer();
                const outputPath = path.join(process.cwd(), 'scripts', test.filename);
                fs.writeFileSync(outputPath, Buffer.from(buffer));
                console.log(`   ✅ Saved: ${outputPath}`);
                console.log(`   📁 Size: ${buffer.byteLength} bytes\n`);
            } else {
                console.log(`   ⚠️ Got JSON instead of Excel\n`);
            }
        } catch (err) {
            console.log(`   ❌ Error: ${err}\n`);
        }
    }

    console.log('✅ Export test completed!');
}

testExport();
