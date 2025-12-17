# 🧪 AI PROMPT: Test Profit/Loss Report & Operating Expenses
## LABA ERP - P&L and Expense Calculations Testing

---

## PROMPT START

```
Bạn là QA Engineer đang test Báo cáo Lãi/Lỗ (P&L) và Chi phí Hoạt động của LABA ERP.
Hãy kiểm tra toàn bộ flow tính toán.

## 📁 FILES CẦN KIỂM TRA

1. Report Service: `src/services/report.service.ts`
2. Reports Service: `src/services/reports.service.ts`
3. Dashboard Service: `src/services/dashboard.service.ts`
4. Tax Services: `src/services/tax-report.service.ts`, `src/services/vat.service.ts`
5. API Routes:
   - `src/app/api/reports/profit-loss/route.ts`
   - `src/app/api/dashboard/route.ts`
6. Types: `src/types/report.ts`, `src/types/cit.ts`
7. Schema: `prisma/schema.prisma` - ExpenseType enum

## 📊 P&L CALCULATION FORMULAS

### 1. Basic P&L Structure

```
PROFIT & LOSS REPORT
======================
DOANH THU (Revenue)
  Doanh thu bán hàng (Sales)............... A
  Doanh thu khác (Other Income)............ B
  ─────────────────────────────────────────
  TỔNG DOANH THU........................... (A + B)

GIÁ VỐN HÀNG BÁN (COGS)
  Tồn kho đầu kỳ........................... C
  Mua vào trong kỳ......................... D
  Tồn kho cuối kỳ.......................... E
  ─────────────────────────────────────────
  TỔNG GIÁ VỐN............................. (C + D - E)

LỢI NHUẬN GỘP (Gross Profit)............... (Revenue - COGS)

CHI PHÍ HOẠT ĐỘNG (Operating Expenses)
  Chi phí nhân sự.......................... F
  Chi phí tiện ích......................... G
  Chi phí thuê mặt bằng.................... H
  Chi phí tiếp khách....................... I
  Chi phí khác............................. J
  ─────────────────────────────────────────
  TỔNG CHI PHÍ HOẠT ĐỘNG................... (F + G + H + I + J)

LỢI NHUẬN THUẦN (Net Profit)............... (Gross Profit - Op Expenses)

Biên lợi nhuận (Profit Margin) = Net Profit / Revenue × 100
```

### 2. Revenue Calculation

```
Revenue = SUM(Transactions where trans_type IN ('SALE', 'INCOME'))

Lưu ý:
- Chỉ tính transactions trong kỳ báo cáo (from_date to to_date)
- Chỉ tính transactions chưa bị xóa (deleted_at = null)
- Dùng total_amount (đã bao gồm VAT)
```

### 3. COGS Calculation (Giá vốn hàng bán)

```
Cách 1 - Từ TransactionItem:
COGS = SUM(transaction_items.quantity × transaction_items.unit_cost)
       WHERE transaction.trans_type IN ('SALE', 'INCOME')
       AND transaction_items.product_id IS NOT NULL

Cách 2 - Từ StockMovement:
COGS = SUM(stock_movements.cogs_amount)
       WHERE type = 'OUT'
       AND reason relates to sales

Lưu ý:
- unit_cost = giá vốn bình quân tại thời điểm bán
- Chỉ tính items có product_id (có hàng hóa thực)
```

### 4. Operating Expenses Calculation

```
Operating Expenses = SUM(Transactions where:
  - trans_type = 'EXPENSE'
  - Không có items với product_id (pure expense, không phải mua hàng)
)

HOẶC tính theo expense_type:

Operating Expenses = SUM(Transactions.total_amount 
                        GROUP BY expense_type)

Expense Types:
- NORMAL: Chi phí thường
- SALARY: Chi phí lương
- UTILITY: Điện/nước/internet
- RENT: Thuê mặt bằng
- ENTERTAINMENT: Tiếp khách
- MATERIALS: Nguyên vật liệu
- ADMIN_PENALTY: Phạt hành chính
- WELFARE: Chi phúc lợi
- EQUIPMENT: Thiết bị
- VEHICLE: Phương tiện
- INSURANCE: Bảo hiểm
- LOAN_REPAYMENT: Trả nợ vay
```

### 5. Special Expense Rules (for CIT)

```
ADMIN_PENALTY:
- 100% add-back (không được trừ khi tính thuế TNDN)

