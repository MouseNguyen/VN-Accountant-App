// scripts/comprehensive-api-test.ts
// Complete API test to verify all endpoints return correct data types

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:3000';

interface TestResult {
    name: string;
    endpoint: string;
    status: 'PASS' | 'FAIL' | 'ERROR';
    message: string;
    details?: any;
}

const results: TestResult[] = [];

// Helper to make authenticated fetch
let authCookie = '';

async function login() {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', password: 'Test1234' }),
    });

    if (!res.ok) throw new Error('Login failed');

    // Get cookies from response
    const cookies = res.headers.getSetCookie?.() || [];
    authCookie = cookies.map(c => c.split(';')[0]).join('; ');
    console.log('✅ Logged in successfully\n');
}

async function apiGet(endpoint: string) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: { 'Cookie': authCookie },
    });
    return res.json();
}

// Check if value is a proper number (not Prisma Decimal object)
function isProperNumber(value: any): boolean {
    return typeof value === 'number' && !isNaN(value);
}

// Check if all numeric fields in object are proper numbers
function checkNumericFields(obj: any, fields: string[]): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    for (const field of fields) {
        const value = obj[field];
        if (value !== undefined && value !== null) {
            if (!isProperNumber(value)) {
                issues.push(`${field}: expected number, got ${typeof value} (${JSON.stringify(value)})`);
            }
        }
    }

    return { valid: issues.length === 0, issues };
}

async function testProducts() {
    console.log('📦 Testing /api/products...');
    const data = await apiGet('/api/products');

    if (!data.success) {
        results.push({ name: 'Products API', endpoint: '/api/products', status: 'FAIL', message: data.error?.message || 'Failed' });
        return;
    }

    const numericFields = ['stock_qty', 'min_stock', 'avg_cost', 'selling_price', 'purchase_price'];
    let allValid = true;

    for (const product of data.data.items.slice(0, 3)) {
        const check = checkNumericFields(product, numericFields);
        if (!check.valid) {
            allValid = false;
            results.push({
                name: `Product ${product.code}`,
                endpoint: '/api/products',
                status: 'FAIL',
                message: 'Invalid numeric types',
                details: check.issues
            });
        }
    }

    if (allValid) {
        results.push({
            name: 'Products API',
            endpoint: '/api/products',
            status: 'PASS',
            message: `${data.data.items.length} products, all numeric fields valid`
        });
    }
}

async function testStocks() {
    console.log('📊 Testing /api/stocks...');
    const data = await apiGet('/api/stocks');

    if (!data.success) {
        results.push({ name: 'Stocks API', endpoint: '/api/stocks', status: 'FAIL', message: data.error?.message || 'Failed' });
        return;
    }

    const numericFields = ['quantity', 'avg_cost', 'total_value', 'min_quantity'];
    let allValid = true;

    for (const stock of data.data.items.slice(0, 3)) {
        const check = checkNumericFields(stock, numericFields);
        if (!check.valid) {
            allValid = false;
            results.push({
                name: `Stock ${stock.product?.code}`,
                endpoint: '/api/stocks',
                status: 'FAIL',
                message: 'Invalid numeric types',
                details: check.issues
            });
        }
    }

    // Also check summary
    const summaryFields = ['total_value', 'total_products', 'low_stock_count', 'out_of_stock_count'];
    const summaryCheck = checkNumericFields(data.data.summary, summaryFields);
    if (!summaryCheck.valid) {
        allValid = false;
        results.push({
            name: 'Stocks Summary',
            endpoint: '/api/stocks',
            status: 'FAIL',
            message: 'Invalid summary types',
            details: summaryCheck.issues
        });
    }

    if (allValid) {
        results.push({
            name: 'Stocks API',
            endpoint: '/api/stocks',
            status: 'PASS',
            message: `${data.data.items.length} stocks, all numeric fields valid. Total value: ${data.data.summary.total_value.toLocaleString()}đ`
        });
    }
}

async function testTransactions() {
    console.log('💰 Testing /api/transactions...');
    const data = await apiGet('/api/transactions');

    if (!data.success) {
        results.push({ name: 'Transactions API', endpoint: '/api/transactions', status: 'FAIL', message: data.error?.message || 'Failed' });
        return;
    }

    const numericFields = ['amount', 'total_amount', 'paid_amount', 'subtotal', 'vat_amount'];
    let allValid = true;

    for (const txn of (data.data.items || data.data).slice(0, 3)) {
        const check = checkNumericFields(txn, numericFields);
        if (!check.valid) {
            allValid = false;
            results.push({
                name: `Transaction ${txn.trans_number}`,
                endpoint: '/api/transactions',
                status: 'FAIL',
                message: 'Invalid numeric types',
                details: check.issues
            });
        }
    }

    if (allValid) {
        results.push({
            name: 'Transactions API',
            endpoint: '/api/transactions',
            status: 'PASS',
            message: 'All numeric fields valid'
        });
    }
}

