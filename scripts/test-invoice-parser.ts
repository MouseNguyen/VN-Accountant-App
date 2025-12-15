// scripts/test-invoice-parser.ts
// Run with: npx ts-node --project tsconfig.json scripts/test-invoice-parser.ts

import { parseInvoiceText, parseVNCurrency, parseTaxCode } from '../src/lib/ocr/invoice-parser';

interface TestCase {
    name: string;
    text: string;
    expected: {
        supplier_name?: string;
        supplier_tax_code?: string | null;
        total_amount?: number;
        tax_amount?: number;
        subtotal?: number;
    };
}

const testCases: TestCase[] = [
    {
        name: 'HĐĐT chuẩn - Công ty MISA',
        text: `
            HÓA ĐƠN GIÁ TRỊ GIA TĂNG
            
            Mẫu số: 01GTKT0/001
            Số: 0000012
            Ngày 15 tháng 12 năm 2024
            
            Đơn vị bán hàng: CÔNG TY CỔ PHẦN MISA
            Mã số thuế: 0101234567
            Điện thoại: 024 3795 6789
            
            Cộng tiền hàng: 5.000.000
            Thuế GTGT: 500.000
            Tổng cộng tiền thanh toán: 5.500.000
        `,
        expected: {
            supplier_tax_code: '0101234567',
            total_amount: 5500000,
            tax_amount: 500000,
        }
    },
    {
        name: 'HĐĐT với MST 13 chữ số',
        text: `
            HÓA ĐƠN ĐIỆN TỬ
            Số HĐ: 00005678
            Ngày: 12/12/2024
            
            Công ty TNHH ABC
            MST: 3101234567001
            
            Tổng thanh toán: 17.050.000đ
        `,
        expected: {
            supplier_tax_code: '3101234567001',
            total_amount: 17050000,
        }
    },
    {
        name: 'Hóa đơn bán lẻ - KHÔNG có MST',
        text: `
            TUYẾN BH
            ĐT: 0901234567
            
            Tổng: 588,000
            Giảm giá: 58,800
            Phải TT: 529,200
        `,
        expected: {
            supplier_tax_code: null, // 0901234567 is phone, not MST
            total_amount: 529200,
        }
    },
    {
        name: 'HĐĐT với Phải thanh toán',
        text: `
            CTY TNHH VINA COFFEE
            MST: 2901234567
            
            Thành tiền: 10.000.000
            VAT 10%: 1.000.000
            Phải thanh toán: 11.000.000
        `,
        expected: {
            supplier_tax_code: '2901234567',
            total_amount: 11000000,
            tax_amount: 1000000,
        }
    }
];

console.log('=== INVOICE PARSER TESTS ===\n');

let passed = 0;
let failed = 0;

for (const tc of testCases) {
    console.log(`\n📋 Testing: ${tc.name}`);
    console.log('-'.repeat(50));

    const result = parseInvoiceText(tc.text);

    let testPassed = true;

    // Check supplier_tax_code
    if (tc.expected.supplier_tax_code !== undefined) {
        const actual = result.supplier_tax_code || null;
        const expected = tc.expected.supplier_tax_code;
        if (actual !== expected) {
            console.log(`  ❌ supplier_tax_code: expected "${expected}", got "${actual}"`);
            testPassed = false;
        } else {
            console.log(`  ✅ supplier_tax_code: ${actual}`);
        }
    }

    // Check total_amount
    if (tc.expected.total_amount !== undefined) {
        const actual = result.total_amount;
        const expected = tc.expected.total_amount;
        if (actual !== expected) {
            console.log(`  ❌ total_amount: expected ${expected}, got ${actual}`);
            testPassed = false;
        } else {
            console.log(`  ✅ total_amount: ${actual?.toLocaleString()}đ`);
        }
    }

    // Check tax_amount
    if (tc.expected.tax_amount !== undefined) {
        const actual = result.tax_amount;
        const expected = tc.expected.tax_amount;
        if (actual !== expected) {
            console.log(`  ❌ tax_amount: expected ${expected}, got ${actual}`);
            testPassed = false;
        } else {
            console.log(`  ✅ tax_amount: ${actual?.toLocaleString()}đ`);
        }
    }

    if (testPassed) {
        passed++;
        console.log(`  🎉 PASSED`);
    } else {
        failed++;
        console.log(`  💥 FAILED`);
    }
}

console.log('\n' + '='.repeat(50));
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
