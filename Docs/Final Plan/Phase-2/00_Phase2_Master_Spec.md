# 🗺️ PHASE 2 - MASTER SPECIFICATION

## Tổng Quan Phase 2

| Mục | Chi tiết |
|-----|----------|
| **Phase ID** | Phase 2 |
| **Tên** | Inventory + AR/AP + Reports |
| **Số Tasks** | 10 |
| **Thời gian** | 8-10 tuần |
| **Phụ thuộc** | Phase 1 hoàn thành |

---

## 📊 SƠ ĐỒ CONNECTIONS GIỮA TASKS

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PHASE 2: INVENTORY + AR/AP                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────┐                                                           │
│   │   P2-T1         │                                                           │
│   │   Database      │◄──────────── FROM PHASE 1: Transaction, Product, Partner │
│   │   Schema        │                                                           │
│   └────────┬────────┘                                                           │
│            │                                                                    │
│            ▼                                                                    │
│   ┌────────────────────────────────────────────────────────────┐                │
│   │                  INVENTORY BRANCH                           │                │
│   │  ┌─────────────────┐      ┌─────────────────┐               │                │
│   │  │   P2-T2         │      │   P2-T3         │               │                │
│   │  │   Inventory     │─────►│   Stock Reports │               │                │
│   │  │   Management    │      │   & Alerts      │               │                │
│   │  └────────┬────────┘      └─────────────────┘               │                │
│   │           │                                                  │                │
│   │           │ stocks, stock_movements                         │                │
│   │           ▼                                                  │                │
│   └───────────┬──────────────────────────────────────────────────┘               │
│               │                                                                  │
│               ▼                                                                  │
│   ┌────────────────────────────────────────────────────────────┐                │
│   │                  AR/AP BRANCH                               │                │
│   │  ┌─────────────────┐      ┌─────────────────┐               │                │
│   │  │   P2-T4         │      │   P2-T5         │               │                │
│   │  │   AR (Phải Thu) │      │   AP (Phải Trả) │               │                │
│   │  └────────┬────────┘      └────────┬────────┘               │                │
│   │           │                        │                        │                │
│   │           │ ar_transactions        │ ap_transactions        │                │
│   │           └───────────┬────────────┘                        │                │
│   │                       ▼                                      │                │
│   └───────────────────────┬──────────────────────────────────────┘               │
│                           │                                                      │
│                           ▼                                                      │
│   ┌────────────────────────────────────────────────────────────┐                │
│   │                  REPORTS BRANCH                             │                │
│   │  ┌─────────────────┐      ┌─────────────────┐               │                │
│   │  │   P2-T6         │─────►│   P2-T7         │               │                │
│   │  │   Accounting    │      │   Export Excel  │               │                │
│   │  │   Reports       │      │                 │               │                │
│   │  └────────┬────────┘      └─────────────────┘               │                │
│   │           │                                                  │                │
│   │           │ report data                                     │                │
│   │           ▼                                                  │                │
│   └───────────┬──────────────────────────────────────────────────┘               │
│               │                                                                  │
│               ▼                                                                  │
│   ┌────────────────────────────────────────────────────────────┐                │
│   │                  TAX BRANCH                                 │                │
│   │  ┌─────────────────┐      ┌─────────────────┐               │                │
│   │  │   P2-T8         │─────►│   P2-T9         │               │                │
│   │  │   VAT           │      │   Tax Package   │               │                │
│   │  │   Declaration   │      │   Export        │               │                │
│   │  └─────────────────┘      └─────────────────┘               │                │
│   └────────────────────────────────────────────────────────────┘                │
│                                                                                  │
│                           ▼                                                      │
│   ┌─────────────────────────────────────────────────────────────┐               │
│   │   P2-T10        Security & Audit (Cross-cutting)            │               │
│   │   - Session Management                                       │               │
│   │   - Failed Login Tracking                                    │               │
│   │   - Audit Logs                                               │               │
│   └─────────────────────────────────────────────────────────────┘               │
│                                                                                  │
│                           │                                                      │
│                           ▼                                                      │
│   ┌─────────────────────────────────────────────────────────────┐               │
│   │                    OUTPUT TO PHASE 3                         │               │
│   │   stocks → Fixed Asset Depreciation                          │               │
│   │   vat_declarations → Tax Engine                              │               │
│   │   audit_logs → Compliance Reports                            │               │
│   └─────────────────────────────────────────────────────────────┘               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 CHI TIẾT 10 TASKS

