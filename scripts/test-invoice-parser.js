// scripts/test-invoice-parser.js
// Test invoice parser với các mẫu HĐĐT

const testCases = [
    {
        name: 'HĐĐT chuẩn - Công ty MISA',
        text: `
            HÓA ĐƠN GIÁ TRỊ GIA TĂNG
            (Bản thể hiện của hóa đơn điện tử)
            
            Mẫu số: 01GTKT0/001
            Ký hiệu: AA/23E
            Số: 0000012
            
            Ngày 15 tháng 12 năm 2024
            
            Đơn vị bán hàng: CÔNG TY CỔ PHẦN MISA
            Mã số thuế: 0101234567
            Địa chỉ: 15 Duy Tân, Cầu Giấy, Hà Nội
            Điện thoại: 024 3795 6789
            
            Người mua hàng: Nguyễn Văn A
            Tên đơn vị: Công ty TNHH ABC
            MST: 0309876543
            Địa chỉ: 123 Nguyễn Huệ, Q1, TP.HCM
            
            Tên hàng hóa: Phần mềm kế toán MISA SME.NET
            Đơn vị tính: Bộ
            Số lượng: 1
            Đơn giá: 5.000.000
            Thành tiền: 5.000.000
            
            Cộng tiền hàng: 5.000.000
            Thuế suất GTGT: 10%
            Tiền thuế GTGT: 500.000
            Tổng cộng tiền thanh toán: 5.500.000
        `,
        expected: {
            supplier_name: 'CÔNG TY CỔ PHẦN MISA',
            supplier_tax_code: '0101234567',
            total_amount: 5500000,
            tax_amount: 500000,
        }
    },
    {
        name: 'HĐĐT - Công ty thương mại',
        text: `
            HÓA ĐƠN ĐIỆN TỬ
            
            Số HĐ: 00005678
            Ngày lập: 12/12/2024
            
            NHÀ CUNG CẤP: CÔNG TY TNHH THƯƠNG MẠI ABC
            Mã số thuế: 3101234567-001
            Địa chỉ: 456 Lê Lợi, Q3, HCM
            
            THÔNG TIN NGƯỜI MUA:
            Công ty: DNTN XYZ
            MST: 4101234567
            
            MÔ TẢ HÀNG HÓA:
            - Laptop Dell: 15.000.000đ
            - Chuột Logitech: 500.000đ
            
            Tạm tính: 15.500.000
            VAT 10%: 1.550.000
            TỔNG THANH TOÁN: 17.050.000đ
        `,
        expected: {
            supplier_name: 'CÔNG TY TNHH THƯƠNG MẠI ABC',
            supplier_tax_code: '3101234567001',
            total_amount: 17050000,
            tax_amount: 1550000,
        }
    },
    {
        name: 'Hóa đơn bán lẻ (không có MST)',
        text: `
            TUYẾN BH
            ĐT: 0901234567
            
            Tổng: 588,000
            Giảm giá: 58,800
            Phải TT: 529,200
            
            Cảm ơn Quý khách
        `,
        expected: {
            supplier_tax_code: null, // Phone number should NOT be parsed as tax code
            total_amount: 529200,
        }
    },
    {
        name: 'HĐĐT với mã cơ quan thuế',
        text: `
            HÓA ĐƠN GIÁ TRỊ GIA TĂNG
            Mã CQT: 01C24TACM000000005678
            
            Ký hiệu: 1C24TAB
            Số: 00000123
            Ngày: 10/12/2024
            
            Người bán: CTY TNHH DỊCH VỤ VINA
            MST: 2901234567
            
            Thành tiền: 10.000.000
            Thuế GTGT (10%): 1.000.000
            Tổng cộng: 11.000.000
        `,
        expected: {
            supplier_tax_code: '2901234567',
            total_amount: 11000000,
            tax_amount: 1000000,
        }
    }
];

// Import parser (simulate since we can't use ES modules directly)
async function runTests() {
    console.log('=== INVOICE PARSER TESTS ===\n');

    // We'll need to run via ts-node or transpile first
    // For now, just output the test cases
    console.log('Test cases defined:', testCases.length);

    for (const tc of testCases) {
        console.log(`\n📋 ${tc.name}`);
        console.log('Expected:', JSON.stringify(tc.expected, null, 2));
    }

    console.log('\n\nTo run actual tests, use: npx ts-node scripts/test-invoice-parser.ts');
}

runTests();
