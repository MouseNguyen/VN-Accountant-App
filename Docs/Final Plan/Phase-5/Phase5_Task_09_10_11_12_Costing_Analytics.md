# 📋 PHASE 5 - TASK 9-12: COSTING & ANALYTICS

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P5-T9, P5-T10, P5-T11, P5-T12 |
| **Tên** | Product Costing & Analytics Dashboard |
| **Thời gian** | 12-15 giờ |
| **Phụ thuộc** | Task 1-8 |
| **Task tiếp theo** | 🎉 PROJECT COMPLETE |

---

## 📋 MỤC TIÊU

- Cost drivers setup (Labor, Overhead)
- Activity-based costing
- Product profitability analysis
- Analytics dashboard tổng hợp

---

## PHẦN 1: COST DRIVERS

```typescript
// src/services/cost-driver.service.ts

export const DEFAULT_COST_DRIVERS = [
  { type: 'LABOR', name: 'Giờ công', rate: 50000 },      // 50k/giờ
  { type: 'MACHINE', name: 'Giờ máy', rate: 100000 },   // 100k/giờ
  { type: 'OVERHEAD', name: 'Chi phí chung', rate: 0.15 }, // 15% of direct cost
];

interface ProductCostInput {
  farm_id: string;
  product_id: string;
  period: string;
  quantity: number;
  material_cost: number;
  labor_hours: number;
  machine_hours: number;
}

export async function calculateProductCost(input: ProductCostInput) {
  const drivers = await prisma.costDriver.findMany({
    where: { farm_id: input.farm_id },
  });
  
  const laborDriver = drivers.find(d => d.type === 'LABOR');
  const machineDriver = drivers.find(d => d.type === 'MACHINE');
  const overheadDriver = drivers.find(d => d.type === 'OVERHEAD');
  
  // Calculate costs
  const materialCost = input.material_cost;
  const laborCost = input.labor_hours * Number(laborDriver?.rate || 50000);
  const machineCost = input.machine_hours * Number(machineDriver?.rate || 0);
  
  const directCost = materialCost + laborCost + machineCost;
  const overheadCost = directCost * Number(overheadDriver?.rate || 0.15);
  
  const totalCost = directCost + overheadCost;
  const unitCost = totalCost / input.quantity;
  
  return prisma.productCost.upsert({
    where: {
      farm_id_product_id_period: {
        farm_id: input.farm_id,
        product_id: input.product_id,
        period: input.period,
      },
    },
    update: {
      material_cost: materialCost,
      labor_cost: laborCost,
      overhead_cost: overheadCost,
      total_cost: totalCost,
      unit_cost: unitCost,
      quantity: input.quantity,
    },
    create: {
      farm_id: input.farm_id,
      product_id: input.product_id,
      period: input.period,
      material_cost: materialCost,
      labor_cost: laborCost,
      overhead_cost: overheadCost,
      total_cost: totalCost,
      unit_cost: unitCost,
      quantity: input.quantity,
    },
  });
}
```

---

## PHẦN 2: PROFITABILITY ANALYSIS

```typescript
// src/services/profitability.service.ts

interface ProductProfitability {
  product_id: string;
  product_name: string;
  revenue: number;
  cost: number;
  gross_profit: number;
  margin_percent: number;
}

export async function getProductProfitability(
  farmId: string, 
  period: string
): Promise<ProductProfitability[]> {
  const products = await prisma.product.findMany({
    where: { farm_id: farmId },
  });
  
  const results: ProductProfitability[] = [];
  
  for (const product of products) {
    // Get revenue from sales
    const sales = await prisma.transactionItem.aggregate({
      where: {
        transaction: {
          farm_id: farmId,
          type: 'SALE',
          trans_date: { startsWith: period },
        },
        product_id: product.id,
      },
      _sum: { subtotal: true },
    });
    
    // Get cost
    const cost = await prisma.productCost.findUnique({
      where: {
        farm_id_product_id_period: {
          farm_id: farmId,
          product_id: product.id,
          period,
        },
      },
    });
    
    const revenue = Number(sales._sum.subtotal) || 0;
    const totalCost = Number(cost?.total_cost) || 0;
    const grossProfit = revenue - totalCost;
    
    results.push({
      product_id: product.id,
      product_name: product.name,
      revenue,
      cost: totalCost,
      gross_profit: grossProfit,
      margin_percent: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
    });
  }
  
  return results.sort((a, b) => b.gross_profit - a.gross_profit);
}
```

---

## PHẦN 3: ANALYTICS DASHBOARD

### KPIs
- Total Revenue vs Cost
- Overall Margin %
- Top Profitable Products
- Low Margin Alerts

### Charts
- Revenue vs Cost trend (12 months)
- Product profitability waterfall
- Cost breakdown pie chart
- Budget utilization bars

### API
```typescript
// GET /api/analytics/dashboard

export async function getAnalyticsDashboard(farmId: string) {
  const currentMonth = format(new Date(), 'yyyy-MM');
  const lastYear = subMonths(new Date(), 12);
  
  return {
    summary: await getMonthlySummary(farmId, currentMonth),
    profitability: await getProductProfitability(farmId, currentMonth),
    trends: await getRevenueVsCostTrend(farmId, lastYear),
    budgetUtilization: await getBudgetUtilization(farmId),
    alerts: await getAlerts(farmId),
  };
}
```

---

## ✅ CHECKLIST

### Task 9: Cost Drivers
- [ ] Cost driver CRUD
- [ ] Default drivers seeding

### Task 10: Activity Costing
- [ ] Product cost calculation
- [ ] Material + Labor + Overhead

### Task 11: Profitability
- [ ] Revenue vs Cost by product
- [ ] Margin analysis
- [ ] Top/Bottom performers

### Task 12: Analytics Dashboard
- [ ] Dashboard page
- [ ] KPI cards
- [ ] Charts (Recharts)
- [ ] Alert notifications

---

## 🔗 PROJECT COMPLETION

### Deliverables
- ✅ 57 Task Specifications
- ✅ 5 Phase Master Specs
- ✅ Full ERP Mini for Vietnamese Farms

### Technology Stack
- Next.js 14 + TypeScript
- Prisma + PostgreSQL
- TailwindCSS + shadcn/ui
- AWS Infrastructure

---

**Estimated Time:** 12-15 giờ  
**🎉 LABA ERP PROJECT COMPLETE!**
