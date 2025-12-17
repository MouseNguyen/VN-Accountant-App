// scripts/verify-vat-numbers.ts
// Verify VAT declaration numbers from screenshot

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('=== VERIFY VAT DECLARATION 2025-12 ===\n');

    // Period: 2025-11-30 to 2025-12-30
    const startDate = new Date('2025-11-30');
    const endDate = new Date('2025-12-30');
    endDate.setHours(23, 59, 59, 999);

    // Thuế đầu vào (Input VAT) - PURCHASE/EXPENSE
    console.log('--- INPUT VAT (Thuế đầu vào - Mua hàng) ---');
    const inputTrans = await prisma.transaction.findMany({
        where: {
            trans_type: { in: ['PURCHASE', 'EXPENSE'] },
            trans_date: { gte: startDate, lte: endDate },
            deleted_at: null
        },
        select: {
            code: true,
            total_amount: true,
            tax_amount: true,
            subtotal: true,
            amount: true
        }
    });

    let inputGoodsValue = 0;
    let inputVAT = 0;

    inputTrans.forEach(t => {
        const goods = Number(t.subtotal || t.amount || 0);
        const vat = Number(t.tax_amount || 0);
        inputGoodsValue += goods;
        inputVAT += vat;
        console.log(`  ${t.code}: Goods=${goods.toLocaleString()}, VAT=${vat.toLocaleString()}`);
    });

    console.log(`  TOTAL: ${inputTrans.length} invoices, Goods=${inputGoodsValue.toLocaleString()}, VAT=${inputVAT.toLocaleString()}`);

    // Thuế đầu ra (Output VAT) - SALE/INCOME
    console.log('\n--- OUTPUT VAT (Thuế đầu ra - Bán hàng) ---');
    const outputTrans = await prisma.transaction.findMany({
        where: {
            trans_type: { in: ['SALE', 'INCOME'] },
            trans_date: { gte: startDate, lte: endDate },
            deleted_at: null
        },
        select: {
            code: true,
            total_amount: true,
            tax_amount: true,
            subtotal: true,
            amount: true
        }
    });

    let outputGoodsValue = 0;
    let outputVAT = 0;

    outputTrans.forEach(t => {
        const goods = Number(t.subtotal || t.amount || 0);
        const vat = Number(t.tax_amount || 0);
        outputGoodsValue += goods;
        outputVAT += vat;
        console.log(`  ${t.code}: Goods=${goods.toLocaleString()}, VAT=${vat.toLocaleString()}`);
    });

    console.log(`  TOTAL: ${outputTrans.length} invoices, Goods=${outputGoodsValue.toLocaleString()}, VAT=${outputVAT.toLocaleString()}`);

    // VAT Payable Calculation
    const vatPayable = outputVAT - inputVAT;

    console.log('\n=== VERIFICATION ===');
    console.log('Screenshot values:');
    console.log('  Input VAT (đầu vào): 4,150,000đ from 5 invoices, Goods: 41,500,000đ');
    console.log('  Output VAT (đầu ra): 4,800,000đ from 2 invoices, Goods: 48,000,000đ');
    console.log('  VAT Payable: 650,000đ');

    console.log('\nDatabase values:');
    console.log(`  Input VAT: ${inputVAT.toLocaleString()}đ from ${inputTrans.length} invoices, Goods: ${inputGoodsValue.toLocaleString()}đ`);
    console.log(`  Output VAT: ${outputVAT.toLocaleString()}đ from ${outputTrans.length} invoices, Goods: ${outputGoodsValue.toLocaleString()}đ`);
    console.log(`  VAT Payable: ${vatPayable.toLocaleString()}đ (${outputVAT.toLocaleString()} - ${inputVAT.toLocaleString()})`);

    console.log('\n=== FORMULA CHECK ===');
    console.log(`VAT Payable = Output VAT - Input VAT`);
    console.log(`           = ${outputVAT.toLocaleString()} - ${inputVAT.toLocaleString()}`);
    console.log(`           = ${vatPayable.toLocaleString()}đ`);

    // Check if screenshot matches
    const matchInput = inputVAT === 4150000;
    const matchOutput = outputVAT === 4800000;
    const matchPayable = vatPayable === 650000;

    console.log(`\nInput VAT Match: ${matchInput ? '✅' : '❌'}`);
    console.log(`Output VAT Match: ${matchOutput ? '✅' : '❌'}`);
    console.log(`VAT Payable Match: ${matchPayable ? '✅' : '❌'}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
