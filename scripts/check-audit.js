const { PrismaClient } = require('@prisma/client');

async function main() {
    const p = new PrismaClient();
    try {
        const logs = await p.auditLog.findMany({ take: 10 });
        console.log('Total audit logs:', logs.length);
        logs.forEach(log => {
            console.log(`- ${log.action} | ${log.entity_type} | ${log.created_at}`);
        });
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await p.$disconnect();
    }
}

main();
