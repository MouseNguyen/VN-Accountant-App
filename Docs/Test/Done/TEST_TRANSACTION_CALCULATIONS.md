# 🧪 AI PROMPT: Test Transaction Calculations
## LABA ERP - Transaction Module Testing

---

## PROMPT START

```
Bạn là QA Engineer đang test module Transaction của LABA ERP. 
Hãy kiểm tra toàn bộ flow tính toán Transaction.

## 📁 FILES CẦN KIỂM TRA

1. Service: `src/services/transaction.service.ts`
2. API Route: `src/app/api/transactions/route.ts`
3. Create Page: `src/app/(dashboard)/giao-dich/tao/page.tsx`
4. List Page: `src/app/(dashboard)/giao-dich/page.tsx`
5. Types/Schema: Tìm Zod schema hoặc TypeScript types cho Transaction

## 📊 CALCULATION FORMULAS TO VERIFY

### 1. Item Level Calculations
```
item.amount = item.quantity × item.unit_price
item.vat_amount = item.amount × item.vat_rate / 100
item.total = item.amount + item.vat_amount
```

### 2. Transaction Level Calculations
```
subtotal = SUM(items[].amount)
         = SUM(items[].quantity × items[].unit_price)

vat_amount = SUM(items[].vat_amount)
           = SUM(items[].amount × items[].vat_rate / 100)

total_amount = subtotal + vat_amount
             = SUM(items[].total)

discount_amount = (có thể là fixed hoặc percentage)
grand_total = total_amount - discount_amount

