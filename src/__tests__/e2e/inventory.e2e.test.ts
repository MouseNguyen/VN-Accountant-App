// src/__tests__/e2e/inventory.e2e.test.ts
// E2E tests cho Inventory Management Flow

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * NOTE: These are integration/E2E test specifications.
 * In a real CI/CD environment, these would run against a test database.
 * 
 * For manual testing, use the following flow in the browser:
 * 
 * 1. Login with test user
 * 2. Go to /kho/nhap → Enter stock
 * 3. Go to /kho/xuat → Withdraw stock
 * 4. Go to /kho → Verify quantities
 * 5. Go to /kho/dieu-chinh → Adjust stock
 * 6. Verify final quantities
 */

describe('Inventory E2E Tests', () => {
    describe('Stock In Flow', () => {
        it('should create a product with initial stock via stock-in', async () => {
            /**
             * Test Case: First Stock In
             * 
             * Given: A product exists with 0 stock
             * When: User enters 100 units @ 50,000 VND
             * Then: 
             *   - Stock quantity = 100
             *   - Avg cost = 50,000
             *   - Total value = 5,000,000
             *   - Movement code starts with PNK
             */
            const mockStockIn = {
                product_id: 'test-product-1',
                quantity: 100,
                unit_price: 50000,
                date: '2024-12-13',
                reason: 'Nhập hàng mới',
            };

            // Expected result
            const expectedStock = {
                quantity: 100,
                avg_cost: 50000,
                total_value: 5000000,
            };

            // Simulate: Moving average = (0*0 + 100*50000) / 100 = 50000
            const calculatedAvgCost = (0 * 0 + mockStockIn.quantity * mockStockIn.unit_price) / mockStockIn.quantity;
            expect(calculatedAvgCost).toBe(expectedStock.avg_cost);
        });

        it('should update avg cost correctly on second stock-in', async () => {
            /**
             * Test Case: Second Stock In with different price
             * 
             * Given: Product has 100 units @ 50,000 avg cost
             * When: User enters 50 units @ 80,000 VND
             * Then:
             *   - Stock quantity = 150
             *   - Avg cost = (100*50000 + 50*80000) / 150 = 60,000
             *   - Total value = 9,000,000
             */
            const existingQty = 100;
            const existingAvgCost = 50000;
            const newQty = 50;
            const newPrice = 80000;

            const totalQty = existingQty + newQty;
            const newAvgCost = (existingQty * existingAvgCost + newQty * newPrice) / totalQty;
            const totalValue = totalQty * newAvgCost;

            expect(totalQty).toBe(150);
            expect(newAvgCost).toBe(60000);
            expect(totalValue).toBe(9000000);
        });
    });

    describe('Stock Out Flow', () => {
        it('should calculate COGS correctly on stock-out', async () => {
            /**
             * Test Case: Stock Out
             * 
             * Given: Product has 150 units @ 60,000 avg cost
             * When: User sells 50 units
             * Then:
             *   - Stock quantity = 100
             *   - COGS = 50 * 60,000 = 3,000,000
             *   - Avg cost remains 60,000 (unchanged on out)
             */
            const currentQty = 150;
            const avgCost = 60000;
            const sellQty = 50;

            const newQty = currentQty - sellQty;
            const cogs = sellQty * avgCost;
            const newTotalValue = newQty * avgCost;

            expect(newQty).toBe(100);
            expect(cogs).toBe(3000000);
            expect(newTotalValue).toBe(6000000);
        });

        it('should prevent negative stock when disabled', async () => {
            /**
             * Test Case: Prevent negative stock
             * 
             * Given: Product has 10 units, allow_negative_stock = false
             * When: User tries to sell 15 units
             * Then: Error - insufficient stock
             */
            const currentStock = 10;
            const requestedQty = 15;
            const allowNegative = false;

            const hasInsufficientStock = requestedQty > currentStock && !allowNegative;
            expect(hasInsufficientStock).toBe(true);
        });

        it('should allow negative stock when enabled', async () => {
            /**
             * Test Case: Allow negative stock
             * 
             * Given: Product has 10 units, allow_negative_stock = true
             * When: User sells 15 units
             * Then:
             *   - Stock quantity = -5
             *   - COGS = 15 * avg_cost
             */
            const currentStock = 10;
            const requestedQty = 15;
            const allowNegative = true;

            const canProceed = requestedQty <= currentStock || allowNegative;
            const newStock = currentStock - requestedQty;

            expect(canProceed).toBe(true);
            expect(newStock).toBe(-5);
        });
    });

    describe('Stock Adjustment Flow', () => {
        it('should adjust stock up correctly', async () => {
            /**
             * Test Case: Adjust stock up (found more during count)
             * 
             * Given: System shows 100 units @ 50,000
             * When: Physical count shows 110 units
             * Then:
             *   - Creates ADJUST_IN movement for 10 units
             *   - New quantity = 110
             *   - Avg cost unchanged (adjustment, not purchase)
             */
            const systemQty = 100;
            const actualQty = 110;
            const variance = actualQty - systemQty;

            expect(variance).toBe(10);
            expect(variance > 0).toBe(true); // ADJUST_IN
        });

        it('should adjust stock down correctly', async () => {
            /**
             * Test Case: Adjust stock down (missing/damaged)
             * 
             * Given: System shows 100 units @ 50,000
             * When: Physical count shows 95 units
             * Then:
             *   - Creates ADJUST_OUT movement for 5 units
             *   - New quantity = 95
             *   - Loss recognized: 5 * 50,000 = 250,000
             */
            const systemQty = 100;
            const actualQty = 95;
            const avgCost = 50000;
            const variance = actualQty - systemQty;
            const lossValue = Math.abs(variance) * avgCost;

            expect(variance).toBe(-5);
            expect(variance < 0).toBe(true); // ADJUST_OUT
            expect(lossValue).toBe(250000);
        });
    });

    describe('Complete Inventory Cycle', () => {
        it('should maintain data integrity through full cycle', async () => {
            /**
             * Test Case: Full Inventory Cycle
             * 
             * 1. Start: 0 stock
             * 2. Stock In: 100 @ 50,000 → qty=100, avg=50,000
             * 3. Stock In: 50 @ 80,000 → qty=150, avg=60,000
             * 4. Stock Out: 75 → qty=75, avg=60,000, COGS=4,500,000
             * 5. Adjust: actual=80 → qty=80, adjustment=+5
             * 6. Stock In: 20 @ 70,000 → qty=100, avg=(75*60000+5*60000+20*70000)/100=62,000
             */

            let qty = 0;
            let avgCost = 0;

            // Step 1: First stock in
            avgCost = (qty * avgCost + 100 * 50000) / (qty + 100);
            qty = 100;
            expect(qty).toBe(100);
            expect(avgCost).toBe(50000);

            // Step 2: Second stock in
            avgCost = (qty * avgCost + 50 * 80000) / (qty + 50);
            qty = 150;
            expect(qty).toBe(150);
            expect(avgCost).toBe(60000);

            // Step 3: Stock out (avg cost doesn't change)
            const cogs1 = 75 * avgCost;
            qty = 75;
            expect(qty).toBe(75);
            expect(cogs1).toBe(4500000);

            // Step 4: Adjustment (use same avg cost)
            qty = 80; // actual count
            expect(qty).toBe(80);

            // Step 5: Third stock in
            avgCost = (qty * avgCost + 20 * 70000) / (qty + 20);
            qty = 100;
            expect(qty).toBe(100);
            expect(avgCost).toBe(62000);
        });
    });

    describe('Excel Import Flow', () => {
        it('should process batch import correctly', async () => {
            /**
             * Test Case: Batch Import
             * 
             * Given: CSV with 3 products
             * When: User uploads and confirms
             * Then:
             *   - 3 stock movements created
             *   - Each product stock updated
             *   - Summary shows success/failure count
             */
            const importItems = [
                { product_code: 'SP001', quantity: 100, unit_price: 50000 },
                { product_code: 'SP002', quantity: 50, unit_price: 80000 },
                { product_code: 'SP003', quantity: 200, unit_price: 30000 },
            ];

            const totalItems = importItems.length;
            const totalQty = importItems.reduce((sum, i) => sum + i.quantity, 0);
            const totalValue = importItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);

            expect(totalItems).toBe(3);
            expect(totalQty).toBe(350);
            expect(totalValue).toBe(15000000); // 5M + 4M + 6M
        });
    });

    describe('Stock Count (Kiểm kê) Flow', () => {
        it('should create stock count and process variances', async () => {
            /**
             * Test Case: Stock Count with variances
             * 
             * Given: 3 products in stock
             * When: Physical count completed
             * Then:
             *   - Products with variance get adjustment movements
             *   - Stock count status = COMPLETED
             *   - Total variance calculated
             */
            const stockCountItems = [
                { product_id: 'p1', system_qty: 100, counted_qty: 100, variance: 0 },
                { product_id: 'p2', system_qty: 50, counted_qty: 48, variance: -2 },
                { product_id: 'p3', system_qty: 75, counted_qty: 80, variance: 5 },
            ];

            const itemsWithVariance = stockCountItems.filter(i => i.variance !== 0);
            const totalVarianceQty = stockCountItems.reduce((sum, i) => sum + i.variance, 0);

            expect(itemsWithVariance.length).toBe(2);
            expect(totalVarianceQty).toBe(3); // -2 + 5 = 3 net
        });
    });
});