WELFARE:
- Giới hạn = 1 tháng lương bình quân
- Phần vượt quá → add-back

ENTERTAINMENT:
- Giới hạn theo quy định thuế
- Phần vượt quá → add-back

LOAN_REPAYMENT:
- Không ảnh hưởng P&L (trừ phần lãi vay)
- Gốc vay không phải chi phí
```

## ✅ CHECKLIST KIỂM TRA

### A. REVENUE CALCULATION

#### A1. Data Sources
- [ ] Query transactions với trans_type IN ('SALE', 'INCOME')
- [ ] Filter by date range (from, to)
- [ ] Exclude deleted (deleted_at = null)
- [ ] Sum total_amount

#### A2. Edge Cases
- [ ] No sales in period → Revenue = 0
- [ ] Partial payment → vẫn tính full total_amount
- [ ] Returns/Refunds → có xử lý?

### B. COGS CALCULATION

#### B1. Data Source Check
- [ ] Lấy từ TransactionItem.unit_cost hay từ Product.avg_cost?
- [ ] unit_cost có được lưu tại thời điểm bán không?
- [ ] Chỉ tính items có product_id?

#### B2. Accuracy Check
- [ ] COGS = quantity × unit_cost (at time of sale)
- [ ] KHÔNG dùng current avg_cost
- [ ] Consistent với StockMovement.cogs_amount?

#### B3. Edge Cases
- [ ] Service-only sale (no products) → COGS = 0
- [ ] Sale with mixed items → only product items count

### C. OPERATING EXPENSES

#### C1. Classification
- [ ] EXPENSE transactions included?
- [ ] PURCHASE excluded from op expenses? (it's COGS)
- [ ] Payroll expenses included?
- [ ] expense_type được sử dụng để phân loại?

#### C2. Grouping
- [ ] Group by expense_type?
- [ ] Group by description/category?
- [ ] Drill-down to transaction level?

#### C3. Special Rules
- [ ] ADMIN_PENALTY flagged for CIT add-back?
- [ ] WELFARE tracked against limit?
- [ ] ENTERTAINMENT tracked against limit?

### D. NET PROFIT

#### D1. Formula Verification
- [ ] Gross Profit = Revenue - COGS
- [ ] Net Profit = Gross Profit - Operating Expenses
- [ ] Profit Margin = Net Profit / Revenue × 100

#### D2. Negative Profit
- [ ] Negative gross profit handled?
- [ ] Negative net profit (loss) displayed correctly?

### E. DASHBOARD CONSISTENCY

#### E1. Dashboard vs P&L
- [ ] Dashboard revenue = P&L revenue?
- [ ] Dashboard expenses = P&L total expenses?
- [ ] Dashboard profit = P&L net profit?

#### E2. Period Handling
- [ ] Same date filtering logic?
- [ ] Same trans_type filtering?

### F. DATA SYNC ISSUES

#### F1. Cross-check
- [ ] P&L revenue matches Transaction sum?
- [ ] COGS matches StockMovement.cogs_amount sum?
- [ ] Expenses breakdown matches individual queries?

## 🔍 CỤ THỂ CẦN TÌM TRONG CODE

### Tìm Revenue calculation:
```typescript
// Tìm patterns như:
trans_type: { in: ['INCOME', 'SALE'] }
trans_type: { in: ['SALE', 'INCOME'] }
```

### Tìm COGS calculation:
```typescript
// Tìm patterns như:
quantity * unit_cost
cogs_amount
cost_of_goods_sold
```

### Tìm Operating Expenses:
```typescript
// Tìm patterns như:
trans_type: 'EXPENSE'
expense_type
operating_expenses
```

### Tìm exclusion logic:
```typescript
// Tìm patterns như:
items: { none: { product_id: { not: null } } }  // Pure expense
```

## 📝 OUTPUT YÊU CẦU

Sau khi kiểm tra, trả lời theo format:

---

## PROFIT/LOSS AUDIT RESULTS

### 1. REVENUE IMPLEMENTATION

**Location:** [file:line]

**Current Query:**
```typescript
[paste actual code]
```

**Analysis:**
- Trans types included: [list]
- Date filtering: [correct/incorrect]
- Deleted filter: [yes/no]

### 2. COGS IMPLEMENTATION

**Location:** [file:line]

**Method used:** [TransactionItem.unit_cost / Product.avg_cost / StockMovement]

**Analysis:**
- Uses cost at time of sale: [Yes/No]
- Matches StockMovement: [Yes/No/Not checked]

### 3. OPERATING EXPENSES IMPLEMENTATION

**Location:** [file:line]

**Classification method:** [by trans_type / by expense_type / other]

**Issues:**
- [list any issues]

### 4. BUGS FOUND

**Bug #1: [Title]**
- Location: [file:line]
- Issue: [description]
- Impact: [what's affected]
- Fix: [proposed fix]

### 5. RECOMMENDATIONS

1. [High Priority] ...
2. [Medium Priority] ...
3. [Low Priority] ...

---

## 🧪 TEST CASES

### Test Case 1: Basic P&L - Month with Sales Only
```json
{
  "period": "2024-11-01 to 2024-11-30",
  "transactions": [
    { "type": "SALE", "total": 10000000, "items": [{ "qty": 100, "price": 90000, "cost": 70000 }] },
    { "type": "SALE", "total": 5000000, "items": [{ "qty": 50, "price": 90000, "cost": 70000 }] }
  ]
}
```
**Expected:**
- Revenue = 15,000,000
- COGS = (100 × 70,000) + (50 × 70,000) = 10,500,000
- Gross Profit = 4,500,000
- Operating Expenses = 0
- Net Profit = 4,500,000
- Margin = 30%

### Test Case 2: P&L with Expenses
```json
{
  "period": "2024-11-01 to 2024-11-30",
  "transactions": [
    { "type": "SALE", "total": 20000000, "cogs": 14000000 },
    { "type": "EXPENSE", "expense_type": "UTILITY", "total": 2000000 },
    { "type": "EXPENSE", "expense_type": "RENT", "total": 5000000 },
    { "type": "EXPENSE", "expense_type": "SALARY", "total": 8000000 }
  ]
}
```
**Expected:**
- Revenue = 20,000,000
- COGS = 14,000,000
- Gross Profit = 6,000,000
- Operating Expenses = 15,000,000
- Net Profit = -9,000,000 (Loss)
- Margin = -45%

### Test Case 3: PURCHASE vs EXPENSE
```json
{
  "transactions": [
    { "type": "PURCHASE", "total": 5000000, "items": [{ "product_id": "xxx", "qty": 100 }] },
    { "type": "EXPENSE", "total": 1000000, "items": [] }
  ]
}
```
**Expected:**
- PURCHASE → Goes to COGS (when sold later)
- EXPENSE → Goes to Operating Expenses
- PURCHASE should NOT be in Operating Expenses

### Test Case 4: Service Sale (No Products)
```json
{
  "type": "SALE",
  "total": 5000000,
  "items": [{ "product_id": null, "description": "Consulting service" }]
}
```
**Expected:**
- Revenue = 5,000,000
- COGS = 0 (no product)
- Gross Profit = 5,000,000

### Test Case 5: Mixed Sale
```json
{
  "type": "SALE",
  "total": 10000000,
  "items": [
    { "product_id": "P001", "qty": 10, "price": 500000, "cost": 300000 },
    { "description": "Installation", "price": 2000000 }
  ]
}
```
**Expected:**
- Revenue = 10,000,000
- COGS = 10 × 300,000 = 3,000,000 (only product item)
- Installation has no COGS

### Test Case 6: Expense Types for CIT
```json
{
  "transactions": [
    { "type": "EXPENSE", "expense_type": "ADMIN_PENALTY", "total": 5000000 },
    { "type": "EXPENSE", "expense_type": "WELFARE", "total": 20000000 },
    { "type": "EXPENSE", "expense_type": "NORMAL", "total": 10000000 }
  ]
}
```
**Check:**
- All show in Operating Expenses
- ADMIN_PENALTY marked for CIT add-back
- WELFARE checked against limit

### Test Case 7: Period Boundary
```json
{
  "period": "2024-11-01 to 2024-11-30",
  "transactions": [
    { "date": "2024-10-31", "type": "SALE", "total": 5000000 },
    { "date": "2024-11-01", "type": "SALE", "total": 10000000 },
    { "date": "2024-11-30", "type": "SALE", "total": 8000000 },
    { "date": "2024-12-01", "type": "SALE", "total": 3000000 }
  ]
}
```
**Expected:**
- Revenue = 10M + 8M = 18,000,000
- Oct 31 and Dec 1 excluded

### Test Case 8: Deleted Transactions
```json
{
  "transactions": [
    { "type": "SALE", "total": 10000000, "deleted_at": null },
    { "type": "SALE", "total": 5000000, "deleted_at": "2024-11-15" }
  ]
}
```
**Expected:**
- Revenue = 10,000,000 (deleted excluded)

### Test Case 9: Zero Revenue Period
```json
{
  "period": "2024-11-01 to 2024-11-30",
  "transactions": [
    { "type": "EXPENSE", "total": 5000000 }
  ]
}
```
**Expected:**
- Revenue = 0
- COGS = 0
- Gross Profit = 0
- Operating Expenses = 5,000,000
- Net Profit = -5,000,000 (Loss)
- Margin = 0% or N/A (division by zero)

### Test Case 10: Payroll as Expense
```json
{
  "payroll_paid": {
    "gross": 50000000,
    "employer_insurance": 11000000,
    "net_paid": 39000000
  }
}
```
**Expected:**
- Expense = gross + employer_insurance = 61,000,000
- Or just expense = net_paid = 39,000,000?
- Check: Does payroll create EXPENSE transactions?

---

## 📋 EXPENSE TYPE REFERENCE

| ExpenseType | Description | Tax Impact |
|-------------|-------------|------------|
| NORMAL | Chi phí thường | Deductible |
| ADMIN_PENALTY | Phạt hành chính | 100% CIT add-back |
| WELFARE | Chi phúc lợi | CIT cap (1 month avg salary) |
| MATERIALS | Nguyên vật liệu | Deductible |
| SALARY | Lương thưởng | Deductible, PIT applicable |
| UTILITY | Điện/nước/internet | Deductible, VAT deductible |
| RENT | Thuê mặt bằng | Deductible, VAT deductible |
| LOAN_REPAYMENT | Trả nợ vay | Not expense (principal) |
| ENTERTAINMENT | Tiếp khách | CIT limit |
| EQUIPMENT | Thiết bị | Deductible/Depreciate |
| VEHICLE | Phương tiện | Deductible/Depreciate |
| INSURANCE | Bảo hiểm | Deductible |

---

## 🔄 RELATED CALCULATIONS TO VERIFY

1. **Dashboard totals** should match P&L
2. **CIT calculation** uses same expense data + add-backs
3. **Cash flow report** uses same transaction data
4. **AR/AP aging** uses same revenue/expense transactions
5. **VAT report** uses same transactions for input/output VAT

```

## PROMPT END

---

## 📋 QUICK REFERENCE

### Vietnamese Financial Terms:
- Báo cáo Lãi/Lỗ = Profit & Loss Report (P&L)
- Doanh thu = Revenue
- Giá vốn hàng bán = COGS (Cost of Goods Sold)
- Lợi nhuận gộp = Gross Profit
- Chi phí hoạt động = Operating Expenses
- Lợi nhuận thuần = Net Profit
- Biên lợi nhuận = Profit Margin

### Common P&L Bugs:
1. Including PURCHASE in operating expenses
2. Using current avg_cost instead of cost at sale time
3. Not grouping expenses by type
4. Missing payroll expenses
5. Wrong date filtering
6. Including deleted transactions
7. Division by zero on profit margin
