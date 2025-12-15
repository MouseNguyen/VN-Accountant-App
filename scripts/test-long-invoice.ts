// scripts/test-long-invoice.ts
// Test với mẫu hóa đơn GTGT dài

import { parseInvoiceText } from '../src/lib/ocr/invoice-parser';

// Mẫu HĐĐT dài với nhiều dòng sản phẩm
const longInvoiceText = `
HÓA ĐƠN GIÁ TRỊ GIA TĂNG
(Bản thể hiện của hóa đơn điện tử)

Mẫu số: 01GTKT0/001
Ký hiệu: 1C24TAB
Số: 00001234
Ngày 15 tháng 12 năm 2024

ĐƠN VỊ BÁN HÀNG:
CÔNG TY TNHH MM MEGA MARKET (VIỆT NAM)
Mã số thuế: 0312450788
Địa chỉ: Số 1 Đại lộ Võ Văn Kiệt, P.6, Q.5, TP.HCM
Điện thoại: 028 3755 5555

NGƯỜI MUA HÀNG:
Họ tên: Nguyễn Văn A
Công ty: DNTN ABC
MST: 0309876543

STT  | Tên hàng hóa          | ĐVT | SL  | Đơn giá    | Thành tiền
1    | Sữa TH True Milk 1L   | Hộp | 10  | 35.000     | 350.000
2    | Nước mắm Nam Ngư 500ml| Chai| 5   | 25.000     | 125.000
3    | Gạo ST25 5kg          | Bao | 2   | 150.000    | 300.000
4    | Dầu ăn Neptune 1L     | Chai| 3   | 45.000     | 135.000
5    | Đường Biên Hòa 1kg    | Gói | 4   | 22.000     | 88.000

Cộng tiền hàng:                                       998.000
Thuế suất GTGT: 10%
Tiền thuế GTGT:                                       99.800
Tổng cộng tiền thanh toán:                          1.097.800

Số tiền viết bằng chữ: Một triệu không trăm chín mươi bảy nghìn tám trăm đồng.

Người mua hàng                    Người bán hàng
(Ký, ghi rõ họ tên)              (Ký, ghi rõ họ tên)
`;

console.log('=== TEST LONG INVOICE ===\n');
console.log('Input text (first 500 chars):');
console.log(longInvoiceText.substring(0, 500));
console.log('\n' + '-'.repeat(50) + '\n');

const result = parseInvoiceText(longInvoiceText);

console.log('PARSED RESULT:');
console.log('- Supplier:', result.supplier_name);
console.log('- Tax Code:', result.supplier_tax_code);
console.log('- Invoice Number:', result.invoice_number);
console.log('- Invoice Date:', result.invoice_date);
console.log('- Subtotal:', result.subtotal?.toLocaleString());
console.log('- Tax Amount:', result.tax_amount?.toLocaleString());
console.log('- Total:', result.total_amount?.toLocaleString());
console.log('- Confidence:', result.confidence + '%');
console.log('- Warnings:', result.warnings);

// Expected values
const expected = {
    supplier_name: 'CÔNG TY TNHH MM MEGA MARKET (VIỆT NAM)',
    supplier_tax_code: '0312450788',
    total_amount: 1097800,
    tax_amount: 99800,
};

console.log('\n=== VALIDATION ===');
let passed = true;

if (result.supplier_tax_code !== expected.supplier_tax_code) {
    console.log(`❌ Tax code: expected "${expected.supplier_tax_code}", got "${result.supplier_tax_code}"`);
    passed = false;
} else {
    console.log(`✅ Tax code: ${result.supplier_tax_code}`);
}

if (result.total_amount !== expected.total_amount) {
    console.log(`❌ Total: expected ${expected.total_amount.toLocaleString()}, got ${result.total_amount?.toLocaleString()}`);
    passed = false;
} else {
    console.log(`✅ Total: ${result.total_amount?.toLocaleString()}đ`);
}

if (result.tax_amount !== expected.tax_amount) {
    console.log(`❌ Tax: expected ${expected.tax_amount.toLocaleString()}, got ${result.tax_amount?.toLocaleString()}`);
    passed = false;
} else {
    console.log(`✅ Tax: ${result.tax_amount?.toLocaleString()}đ`);
}

console.log('\n' + (passed ? '🎉 ALL PASSED!' : '💥 SOME FAILED'));