### Task 1: Database Schema Phase 2

| Mục | Chi tiết |
|-----|----------|
| **Inputs từ Phase 1** | `Product`, `Partner`, `Transaction`, `Account` |
| **Outputs** | `Stock`, `StockMovement`, `ARTransaction`, `APTransaction`, `PeriodLock`, `VATDeclaration`, `AuditLog` |
| **Verification** | Prisma migrate thành công, seed data |

### Task 2: Inventory Management

| Mục | Chi tiết |
|-----|----------|
| **Inputs** | Schema Task 1, Products, SALE/PURCHASE transactions |
| **Outputs** | `stocks`, `stock_movements`, COGS calculation |
| **Business Logic** | Moving Average costing, auto stock update on sale/purchase |
| **Verification** | Nhập 100kg = tồn 100kg, Bán 30kg = COGS calculated |

### Task 3: Stock Reports & Alerts

| Mục | Chi tiết |
|-----|----------|
| **Inputs** | `stocks`, `stock_movements`, min/max quantities |
| **Outputs** | Stock card, Movement history, Low stock alerts |
| **Verification** | Alert khi tồn < min_quantity |

### Task 4: AR (Accounts Receivable)

| Mục | Chi tiết |
|-----|----------|
| **Inputs** | SALE transactions với payment_method=CREDIT, Partner.balance_ar |
| **Outputs** | `ar_transactions`, Payment allocation, AR aging |
| **Business Logic** | FIFO payment allocation |
| **Verification** | Bán nợ 10tr → AR = 10tr, Thu 5tr → AR = 5tr |

### Task 5: AP (Accounts Payable)

| Mục | Chi tiết |
|-----|----------|
| **Inputs** | PURCHASE transactions với payment_method=CREDIT, Partner.balance_ap |
| **Outputs** | `ap_transactions`, Payment schedule, AP aging |
| **Business Logic** | FIFO payment allocation |
| **Verification** | Mua nợ 20tr → AP = 20tr, Trả 10tr → AP = 10tr |

### Task 6: Accounting Reports

| Mục | Chi tiết |
|-----|----------|
| **Inputs** | All transactions, Account balances |
| **Outputs** | 8 báo cáo kế toán chuẩn VN |
| **Reports** | Sổ quỹ, Sổ ngân hàng, Sổ chi tiết 131/331, Bảng cân đối tài khoản |
| **Verification** | Số liệu khớp với dữ liệu thực tế |

### Task 7: Export Excel

| Mục | Chi tiết |
|-----|----------|
| **Inputs** | Reports data từ Task 6 |
| **Outputs** | XLSX files với format VN |
| **Features** | Template chuẩn, Merged cells, Number format |
| **Verification** | File mở được bằng Excel, format đúng |

### Task 8: VAT Declaration

| Mục | Chi tiết |
|-----|----------|
| **Inputs** | Transactions với VAT, Partner.tax_code |
| **Outputs** | `vat_declarations`, Tờ khai 01/GTGT |
| **Business Logic** | VAT đầu ra - VAT đầu vào = VAT phải nộp |
| **Verification** | Tổng VAT khớp với transactions |

### Task 9: Tax Package Export

| Mục | Chi tiết |
|-----|----------|
| **Inputs** | VAT declarations, PIT data |
| **Outputs** | XML files cho phần mềm HTKK |
| **Features** | Format chuẩn Tổng cục Thuế |
| **Verification** | File import được vào HTKK |

### Task 10: Security & Audit

| Mục | Chi tiết |
|-----|----------|
| **Inputs** | All user actions |
| **Outputs** | `user_sessions`, `failed_logins`, `audit_logs` |
| **Features** | Session management, Login tracking, Change history |
| **Verification** | Mọi thay đổi data đều được log |

---

## 🔗 DEPENDENCIES MATRIX

