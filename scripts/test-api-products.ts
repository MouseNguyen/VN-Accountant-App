// scripts/test-api-products.ts

const BASE_URL = 'http://localhost:3000';

async function main() {
    // Login
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', password: 'Test1234' }),
    });

    const cookies = loginRes.headers.get('set-cookie') || '';

    // Get products
    const productsRes = await fetch(`${BASE_URL}/api/products`, {
        headers: { 'Cookie': cookies.split(';')[0] },
    });

    const data = await productsRes.json() as any;

    console.log('Products from API:');
    for (const p of data.data.items) {
        console.log(`  ${p.code}: stock_qty=${p.stock_qty}, avg_cost=${p.avg_cost}`);
    }
}

main();