paid_amount = số tiền đã thanh toán
balance = total_amount - paid_amount
```

### 3. Payment Status Logic
```
if (paid_amount === 0) → status = 'UNPAID'
if (paid_amount > 0 && paid_amount < total_amount) → status = 'PARTIAL'
if (paid_amount >= total_amount) → status = 'PAID'
```

## ✅ CHECKLIST KIỂM TRA

### A. SERVICE LAYER (`transaction.service.ts`)

#### A1. Create Transaction Function
- [ ] Tìm function tạo transaction (createTransaction, create, etc.)
- [ ] Kiểm tra cách tính subtotal
- [ ] Kiểm tra cách tính vat_amount
- [ ] Kiểm tra cách tính total_amount
- [ ] Kiểm tra logic payment_status
- [ ] Kiểm tra có validate input không (quantity > 0, unit_price > 0)

#### A2. Rounding & Precision
- [ ] Có làm tròn số tiền không? (VND không có decimal)
- [ ] Dùng Decimal hoặc number?
- [ ] Có risk floating point errors không?

#### A3. Edge Cases
- [ ] quantity = 0 → handled?
- [ ] unit_price = 0 → handled?
- [ ] vat_rate = 0 → handled correctly?
- [ ] Empty items array → handled?
- [ ] Negative values → rejected?

### B. API LAYER (`/api/transactions/route.ts`)

#### B1. Input Validation
- [ ] Có Zod schema validate input không?
- [ ] Required fields được check?
- [ ] Number fields có min/max?
- [ ] Enum fields (trans_type, payment_method) validated?

#### B2. Response Format
- [ ] Response trả về đầy đủ calculated fields?
- [ ] Format số tiền đúng (number, không phải string)?

### C. UI LAYER (Page Components)

#### C1. Form Validation
- [ ] Required fields có mark *?
- [ ] Number inputs có min="0"?
- [ ] Real-time calculation khi user nhập?

#### C2. Display Calculations
- [ ] Subtotal hiển thị đúng format VND?
- [ ] VAT amount hiển thị đúng?
- [ ] Total hiển thị đúng?
- [ ] Balance hiển thị đúng?

### D. DATA CONSISTENCY

#### D1. Database vs Display
- [ ] Số lưu trong DB = số hiển thị?
- [ ] Không có rounding differences?

#### D2. Related Records
- [ ] TransactionItems được tạo đúng?
- [ ] Mỗi item có đúng calculations?

## 🔍 CỤ THỂ CẦN TÌM TRONG CODE

### Tìm calculation logic:
```typescript
// Tìm patterns như:
subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
vat_amount = items.reduce((sum, item) => sum + (item.amount * item.vat_rate / 100), 0)
total_amount = subtotal + vat_amount
```

### Tìm rounding:
```typescript
// Tìm patterns như:
Math.round()
Math.floor()
.toFixed()
Decimal()
roundMoney()
```

### Tìm validation:
```typescript
// Tìm patterns như:
z.number().min(0)
z.number().positive()
if (quantity <= 0) throw
```

## 📝 OUTPUT YÊU CẦU

Sau khi kiểm tra, trả lời theo format:

---

## TRANSACTION CALCULATION AUDIT RESULTS

### 1. CALCULATION IMPLEMENTATION

**Location:** [file:line]

**Current Implementation:**
```typescript
[paste actual code]
```

**Analysis:**
- ✅ Correct: [what's correct]
- ❌ Issue: [what's wrong]
- ⚠️ Warning: [potential issues]

### 2. BUGS FOUND

**Bug #1: [Title]**
- File: [path]
- Line: [number]
- Issue: [description]
- Expected: [what should happen]
- Actual: [what happens]
- Fix:
```typescript
[proposed fix]
```

### 3. EDGE CASES NOT HANDLED

| Case | Current Behavior | Should Be |
|------|-----------------|-----------|
| quantity = 0 | [behavior] | [expected] |
| ... | ... | ... |

### 4. ROUNDING ISSUES

- [ ] Money rounding: [status]
- [ ] Decimal precision: [status]
- [ ] Floating point: [status]

### 5. VALIDATION GAPS

| Field | Has Validation | Type | Issues |
|-------|---------------|------|--------|
| quantity | Yes/No | [type] | [issues] |
| unit_price | Yes/No | [type] | [issues] |
| vat_rate | Yes/No | [type] | [issues] |

### 6. RECOMMENDATIONS

1. [High Priority] ...
2. [Medium Priority] ...
3. [Low Priority] ...

---

## 🧪 TEST CASES TO RUN MANUALLY

Sau khi audit code, test với các cases sau:

### Test Case 1: Basic Sale
```json
{
  "trans_type": "SALE",
  "items": [
    { "product_id": "xxx", "quantity": 10, "unit_price": 100000, "vat_rate": 10 }
  ]
}
```
**Expected:**
- subtotal = 10 × 100,000 = 1,000,000
- vat_amount = 1,000,000 × 10% = 100,000
- total_amount = 1,100,000

### Test Case 2: Multiple Items with Different VAT
```json
{
  "trans_type": "SALE",
  "items": [
    { "quantity": 5, "unit_price": 200000, "vat_rate": 10 },
    { "quantity": 3, "unit_price": 150000, "vat_rate": 5 },
    { "quantity": 2, "unit_price": 50000, "vat_rate": 0 }
  ]
}
```
**Expected:**
- Item 1: amount=1,000,000, vat=100,000
- Item 2: amount=450,000, vat=22,500
- Item 3: amount=100,000, vat=0
- subtotal = 1,550,000
- vat_amount = 122,500
- total_amount = 1,672,500

### Test Case 3: Zero VAT
```json
{
  "trans_type": "SALE",
  "items": [
    { "quantity": 100, "unit_price": 5000, "vat_rate": 0 }
  ]
}
```
**Expected:**
- subtotal = 500,000
- vat_amount = 0
- total_amount = 500,000

### Test Case 4: Partial Payment
```json
{
  "trans_type": "SALE",
  "total_amount": 1000000,
  "paid_amount": 400000
}
```
**Expected:**
- balance = 600,000
- payment_status = "PARTIAL"

### Test Case 5: Fractional Quantities (Edge Case)
```json
{
  "items": [
    { "quantity": 2.5, "unit_price": 33333, "vat_rate": 10 }
  ]
}
```
**Expected:**
- amount = 83,332.5 → round to 83,333
- vat = 8,333.25 → round to 8,333
- total = 91,666

### Test Case 6: Large Numbers
```json
{
  "items": [
    { "quantity": 1000, "unit_price": 99999999, "vat_rate": 10 }
  ]
}
```
**Expected:**
- Không overflow
- Calculations vẫn đúng

### Test Case 7: Edge - Empty Items
```json
{
  "trans_type": "SALE",
  "items": []
}
```
**Expected:**
- Should reject hoặc handle gracefully

### Test Case 8: Edge - Zero Quantity
```json
{
  "items": [
    { "quantity": 0, "unit_price": 100000, "vat_rate": 10 }
  ]
}
```
**Expected:**
- Should reject

```

## PROMPT END

---

## 📋 QUICK REFERENCE

### Vietnamese Accounting Rules for VAT:
- Standard rates: 0%, 5%, 8%, 10%
- VAT = subtotal × rate / 100
- Round to nearest VND (no decimals)

### Common Bugs to Look For:
1. Using `+` instead of proper number addition (string concat)
2. Not converting Decimal to number before calculation
3. Floating point precision issues
4. Missing null/undefined checks
5. Wrong order of operations

### Files to Cross-Reference:
- `prisma/schema.prisma` - Check field types (Decimal vs Int)
- `src/lib/utils.ts` - Check roundMoney() function
- `src/types/*.ts` - Check TypeScript types
