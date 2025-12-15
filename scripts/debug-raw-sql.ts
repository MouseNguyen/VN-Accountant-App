// scripts/debug-raw-sql.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const result = await prisma.$queryRaw`
        SELECT id, code, trans_type, vat_amount, tax_amount 
        FROM transactions 
        WHERE (vat_amount > 0 OR tax_amount > 0) 
        AND deleted_at IS NULL
    `;
    console.log('Raw SQL result:');
    console.log(result);
}

main().catch(console.error).finally(() => prisma.$disconnect());