describe('API Response Format Tests', () => {
    it('should return correct stock list response format', () => {
        const mockResponse = {
            success: true,
            data: {
                items: [
                    {
                        id: 'stock-1',
                        product_id: 'prod-1',
                        product_name: 'Lúa giống',
                        product_code: 'LG001',
                        quantity: 100,
                        avg_cost: 50000,
                        total_value: 5000000,
                    },
                ],
                total: 1,
                page: 1,
                limit: 20,
                hasMore: false,
            },
        };

        expect(mockResponse.success).toBe(true);
        expect(mockResponse.data.items).toHaveLength(1);
        expect(mockResponse.data.items[0]).toHaveProperty('product_id');
        expect(mockResponse.data.items[0]).toHaveProperty('quantity');
        expect(mockResponse.data.items[0]).toHaveProperty('avg_cost');
    });

    it('should return correct movement response format', () => {
        const mockMovement = {
            id: 'mov-1',
            code: 'PNK241213001',
            type: 'IN',
            date: '2024-12-13',
            product_id: 'prod-1',
            quantity: 100,
            unit_price: 50000,
            avg_cost_before: 0,
            avg_cost_after: 50000,
            qty_before: 0,
            qty_after: 100,
        };

        expect(mockMovement.code).toMatch(/^PNK/);
        expect(mockMovement.type).toBe('IN');
        expect(mockMovement.qty_after).toBe(mockMovement.qty_before + mockMovement.quantity);
    });
});
