// scripts/seed-november-data.ts
// Tạo dữ liệu test cho tháng 11/2025 để test xuất hồ sơ thuế

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Bắt đầu tạo dữ liệu tháng 11/2025...\n');

    // Lấy farm đầu tiên
    const farm = await prisma.farm.findFirst();
    if (!farm) {
        console.log('❌ Không tìm thấy farm. Vui lòng tạo user trước.');
        return;
    }

    console.log(`📍 Farm: ${farm.name} (${farm.id})`);

    // Xóa dữ liệu cũ tháng 11/2025 (nếu có)
    const nov1 = new Date(2025, 10, 1); // Tháng 11 (0-indexed)
    const nov30 = new Date(2025, 10, 30);

    await prisma.transaction.deleteMany({
        where: {
            farm_id: farm.id,
            trans_date: { gte: nov1, lte: nov30 },
        },
    });

    await prisma.vATDeclaration.deleteMany({
        where: {
            farm_id: farm.id,
            period_code: '2025-11',
        },
    });

    console.log('🗑️ Đã xóa dữ liệu cũ tháng 11/2025\n');

    // Tạo đối tác test
    let vendor = await prisma.partner.findFirst({
        where: { farm_id: farm.id, partner_type: 'VENDOR' },
    });

    if (!vendor) {
        vendor = await prisma.partner.create({
            data: {
                farm_id: farm.id,
                code: 'NCC001',
                name: 'Công ty TNHH Vật Tư Nông Nghiệp ABC',
                partner_type: 'VENDOR',
                tax_code: '0123456789',
                phone: '0901234567',
                address: '123 Đường ABC, Quận 1, TP.HCM',
            },
        });
        console.log('✅ Đã tạo đối tác: Công ty TNHH Vật Tư Nông Nghiệp ABC');
    }

    let customer = await prisma.partner.findFirst({
        where: { farm_id: farm.id, partner_type: 'CUSTOMER' },
    });

    if (!customer) {
        customer = await prisma.partner.create({
            data: {
                farm_id: farm.id,
                code: 'KH001',
                name: 'Siêu thị Big C Việt Nam',
                partner_type: 'CUSTOMER',
                tax_code: '0987654321',
                phone: '0909876543',
                address: '456 Đường XYZ, Quận 7, TP.HCM',
            },
        });
        console.log('✅ Đã tạo đối tác: Siêu thị Big C Việt Nam');
    }

    // === TẠO GIAO DỊCH THÁNG 11/2025 ===

    const transactions = [];

    // 1. Mua phân bón - 05/11/2025
    transactions.push(await prisma.transaction.create({
        data: {
            farm_id: farm.id,
            trans_number: 'PC-25110001',
            code: 'PC-25110001',
            trans_date: new Date(2025, 10, 5),
            trans_type: 'EXPENSE',
            partner_id: vendor.id,
            partner_name: vendor.name,
            amount: 5000000,
            subtotal: 5000000,
            vat_amount: 500000,
            tax_amount: 500000,
            total_amount: 5500000,
            payment_method: 'CASH',
            payment_status: 'PAID',
            paid_amount: 5500000,
            debit_account: '621',
            credit_account: '111',
            description: 'Mua phân bón NPK 20-20-15',
        },
    }));
    console.log('📦 Tạo: PC-25110001 - Mua phân bón 5,000,000đ + VAT 500,000đ');

    // 2. Mua thuốc BVTV - 10/11/2025
    transactions.push(await prisma.transaction.create({
        data: {
            farm_id: farm.id,
            trans_number: 'PC-25110002',
            code: 'PC-25110002',
            trans_date: new Date(2025, 10, 10),
            trans_type: 'EXPENSE',
            partner_id: vendor.id,
            partner_name: vendor.name,
            amount: 3000000,
            subtotal: 3000000,
            vat_amount: 300000,
            tax_amount: 300000,
            total_amount: 3300000,
            payment_method: 'BANK_TRANSFER',
            payment_status: 'PAID',
            paid_amount: 3300000,
            debit_account: '621',
            credit_account: '112',
            description: 'Mua thuốc trừ sâu sinh học',
        },
    }));
    console.log('📦 Tạo: PC-25110002 - Mua thuốc BVTV 3,000,000đ + VAT 300,000đ');

    // 3. Bán rau sạch - 15/11/2025
    transactions.push(await prisma.transaction.create({
        data: {
            farm_id: farm.id,
            trans_number: 'PT-25110001',
            code: 'PT-25110001',
            trans_date: new Date(2025, 10, 15),
            trans_type: 'INCOME',
            partner_id: customer.id,
            partner_name: customer.name,
            amount: 20000000,
            subtotal: 20000000,
            vat_amount: 1000000,
            tax_amount: 1000000,
            total_amount: 21000000,
            payment_method: 'BANK_TRANSFER',
            payment_status: 'PAID',
            paid_amount: 21000000,
            debit_account: '112',
            credit_account: '511',
            description: 'Bán rau sạch - Lô 1 tháng 11',
        },
    }));
    console.log('💰 Tạo: PT-25110001 - Bán rau sạch 20,000,000đ + VAT 1,000,000đ');

    // 4. Bán trái cây - 20/11/2025
    transactions.push(await prisma.transaction.create({
        data: {
            farm_id: farm.id,
            trans_number: 'PT-25110002',
            code: 'PT-25110002',
            trans_date: new Date(2025, 10, 20),
            trans_type: 'INCOME',
            partner_id: customer.id,
            partner_name: customer.name,
            amount: 15000000,
            subtotal: 15000000,
            vat_amount: 750000,
            tax_amount: 750000,
            total_amount: 15750000,
            payment_method: 'CASH',
            payment_status: 'PAID',
            paid_amount: 15750000,
            debit_account: '111',
            credit_account: '511',
            description: 'Bán trái cây - Cam, quýt',
        },
    }));
    console.log('💰 Tạo: PT-25110002 - Bán trái cây 15,000,000đ + VAT 750,000đ');

    // 5. Chi phí điện - 25/11/2025
    transactions.push(await prisma.transaction.create({
        data: {
            farm_id: farm.id,
            trans_number: 'PC-25110003',
            code: 'PC-25110003',
            trans_date: new Date(2025, 10, 25),
            trans_type: 'EXPENSE',
            amount: 2000000,
            subtotal: 2000000,
            vat_amount: 200000,
            tax_amount: 200000,
            total_amount: 2200000,
            payment_method: 'BANK_TRANSFER',
            payment_status: 'PAID',
            paid_amount: 2200000,
            debit_account: '627',
            credit_account: '112',
            description: 'Tiền điện tháng 11',
        },
    }));
    console.log('⚡ Tạo: PC-25110003 - Chi phí điện 2,000,000đ + VAT 200,000đ');

    // === TẠO TỜ KHAI THUẾ THÁNG 11/2025 ===

    // Tính toán
    const inputVat = 500000 + 300000 + 200000; // 1,000,000
    const outputVat = 1000000 + 750000; // 1,750,000
    const payableVat = outputVat - inputVat; // 750,000

    const vatDeclaration = await prisma.vATDeclaration.create({
        data: {
            farm_id: farm.id,
            period_type: 'MONTHLY',
            period_code: '2025-11',
            from_date: nov1,
            to_date: nov30,
            status: 'CALCULATED',

            input_vat_count: 3,
            input_vat_amount: 10000000, // 5M + 3M + 2M
            input_vat_tax: inputVat,

            output_vat_count: 2,
            output_vat_amount: 35000000, // 20M + 15M
            output_vat_tax: outputVat,

            payable_vat: payableVat,
            carried_forward: 0,
        },
    });

    console.log('\n📄 Đã tạo tờ khai thuế GTGT tháng 11/2025:');
    console.log(`   - Thuế đầu vào: ${inputVat.toLocaleString('vi-VN')}đ (3 HĐ)`);
    console.log(`   - Thuế đầu ra: ${outputVat.toLocaleString('vi-VN')}đ (2 HĐ)`);
    console.log(`   - Thuế phải nộp: ${payableVat.toLocaleString('vi-VN')}đ`);

    // === TẠO PERIOD LOCK (tùy chọn) ===
    await prisma.periodLock.upsert({
        where: {
            farm_id_period_code: {
                farm_id: farm.id,
                period_code: '2025-11',
            },
        },
        update: {},
        create: {
            farm_id: farm.id,
            period_type: 'MONTH',
            period_code: '2025-11',
            from_date: nov1,
            to_date: nov30,
            status: 'OPEN',
        },
    });

    console.log('\n──────────────────────────────────────────────────');
    console.log('🎉 Hoàn tất tạo dữ liệu test tháng 11/2025!');
    console.log('──────────────────────────────────────────────────');
    console.log(`📊 Tổng giao dịch: ${transactions.length}`);
    console.log(`💰 Tổng doanh thu: ${(35000000).toLocaleString('vi-VN')}đ`);
    console.log(`📦 Tổng chi phí: ${(10000000).toLocaleString('vi-VN')}đ`);
    console.log(`📄 Tờ khai VAT: Đã tính (CALCULATED)`);
    console.log('\n👉 Bây giờ bạn có thể test xuất hồ sơ thuế tháng 11/2025!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
