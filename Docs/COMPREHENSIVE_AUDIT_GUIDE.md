# 🔍 COMPREHENSIVE CODE AUDIT GUIDE
## Cho AI Assistant - LABA ERP

---

## 🎯 MỤC TIÊU

Audit này cần kiểm tra **3 LOẠI VẤN ĐỀ**:

1. **Prisma Patterns** - Cách dùng Prisma đúng/sai
2. **Business Logic Bugs** - Logic nghiệp vụ sai
3. **Data Consistency** - Data không khớp/linked sai

---

## 📋 CHECKLIST TỔNG QUAN

### A. PRISMA PATTERNS (Technical)
- [ ] `create` dùng `connect` cho relations
- [ ] `update` dùng `connect/disconnect` cho relations
- [ ] `where` clause dùng đúng fields

### B. BUSINESS LOGIC (Functional)
- [ ] Query filters đúng với nghiệp vụ
- [ ] Query đúng table/model
- [ ] Tính toán đúng công thức
- [ ] Xử lý edge cases

### C. DATA CONSISTENCY
- [ ] Foreign keys link đúng records
- [ ] Amounts/totals tính đúng
- [ ] Status updates đồng bộ

---

## 🔴 LOẠI 1: BUSINESS LOGIC BUGS

### Bug Pattern 1: Query Filter Sai

**Ví dụ thực tế từ ar.service.ts:**
```typescript
// ❌ SAI - Chỉ query INCOME, thiếu SALE
const transactions = await prisma.transaction.findMany({
  where: {
    farm_id: farmId,
    trans_type: 'INCOME',  // ❌ Thiếu 'SALE'
  }
});

// ✅ ĐÚNG - Include cả INCOME và SALE
const transactions = await prisma.transaction.findMany({
  where: {
    farm_id: farmId,
    trans_type: { in: ['INCOME', 'SALE'] },  // ✅ Bao gồm cả 2
  }
});
```

**Các trường hợp cần check:**

| Module | Nghiệp vụ | Trans Types cần include |
|--------|-----------|------------------------|
| AR (Công nợ phải thu) | Doanh thu | `SALE`, `INCOME` |
| AP (Công nợ phải trả) | Chi phí | `PURCHASE`, `EXPENSE` |
| VAT Output | VAT bán ra | `SALE` |
| VAT Input | VAT mua vào | `PURCHASE`, `EXPENSE` |
| Revenue Report | Báo cáo doanh thu | `SALE`, `INCOME` |
| Expense Report | Báo cáo chi phí | `PURCHASE`, `EXPENSE` |

---

### Bug Pattern 2: Query Sai Table

**Ví dụ thực tế:**
```typescript
// ❌ SAI - Query ARTransaction khi cần Transaction
// ARTransaction là bảng tracking công nợ, không phải giao dịch gốc
const sales = await prisma.aRTransaction.findMany({
  where: { farm_id: farmId }
});

// ✅ ĐÚNG - Query Transaction table
const sales = await prisma.transaction.findMany({
  where: { 
    farm_id: farmId,
    trans_type: { in: ['SALE', 'INCOME'] }
  }
});
```

**Phân biệt các tables:**

| Table | Mục đích | Khi nào query |
|-------|----------|---------------|
| `Transaction` | Giao dịch gốc (bán/mua/thu/chi) | Báo cáo doanh thu, chi phí, VAT |
| `ARTransaction` | Tracking công nợ phải thu | Báo cáo công nợ KH, aging |
| `APTransaction` | Tracking công nợ phải trả | Báo cáo công nợ NCC, aging |
| `Stock` | Tồn kho hiện tại | Kiểm kê, cảnh báo tồn |
| `StockMovement` | Lịch sử xuất/nhập | Báo cáo xuất nhập tồn |

---

### Bug Pattern 3: Thiếu Join/Include

```typescript
// ❌ SAI - Thiếu include partner info
const transactions = await prisma.transaction.findMany({
  where: { farm_id: farmId }
});
// transactions[0].partner = undefined!

// ✅ ĐÚNG - Include partner
const transactions = await prisma.transaction.findMany({
  where: { farm_id: farmId },
  include: {
    partner: { select: { id: true, code: true, name: true } }
  }
});
```

---

### Bug Pattern 4: Aggregation Sai

