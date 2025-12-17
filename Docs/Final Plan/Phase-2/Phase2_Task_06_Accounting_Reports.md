# 📋 PHASE 2 - TASK 6: ACCOUNTING REPORTS

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P2-T6 |
| **Tên** | Accounting Reports - 8 Báo Cáo Kế Toán |
| **Thời gian** | 10-12 giờ |
| **Phụ thuộc** | Task 2-5 (Inventory, AR, AP) |
| **Task tiếp theo** | Task 7 (Export Excel) |

---

## 📋 MỤC TIÊU

- 8 báo cáo kế toán chuẩn Việt Nam
- Sổ quỹ tiền mặt, Sổ ngân hàng
- Sổ chi tiết 131, 331
- Bảng cân đối tài khoản

---

## 📥 INPUTS

| Input | Từ | Chi tiết |
|-------|-----|----------|
| Transactions | Phase 1 | Thu chi tiền |
| Stocks | Task 2 | Tồn kho, COGS |
| AR/AP | Task 4-5 | Công nợ |
| Accounts | Phase 1 | Hệ thống TK |

---

## PHẦN 1: DANH SÁCH BÁO CÁO

| # | Mã | Tên Báo Cáo | Mô tả |
|---|-----|-------------|-------|
| 1 | SQ | Sổ Quỹ Tiền Mặt | Thu chi tiền mặt (TK 111) |
| 2 | SNH | Sổ Ngân Hàng | Tiền gửi NH (TK 112) |
| 3 | S131 | Sổ Chi Tiết 131 | Phải thu khách hàng |
| 4 | S331 | Sổ Chi Tiết 331 | Phải trả NCC |
| 5 | S156 | Sổ Chi Tiết 156 | Hàng hóa/Tồn kho |
| 6 | BCĐTK | Bảng Cân Đối TK | Số dư các tài khoản |
| 7 | NKC | Nhật Ký Chung | Tất cả bút toán |
| 8 | SCT | Sổ Cái Tổng Hợp | Chi tiết theo TK |

---

## PHẦN 2: API ENDPOINTS

| Method | Endpoint | Params |
|--------|----------|--------|
| GET | /api/reports/cash-book | from, to, type |
| GET | /api/reports/bank-book | from, to, bank_id |
| GET | /api/reports/ar-detail | from, to, partner_id |
| GET | /api/reports/ap-detail | from, to, partner_id |
| GET | /api/reports/inventory-detail | from, to, product_id |
| GET | /api/reports/trial-balance | as_of_date |
| GET | /api/reports/general-journal | from, to |
| GET | /api/reports/general-ledger | from, to, account_code |

---

## PHẦN 3: SỔ QUỸ TIỀN MẶT (Ví dụ)

```typescript
// GET /api/reports/cash-book

interface CashBookEntry {
  date: string;
  code: string;
  description: string;
  receipt: number;     // Thu
  payment: number;     // Chi
  balance: number;     // Tồn
  partner_name?: string;
  ref_number?: string;
}

interface CashBookResponse {
  period: { from, to };
  opening_balance: number;
  entries: CashBookEntry[];
  total_receipt: number;
  total_payment: number;
  closing_balance: number;
}

export async function getCashBook(farmId: string, from: Date, to: Date) {
  // Get opening balance at 'from' date
  const openingBalance = await getAccountBalance(farmId, '111', from);
  
  // Get transactions in period
  const transactions = await prisma.transaction.findMany({
    where: {
      farm_id: farmId,
      trans_date: { gte: from, lte: to },
      payment_method: 'CASH',
      type: { in: ['CASH_IN', 'CASH_OUT', 'SALE', 'PURCHASE', 'PAYROLL'] },
    },
    orderBy: { trans_date: 'asc' },
  });
  
  // Build entries with running balance
  let balance = openingBalance;
  const entries = transactions.map(t => {
    const isReceipt = ['CASH_IN', 'SALE'].includes(t.type);
    const amount = Number(t.amount);
    balance += isReceipt ? amount : -amount;
    
    return {
      date: t.trans_date,
      code: t.code,
      description: t.description,
      receipt: isReceipt ? amount : 0,
      payment: isReceipt ? 0 : amount,
      balance,
    };
  });
  
  return {
    period: { from, to },
    opening_balance: openingBalance,
    entries,
    total_receipt: entries.reduce((s, e) => s + e.receipt, 0),
    total_payment: entries.reduce((s, e) => s + e.payment, 0),
    closing_balance: balance,
  };
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### Reports API
- [ ] Sổ quỹ tiền mặt
- [ ] Sổ ngân hàng
- [ ] Sổ chi tiết 131
- [ ] Sổ chi tiết 331
- [ ] Sổ chi tiết 156
- [ ] Bảng cân đối TK
- [ ] Nhật ký chung
- [ ] Sổ cái tổng hợp

### UI
- [ ] Report viewer component
- [ ] Date range picker
- [ ] Filter by account/partner

---

## 🔗 KẾT NỐI

### Output → Task 7 (Export Excel)
- Report data cho Excel export

### Output → Phase 3 (Financial Statements)
- Trial Balance → Balance Sheet, Income Statement

---

**Estimated Time:** 10-12 giờ  
**Next Task:** Task 7 - Export Excel
