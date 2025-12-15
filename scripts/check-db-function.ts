// scripts/check-db-function.ts
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
    const result = await p.$queryRaw`SELECT proname FROM pg_proc WHERE proname = 'generate_transaction_code'`;
    console.log('Function exists:', (result as any[]).length > 0 ? 'YES' : 'NO');

    // Test generate
    try {
        const code = await p.$queryRaw`SELECT generate_transaction_code('INCOME', NOW()::timestamptz) as code`;
        console.log('Generated code:', code);
    } catch (e) {
        console.error('Error:', e);
    }
}

main().finally(() => p.$disconnect());