```
          T1   T2   T3   T4   T5   T6   T7   T8   T9   T10
T1  DB    ●    →    →    →    →    →    →    →    →    →
T2  INV   ◄    ●    →    -    -    →    -    →    -    -
T3  STK   ◄    ◄    ●    -    -    →    -    -    -    -
T4  AR    ◄    -    -    ●    -    →    -    -    -    -
T5  AP    ◄    -    -    -    ●    →    -    -    -    -
T6  RPT   ◄    ◄    ◄    ◄    ◄    ●    →    →    -    -
T7  XLS   ◄    -    -    -    -    ◄    ●    -    -    -
T8  VAT   ◄    ◄    -    -    -    ◄    -    ●    →    -
T9  TAX   ◄    -    -    -    -    -    -    ◄    ●    -
T10 SEC   ◄    -    -    -    -    -    -    -    -    ●

Legend: ● = Self, → = Provides to, ◄ = Receives from, - = No dependency
```

---

## 📥 INPUTS TỪ PHASE 1

| Phase 1 Output | Phase 2 Input | Sử dụng bởi |
|----------------|---------------|-------------|
| `Product` model | Product inventory | T2, T3 |
| `Partner` model | AR/AP tracking | T4, T5 |
| `Transaction` model | Financial data | T2, T4, T5, T6, T8 |
| `Account` model | Report generation | T6 |
| `TaxRate` seed | VAT calculation | T8 |
| Auth system | Security enhancement | T10 |

---

## 📤 OUTPUTS CHO PHASE 3

| Phase 2 Output | Phase 3 Input | Chi tiết |
|----------------|---------------|----------|
| `stocks` | Fixed Asset depreciation | Inventory linked to assets |
| `vat_declarations` | Tax Engine | VAT data for CIT calculation |
| `audit_logs` | Compliance | Audit trail for reports |
| AR/AP aging | Financial Statements | Balance sheet data |
| COGS | Product Costing | Cost analysis base |

---

## ✅ VERIFICATION PLAN

### Automated Tests

```bash
# Unit Tests
npm run test:unit -- --filter=inventory
npm run test:unit -- --filter=ar-ap
npm run test:unit -- --filter=reports

# Integration Tests
npm run test:int -- --filter=stock-movement
npm run test:int -- --filter=payment-allocation

# Type Check
npm run typecheck
```

### Manual Test Scenarios

#### Scenario 1: Inventory Flow
1. Nhập kho 100kg lúa @ 10,000đ → Tồn = 100kg, Giá vốn = 10,000đ
2. Nhập kho 50kg lúa @ 12,000đ → Tồn = 150kg, Giá vốn bình quân = 10,667đ
3. Bán 80kg → COGS = 80 × 10,667 = 853,360đ
4. Tồn cuối = 70kg, Value = 70 × 10,667đ

#### Scenario 2: AR/AP Flow
1. Bán nợ cho KH001: 10,000,000đ → AR = 10tr
2. Thu tiền 6,000,000đ → AR = 4tr (FIFO allocated)
3. Aging report shows: 0-30 days: 4tr

#### Scenario 3: VAT Declaration
1. Bán hàng VAT 10%: 100tr + 10tr VAT = 110tr
2. Mua hàng VAT 10%: 50tr + 5tr VAT = 55tr
3. Tờ khai: VAT đầu ra 10tr - VAT đầu vào 5tr = 5tr phải nộp

### Integration Checkpoints

- [ ] SALE transaction → Auto stock out → COGS calculated
- [ ] PURCHASE creditn → Auto stock in → AP created
- [ ] VAT amounts → Aggregate correctly in declaration
- [ ] All actions → Audit log created

---

## 📅 TIMELINE ESTIMATE

| Giai đoạn | Tasks | Thời gian |
|-----------|-------|-----------|
| Week 1-2 | T1 (Schema), T2 (Inventory) | 15-20h |
| Week 3 | T3 (Stock Reports) | 8-10h |
| Week 4-5 | T4 (AR), T5 (AP) | 16-20h |
| Week 6-7 | T6 (Reports), T7 (Excel) | 15-18h |
| Week 8-9 | T8 (VAT), T9 (Tax Package) | 14-16h |
| Week 10 | T10 (Security) | 8-10h |
| **Total** | **10 Tasks** | **76-94h** |

---

## 🎯 SUCCESS CRITERIA

1. **Inventory Accuracy**: Moving average cost calculated correctly
2. **AR/AP Balance**: Partner balances match transaction totals
3. **Report Accuracy**: All reports match source data
4. **VAT Compliance**: Declaration matches actual VAT
5. **Audit Trail**: 100% of changes logged
6. **Export Quality**: Excel & XML files work with external tools

---

**Next Phase:** Phase 3 - Tax Engine + Financial Statements
