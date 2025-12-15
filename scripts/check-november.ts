// scripts/check-november.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const farm = await prisma.farm.findFirst();
    if (!farm) return;

    console.log('═══ NOVEMBER 2025 TAX DATA ═══\n');

    const result: any[] = await prisma.$queryRaw`
        SELECT code, trans_type, trans_date,
               CAST(vat_amount AS FLOAT) as vat_amount, 
               CAST(tax_amount AS FLOAT) as tax_amount
        FROM transactions 
        WHERE farm_id = ${farm.id}
        AND trans_date >= '2025-11-01'
        AND trans_date <= '2025-11-30'
        AND deleted_at IS NULL
        AND (vat_amount > 0 OR tax_amount > 0)
    `;

    if (result.length === 0) {
        console.log('No transactions with tax in November 2025');
        console.log('→ 0đ tax is CORRECT ✓');
    } else {
        console.log('Transactions with tax:');
        for (const r of result) {
            console.log(`  ${r.trans_date} | ${r.code} | ${r.trans_type} | tax: ${r.vat_amount || r.tax_amount}`);
        }
    }

    // Also show all November transactions
    console.log('\n═══ ALL NOVEMBER 2025 TRANSACTIONS ═══\n');

    const allTrans: any[] = await prisma.$queryRaw`
        SELECT code, trans_type, trans_date,
               CAST(total_amount AS FLOAT) as total_amount
        FROM transactions 
        WHERE farm_id = ${farm.id}
        AND trans_date >= '2025-11-01'
        AND trans_date <= '2025-11-30'
        AND deleted_at IS NULL
        ORDER BY trans_date
    `;

    for (const t of allTrans) {
        console.log(`  ${t.trans_date?.toISOString().split('T')[0]} | ${t.code || 'N/A'} | ${t.trans_type} | ${Number(t.total_amount).toLocaleString()}đ`);
    }
    console.log(`\nTotal: ${allTrans.length} transactions`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