```typescript
// ❌ SAI - Sum cả paid và unpaid
const totalRevenue = await prisma.transaction.aggregate({
  where: { farm_id: farmId, trans_type: 'SALE' },
  _sum: { total_amount: true }  // Bao gồm cả chưa thu tiền
});

// ✅ ĐÚNG cho "Thực thu" - Chỉ sum paid_amount
const actualReceived = await prisma.transaction.aggregate({
  where: { farm_id: farmId, trans_type: 'SALE' },
  _sum: { paid_amount: true }
});

// ✅ ĐÚNG cho "Doanh thu" - Sum total_amount (bao gồm cả công nợ)
const totalRevenue = await prisma.transaction.aggregate({
  where: { farm_id: farmId, trans_type: 'SALE' },
  _sum: { total_amount: true }
});
```

---

### Bug Pattern 5: Date Filter Sai

```typescript
// ❌ SAI - Thiếu giờ phút giây, có thể miss records
const startDate = new Date('2024-11-01');
const endDate = new Date('2024-11-30');

// ✅ ĐÚNG - Set đúng thời gian đầu/cuối ngày
const startDate = new Date('2024-11-01T00:00:00.000Z');
const endDate = new Date('2024-11-30T23:59:59.999Z');

// Hoặc dùng gte/lte properly
where: {
  trans_date: {
    gte: startOfMonth,
    lte: endOfMonth
  }
}
```

---

## 🟡 LOẠI 2: DATA LINKING BUGS

### Bug Pattern 6: FK Link Sai Record

```typescript
// ❌ SAI - Link sai customer_id
const arTrans = await prisma.aRTransaction.create({
  data: {
    customer_id: transaction.id,  // ❌ Dùng transaction.id thay vì partner_id!
    ...
  }
});

// ✅ ĐÚNG
const arTrans = await prisma.aRTransaction.create({
  data: {
    customer: { connect: { id: transaction.partner_id } },  // ✅ Đúng partner
    transaction: { connect: { id: transaction.id } },       // ✅ Link transaction
    ...
  }
});
```

---

### Bug Pattern 7: Không Sync Related Records

```typescript
// ❌ SAI - Update transaction nhưng không update AR
await prisma.transaction.update({
  where: { id: transactionId },
  data: { paid_amount: newPaidAmount }
});
// ARTransaction.balance vẫn cũ!

// ✅ ĐÚNG - Update cả 2 trong transaction
await prisma.$transaction(async (tx) => {
  await tx.transaction.update({
    where: { id: transactionId },
    data: { paid_amount: newPaidAmount }
  });
  
  await tx.aRTransaction.update({
    where: { transaction_id: transactionId },
    data: { 
      paid_amount: newPaidAmount,
      balance: totalAmount - newPaidAmount,
      status: newPaidAmount >= totalAmount ? 'PAID' : 'PARTIAL'
    }
  });
});
```

---

## 🟢 LOẠI 3: PRISMA PATTERNS

(Xem chi tiết trong PRISMA_RELATION_AUDIT_GUIDE.md)

### Quick Reference:
```typescript
// ❌ SAI
await prisma.product.create({
  data: { farm_id: farmId, ... }
});

// ✅ ĐÚNG
await prisma.product.create({
  data: { 
    ...,
    farm: { connect: { id: farmId } }
  }
});
```

---

## 📝 AI AUDIT PROMPT TEMPLATE

```
Hãy audit file `src/services/[FILENAME].ts` và tìm các vấn đề sau:

## 1. BUSINESS LOGIC BUGS

### 1.1 Query Filters
- [ ] Các query có filter đúng trans_type không?
  - AR queries: cần include cả 'SALE' và 'INCOME'
  - AP queries: cần include cả 'PURCHASE' và 'EXPENSE'
- [ ] Có thiếu filter nào quan trọng không? (farm_id, deleted_at, status)

### 1.2 Query Tables
- [ ] Query đúng table cho mục đích không?
  - Doanh thu/Chi phí → Transaction table
  - Công nợ → ARTransaction/APTransaction table
  - Tồn kho → Stock table
  - Lịch sử kho → StockMovement table

### 1.3 Calculations
- [ ] Aggregations (sum, count) đúng không?
- [ ] Date ranges đúng không?
- [ ] Amount calculations đúng không? (subtotal, vat, total)

### 1.4 Data Sync
- [ ] Khi update Transaction, có update AR/AP không?
- [ ] Khi update Stock, có tạo StockMovement không?
- [ ] Status transitions có logic đúng không?

## 2. PRISMA PATTERNS
- [ ] create/update dùng `connect` cho relations
- [ ] Optional relations dùng conditional spread

## 3. OUTPUT YÊU CẦU
1. List tất cả bugs tìm được với line numbers
2. Giải thích tại sao đây là bug
3. Đưa ra code sửa đề xuất
```

