// prisma/seed/test-phase3-models.ts
// Test script to verify Phase 3 database schema

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPhase3Models() {
    console.log('🧪 Testing Phase 3 Database Models...\n');

    // Get test farm
    const farm = await prisma.farm.findFirst();
    if (!farm) {
        console.error('❌ No farm found. Run seed first.');
        return;
    }
    console.log(`📍 Using farm: ${farm.name} (${farm.id})\n`);

    // Get test worker
    let worker = await prisma.worker.findFirst({ where: { farm_id: farm.id } });
    if (!worker) {
        // Create test worker
        worker = await prisma.worker.create({
            data: {
                farm_id: farm.id,
                code: 'NV-TEST-001',
                name: 'Test Worker',
                phone: '0901234567',
                worker_type: 'FULL_TIME',
                status: 'ACTIVE',
                salary_type: 'MONTHLY',
                base_salary: 10000000,
                dependents: 1,
            },
        });
        console.log('✅ Created test worker');
    }

    // ==== TEST 1: TaxRule ====
    console.log('1️⃣ Testing TaxRule...');
    const taxRules = await prisma.taxRule.findMany({
        where: { farm_id: farm.id },
        take: 3,
    });
    console.log(`   Found ${taxRules.length} tax rules`);
    if (taxRules[0]) {
        console.log(`   Sample: ${taxRules[0].code} - ${taxRules[0].rule_type} - ${taxRules[0].action}`);
    }

    // ==== TEST 2: Create CITCalculation ====
    console.log('\n2️⃣ Testing CITCalculation...');
    const citCalc = await prisma.cITCalculation.upsert({
        where: { farm_id_period: { farm_id: farm.id, period: '2024-Q4' } },
        update: {
            total_revenue: 100000000,
            total_expenses: 60000000,
            accounting_profit: 40000000,
            taxable_income: 40000000,
            cit_amount: 8000000,
            status: 'CALCULATED',
        },
        create: {
            farm_id: farm.id,
            period: '2024-Q4',
            period_type: 'QUARTERLY',
            total_revenue: 100000000,
            total_expenses: 60000000,
            accounting_profit: 40000000,
            taxable_income: 40000000,
            tax_rate: 20,
            cit_amount: 8000000,
            status: 'CALCULATED',
            calculated_at: new Date(),
        },
    });
    console.log(`   ✅ CIT Calculation created: ${citCalc.period}`);
    console.log(`   Revenue: ${citCalc.total_revenue}, Tax: ${citCalc.cit_amount}`);

    // ==== TEST 3: Create CITAdjustment ====
    console.log('\n3️⃣ Testing CITAdjustment...');
    const citAdj = await prisma.cITAdjustment.create({
        data: {
            cit_calculation_id: citCalc.id,
            adjustment_type: 'ADD_BACK',
            category: 'ENTERTAINMENT',
            description: 'Chi tiếp khách vượt mức Q4',
            amount: 2000000,
        },
    });
    console.log(`   ✅ CIT Adjustment created: ${citAdj.category} - ${citAdj.amount}`);

    // ==== TEST 4: Create PITCalculation ====
    console.log('\n4️⃣ Testing PITCalculation...');
    const pitCalc = await prisma.pITCalculation.upsert({
        where: {
            farm_id_employee_id_period: {
                farm_id: farm.id,
                employee_id: worker.id,
                period: '2024-12',
            },
        },
        update: {
            gross_income: 15000000,
            insurance_deduction: 1575000,
            family_deduction: 11000000,
            dependent_deduction: 4400000,
            taxable_income: 0,
            pit_amount: 0,
        },
        create: {
            farm_id: farm.id,
            employee_id: worker.id,
            period: '2024-12',
            gross_income: 15000000,
            insurance_deduction: 1575000,
            family_deduction: 11000000,
            dependent_deduction: 4400000,
            total_deduction: 16975000,
            taxable_income: 0,
            pit_amount: 0,
            dependents_count: 1,
            calculated_at: new Date(),
        },
    });
    console.log(`   ✅ PIT Calculation created: ${pitCalc.period}`);
    console.log(`   Gross: ${pitCalc.gross_income}, PIT: ${pitCalc.pit_amount}`);

    // ==== TEST 5: Create Asset ====
    console.log('\n5️⃣ Testing Asset...');
    const asset = await prisma.asset.upsert({
        where: { farm_id_code: { farm_id: farm.id, code: 'TSCD-TEST-001' } },
        update: {},
        create: {
            farm_id: farm.id,
            code: 'TSCD-TEST-001',
            name: 'Máy cày Test',
            category: 'MACHINERY',
            purchase_date: new Date('2024-01-01'),
            purchase_price: 60000000,
            useful_life_months: 60,
            depreciation_method: 'STRAIGHT_LINE',
            monthly_depreciation: 1000000,
            original_cost: 60000000,
            book_value: 60000000,
            status: 'ACTIVE',
        },
    });
    console.log(`   ✅ Asset created: ${asset.code} - ${asset.name}`);
    console.log(`   Cost: ${asset.original_cost}, Monthly Dep: ${asset.monthly_depreciation}`);

    // ==== TEST 6: Create DepreciationSchedule ====
    console.log('\n6️⃣ Testing DepreciationSchedule...');
    const depSched = await prisma.depreciationSchedule.upsert({
        where: { asset_id_period: { asset_id: asset.id, period: '2024-12' } },
        update: {},
        create: {
            asset_id: asset.id,
            period: '2024-12',
            depreciation_amount: 1000000,
            accumulated_amount: 12000000,
            remaining_value: 48000000,
            is_posted: false,
        },
    });
    console.log(`   ✅ Depreciation Schedule created: ${depSched.period}`);
    console.log(`   Dep Amount: ${depSched.depreciation_amount}, Remaining: ${depSched.remaining_value}`);

    // ==== TEST 7: Create TaxSchedule ====
    console.log('\n7️⃣ Testing TaxSchedule...');
    const taxSched = await prisma.taxSchedule.upsert({
        where: {
            farm_id_tax_type_period: {
                farm_id: farm.id,
                tax_type: 'VAT',
                period: '2024-Q4',
            },
        },
        update: {},
        create: {
            farm_id: farm.id,
            tax_type: 'VAT',
            period: '2024-Q4',
            due_date: new Date('2025-01-30'),
            status: 'PENDING',
            amount: 5000000,
        },
    });
    console.log(`   ✅ Tax Schedule created: ${taxSched.tax_type} - ${taxSched.period}`);
    console.log(`   Due: ${taxSched.due_date.toISOString().split('T')[0]}, Amount: ${taxSched.amount}`);

    // ==== TEST 8: Create TaxRuleHistory ====
    console.log('\n8️⃣ Testing TaxRuleHistory...');
    const taxRule = await prisma.taxRule.findFirst({ where: { farm_id: farm.id } });
    if (taxRule) {
        const history = await prisma.taxRuleHistory.create({
            data: {
                tax_rule_id: taxRule.id,
                farm_id: farm.id,
                action: 'USER_OVERRIDE',
                old_value: 11000000,
                new_value: 12000000,
                note: 'Test override from script',
            },
        });
        console.log(`   ✅ Tax Rule History created: ${history.action}`);
    }

    // ==== FINAL COUNTS ====
    console.log('\n' + '='.repeat(50));
    console.log('📊 FINAL RECORD COUNTS:');
    console.log('='.repeat(50));

    const counts = {
        'Tax Rules': await prisma.taxRule.count({ where: { farm_id: farm.id } }),
        'Tax Rule Histories': await prisma.taxRuleHistory.count({ where: { farm_id: farm.id } }),
        'CIT Calculations': await prisma.cITCalculation.count({ where: { farm_id: farm.id } }),
        'CIT Adjustments': await prisma.cITAdjustment.count(),
        'PIT Calculations': await prisma.pITCalculation.count({ where: { farm_id: farm.id } }),
        'Assets': await prisma.asset.count({ where: { farm_id: farm.id } }),
        'Depreciation Schedules': await prisma.depreciationSchedule.count(),
        'Tax Schedules': await prisma.taxSchedule.count({ where: { farm_id: farm.id } }),
    };

    for (const [name, count] of Object.entries(counts)) {
        console.log(`   ${name}: ${count}`);
    }

    console.log('\n✅ All Phase 3 models tested successfully!');
}

testPhase3Models()
    .catch((e) => {
        console.error('❌ Test failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