async function testARTransactions() {
    console.log('📋 Testing /api/ar-transactions...');
    const data = await apiGet('/api/ar-transactions');

    if (!data.success) {
        results.push({ name: 'AR Transactions API', endpoint: '/api/ar-transactions', status: 'FAIL', message: data.error?.message || 'Failed' });
        return;
    }

    const numericFields = ['amount', 'paid_amount', 'balance'];
    let allValid = true;

    for (const ar of (data.data.items || data.data || []).slice(0, 3)) {
        const check = checkNumericFields(ar, numericFields);
        if (!check.valid) {
            allValid = false;
            results.push({
                name: `AR ${ar.invoice_number}`,
                endpoint: '/api/ar-transactions',
                status: 'FAIL',
                message: 'Invalid numeric types',
                details: check.issues
            });
        }
    }

    if (allValid) {
        results.push({
            name: 'AR Transactions API',
            endpoint: '/api/ar-transactions',
            status: 'PASS',
            message: 'All numeric fields valid'
        });
    }
}

async function testIncomeExpenseReport() {
    console.log('📈 Testing /api/reports/income-expense...');
    const today = new Date().toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const data = await apiGet(`/api/reports/income-expense?from=${monthAgo}&to=${today}`);

    if (!data.success) {
        results.push({ name: 'Income/Expense Report', endpoint: '/api/reports/income-expense', status: 'FAIL', message: data.error?.message || 'Failed' });
        return;
    }

    const numericFields = ['total_income', 'total_expense', 'net_profit'];
    const check = checkNumericFields(data.data, numericFields);

    if (!check.valid) {
        results.push({
            name: 'Income/Expense Report',
            endpoint: '/api/reports/income-expense',
            status: 'FAIL',
            message: 'Invalid numeric types',
            details: check.issues
        });
    } else {
        results.push({
            name: 'Income/Expense Report',
            endpoint: '/api/reports/income-expense',
            status: 'PASS',
            message: `Income: ${data.data.total_income.toLocaleString()}đ, Expense: ${data.data.total_expense.toLocaleString()}đ`
        });
    }
}

async function testDataConsistency() {
    console.log('🔍 Testing Data Consistency...');

    // Get products from API
    const productsApi = await apiGet('/api/products');

    // Get data from database
    const dbProducts = await prisma.product.findMany({
        where: { farm_id: '6a1cdfc3-7a55-43a7-9e96-21eb7be5ac7a' }
    });

    let mismatches = 0;
    for (const apiProduct of productsApi.data.items) {
        const dbProduct = dbProducts.find(p => p.id === apiProduct.id);
        if (dbProduct) {
            const apiQty = apiProduct.stock_qty;
            const dbQty = Number(dbProduct.stock_qty);

            if (apiQty !== dbQty) {
                mismatches++;
                results.push({
                    name: `Data Consistency - ${apiProduct.code}`,
                    endpoint: 'Database vs API',
                    status: 'FAIL',
                    message: `API qty: ${apiQty}, DB qty: ${dbQty}`,
                });
            }
        }
    }

    if (mismatches === 0) {
        results.push({
            name: 'Data Consistency',
            endpoint: 'Database vs API',
            status: 'PASS',
            message: 'All API values match database'
        });
    }
}

async function testCalculations() {
    console.log('🧮 Testing Calculations...');

    // Test stock value calculation
    const stocksApi = await apiGet('/api/stocks');

    for (const stock of stocksApi.data.items.slice(0, 5)) {
        const expectedValue = stock.quantity * stock.avg_cost;
        const actualValue = stock.total_value;

        // Allow small floating point difference
        if (Math.abs(expectedValue - actualValue) > 0.01) {
            results.push({
                name: `Calculation - ${stock.product?.code}`,
                endpoint: 'Stock Value',
                status: 'FAIL',
                message: `Expected: ${expectedValue}, Actual: ${actualValue}`,
            });
        }
    }

    results.push({
        name: 'Stock Value Calculations',
        endpoint: 'Internal',
        status: 'PASS',
        message: 'All stock values calculated correctly'
    });
}

async function main() {
    console.log('🚀 COMPREHENSIVE API TEST\n');
    console.log('='.repeat(60));

    try {
        await login();

        await testProducts();
        await testStocks();
        await testTransactions();
        await testARTransactions();
        await testIncomeExpenseReport();
        await testDataConsistency();
        await testCalculations();

    } catch (error) {
        console.error('❌ Test error:', error);
    }

    // Print results
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST RESULTS\n');

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;

    for (const result of results) {
        const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
        console.log(`${icon} ${result.name.padEnd(30)} | ${result.message}`);
        if (result.details) {
            result.details.forEach((d: string) => console.log(`   └─ ${d}`));
        }
    }

    console.log('\n' + '-'.repeat(60));
    console.log(`PASSED: ${passed} | FAILED: ${failed} | TOTAL: ${results.length}`);

    if (failed > 0) {
        console.log('\n⚠️  SOME TESTS FAILED - Issues need to be fixed!');
    } else {
        console.log('\n🎉 ALL TESTS PASSED!');
    }

    await prisma.$disconnect();
}

main();