---

## 🔧 SERVICE-SPECIFIC CHECKLIST

### ar.service.ts
- [ ] `getARTransactions`: Query đúng ARTransaction table ✓
- [ ] `getARSummary`: Tính đúng total_receivable, total_received
- [ ] Revenue queries: Include cả `SALE` và `INCOME` trans_types
- [ ] `createARFromTransaction`: Link đúng customer từ transaction.partner_id
- [ ] Payment allocation: Update đúng AR balance và status

### ap.service.ts  
- [ ] `getAPTransactions`: Query đúng APTransaction table ✓
- [ ] Expense queries: Include cả `PURCHASE` và `EXPENSE` trans_types
- [ ] `createAPFromTransaction`: Link đúng vendor từ transaction.partner_id
- [ ] Payment allocation: Update đúng AP balance và status

### inventory.service.ts
- [ ] Stock updates: Tạo StockMovement khi thay đổi
- [ ] Moving average cost: Tính đúng khi nhập hàng
- [ ] COGS calculation: Dùng avg_cost đúng khi xuất

### vat.service.ts
- [ ] Input VAT: Query `PURCHASE` và `EXPENSE` có VAT
- [ ] Output VAT: Query `SALE` có VAT
- [ ] VAT deductibility: Check đúng rules (cash >= 20M, có hóa đơn)

### payroll.service.ts
- [ ] Insurance: Tính đúng % theo worker_type
- [ ] PIT: Áp dụng đúng tax table theo labor_type
- [ ] Deductions: Trừ đúng thứ tự (BHXH → personal → dependents)

### transaction.service.ts
- [ ] Auto-create AR: Khi tạo SALE với status != PAID
- [ ] Auto-create AP: Khi tạo PURCHASE với status != PAID
- [ ] Stock update: Khi tạo SALE/PURCHASE có products

---

## 📊 EXPECTED RESULTS FORMAT

```markdown
## AUDIT RESULTS: [filename]

### 🔴 CRITICAL BUGS (Logic errors)

1. **Line XX: Wrong query filter**
   - Issue: Chỉ query `trans_type = 'INCOME'`, thiếu `'SALE'`
   - Impact: Missing revenue data in reports
   - Fix: `trans_type: { in: ['SALE', 'INCOME'] }`

2. **Line YY: Query wrong table**
   - Issue: Query ARTransaction thay vì Transaction
   - Impact: Data không đúng với source
   - Fix: Change to `prisma.transaction.findMany(...)`

### 🟡 MEDIUM ISSUES (Data consistency)

1. **Line ZZ: Missing sync**
   - Issue: Update transaction nhưng không update AR
   - Fix: Add AR update in same transaction

### 🟢 MINOR ISSUES (Prisma patterns)

1. **Line AA: Raw foreign key**
   - Issue: `farm_id: farmId` thay vì `farm: { connect: ... }`
   - Fix: Use connect pattern
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Business logic bugs NGUY HIỂM HƠN** Prisma pattern issues
   - Prisma patterns sai có thể vẫn chạy được
   - Logic bugs gây ra data sai, báo cáo sai

2. **Luôn verify với schema.prisma**
   - Check đúng field names
   - Check đúng relation names
   - Check required vs optional fields

3. **Test cases quan trọng**
   - Transaction với SALE type → phải xuất hiện trong AR queries
   - Transaction với PURCHASE type → phải xuất hiện trong AP queries
   - Payment → phải update cả Transaction và AR/AP

4. **Cross-reference giữa services**
   - transaction.service.ts tạo Transaction
   - ar.service.ts/ap.service.ts query Transaction
   - Cần đảm bảo query filters khớp với data được tạo
