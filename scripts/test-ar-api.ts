// scripts/test-ar-api.ts
import { PrismaClient } from '@prisma/client';
import { getARTransactions } from '../src/services/ar.service';

async function main() {
    const farmId = 'test-farm-001';

    console.log('=== Testing getARTransactions ===');
    try {
        const result = await getARTransactions(farmId, {});
        console.log('Total:', result.total);
        console.log('Items count:', result.items.length);
        console.log('Summary:', result.summary);
        if (result.items.length > 0) {
            console.log('First item:', result.items[0]);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

main().catch(console.error);
