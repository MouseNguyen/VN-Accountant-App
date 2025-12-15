// scripts/create-gov-partners.ts
// Create government partners for tax/insurance payments

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║     CREATE GOVERNMENT PARTNERS                               ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // Get farm ID
    const farm = await prisma.farm.findFirst();
    if (!farm) {
        console.log('❌ No farm found!');
        return;
    }

    const farmId = farm.id;
    console.log(`Farm: ${farm.name}\n`);

    // Create GOV-BHXH partner
    const bhxhPartner = await prisma.partner.upsert({
        where: {
            farm_id_code: { farm_id: farmId, code: 'GOV-BHXH' },
        },
        update: {},
        create: {
            farm_id: farmId,
            code: 'GOV-BHXH',
            name: 'Cơ quan Bảo hiểm Xã hội',
            partner_type: 'VENDOR',
            notes: 'Thanh toán BHXH, BHYT, BHTN cho cơ quan bảo hiểm',
        },
    });
    console.log(`✅ Created partner: ${bhxhPartner.code} - ${bhxhPartner.name}`);

    // Create GOV-TAX partner
    const taxPartner = await prisma.partner.upsert({
        where: {
            farm_id_code: { farm_id: farmId, code: 'GOV-TAX' },
        },
        update: {},
        create: {
            farm_id: farmId,
            code: 'GOV-TAX',
            name: 'Cục Thuế',
            partner_type: 'VENDOR',
            notes: 'Thanh toán thuế TNCN, VAT, thuế TNDN',
        },
    });
    console.log(`✅ Created partner: ${taxPartner.code} - ${taxPartner.name}`);

    // Find BHXH expense transaction without partner and link it
    console.log('\n═══ LINK BHXH EXPENSE TO PARTNER ═══\n');

    const bhxhExpense = await prisma.transaction.findFirst({
        where: {
            farm_id: farmId,
            trans_type: 'EXPENSE',
            code: { contains: 'BHXH' },
            partner_id: null,
            deleted_at: null,
        },
    });

    if (bhxhExpense) {
        await prisma.transaction.update({
            where: { id: bhxhExpense.id },
            data: { partner_id: bhxhPartner.id },
        });
        console.log(`✅ Linked ${bhxhExpense.code} to ${bhxhPartner.name}`);

        // Update partner balance
        const remaining = Number(bhxhExpense.total_amount) - Number(bhxhExpense.paid_amount);
        await prisma.partner.update({
            where: { id: bhxhPartner.id },
            data: { balance: -remaining }, // Negative = we owe them
        });
        console.log(`✅ Updated partner balance: -${remaining.toLocaleString()}đ`);
    } else {
        console.log('ℹ️  No unlinked BHXH expense found');
    }

    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('DONE! Government partners created and expenses linked.');
    console.log('════════════════════════════════════════════════════════════════');
}

main().catch(console.error).finally(() => prisma.$disconnect());
