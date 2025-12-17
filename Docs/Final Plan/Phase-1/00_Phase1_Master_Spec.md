# 🗺️ PHASE 1 - MASTER SPECIFICATION

## Tổng Quan Phase 1

| Mục | Chi tiết |
|-----|----------|
| **Phase ID** | Phase 1 |
| **Tên** | Core ERP Mini - Foundation |
| **Số Tasks** | 9 |
| **Thời gian** | 5-6 tuần |
| **Phụ thuộc** | Không có (Phase đầu tiên) |

---

## 📊 SƠ ĐỒ CONNECTIONS GIỮA TASKS

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PHASE 1: CORE ERP MINI                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────┐                                                           │
│   │   P1-T1         │                                                           │
│   │   Database      │──── Schema cho TOÀN BỘ Phase 1-2                         │
│   │   Schema        │                                                           │
│   └────────┬────────┘                                                           │
│            │                                                                    │
│            ▼                                                                    │
│   ┌─────────────────┐                                                           │
│   │   P1-T2         │                                                           │
│   │   Authentication│──── JWT, Login/Register, Protected Routes                │
│   └────────┬────────┘                                                           │
│            │                                                                    │
│            ▼                                                                    │
│   ┌─────────────────┐                                                           │
│   │   P1-T3         │                                                           │
│   │   Farm/User     │──── Settings, Staff CRUD, Dynamic Labels                 │
│   │   Management    │                                                           │
│   └────────┬────────┘                                                           │
│            │                                                                    │
│   ┌────────┴────────┐                                                           │
│   ▼                 ▼                                                           │
│   ┌─────────────────┐   ┌─────────────────┐                                     │
│   │   P1-T4         │   │   P1-T7         │                                     │
│   │   Products &    │   │   Workers &     │                                     │
│   │   Partners      │   │   PIT           │                                     │
│   └────────┬────────┘   └────────┬────────┘                                     │
│            │                     │                                              │
│            ▼                     │ (Parallel branch)                            │
│   ┌─────────────────┐            │                                              │
│   │   P1-T5         │            │                                              │
│   │   Transactions  │◄───────────┘                                              │
│   │   (Cash In/Out) │                                                           │
│   └────────┬────────┘                                                           │
│            │                                                                    │
│            ▼                                                                    │
│   ┌─────────────────┐                                                           │
│   │   P1-T6         │                                                           │
│   │   Sales &       │                                                           │
│   │   Purchases     │                                                           │
│   └────────┬────────┘                                                           │
│            │                                                                    │
│   ┌────────┴────────┐                                                           │
│   ▼                 ▼                                                           │
│   ┌─────────────────┐   ┌─────────────────┐                                     │
│   │   P1-T8         │   │   P1-T9         │                                     │
│   │   Dashboard &   │   │   OCR           │                                     │
│   │   Reports       │   │   Integration   │                                     │
│   └─────────────────┘   └─────────────────┘                                     │
│                                                                                  │
│                           │                                                      │
│                           ▼                                                      │
│   ┌─────────────────────────────────────────────────────────────┐               │
│   │                    OUTPUT TO PHASE 2                         │               │
│   │   Database Schema → Extend with Inventory, AR/AP             │               │
│   │   Transaction → Link to Stock Movements                      │               │
│   │   Partner.balance → Migrate to AR/AP Transactions            │               │
│   │   VAT amounts → VAT Declaration                              │               │
│   └─────────────────────────────────────────────────────────────┘               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 CHI TIẾT 9 TASKS

| Task | Tên | Inputs | Outputs | Verification |
|------|-----|--------|---------|--------------|
| T1 | Database Schema | - | All models, Seed data | `prisma generate` OK |
| T2 | Authentication | User model | JWT token, Auth store | Login/Register works |
| T3 | Farm/User Mgmt | Auth context | Settings UI, Staff CRUD | Update farm settings |
| T4 | Products/Partners | Farm context | CRUD APIs, UI | Add/Edit/Delete |
| T5 | Transactions | Products, Partners | Cash In/Out, Code gen | Transaction codes |
| T6 | Sales/Purchases | Transactions | Items, VAT calc, Balance | Partner balance update |
| T7 | Workers/PIT | - | Attendance, PIT calc | PIT quy tắc 2tr |
| T8 | Dashboard | All transactions | Charts, Summary | Totals match data |
| T9 | OCR | Transaction API | Invoice parser | Extract MST, Amount |

---

## 🔗 DEPENDENCIES MATRIX

```
          T1   T2   T3   T4   T5   T6   T7   T8   T9
T1  DB    ●    →    →    →    →    →    →    →    →
T2  AUTH  ◄    ●    →    →    →    →    →    →    →
T3  FARM  ◄    ◄    ●    →    →    -    -    -    -
T4  PROD  ◄    ◄    ◄    ●    →    →    -    -    -
T5  TXN   ◄    ◄    -    ◄    ●    →    ◄    →    →
T6  SALE  ◄    ◄    -    ◄    ◄    ●    -    →    -
T7  WORK  ◄    ◄    -    -    ◄    -    ●    →    -
T8  DASH  ◄    ◄    -    -    ◄    ◄    ◄    ●    -
T9  OCR   ◄    ◄    -    -    ◄    -    -    -    ●
```

---

## 📤 OUTPUTS CHO PHASE 2

| Output | Phase 2 Input | Chi tiết |
|--------|---------------|----------|
| All database models | Schema extension | Add inventory, AR/AP tables |
| Transaction model | Stock movements | Auto create when sale/purchase |
| Partner.balance_ar/ap | AR/AP Transactions | Migrate to detailed records |
| VAT amounts | VAT Declaration | Aggregate for tax filing |
| OCR extracted MST | VAT validation | Verify tax codes |

---

## ✅ VERIFICATION PLAN

### Test Commands
```bash
npm run typecheck
npm run lint
npm run test
```

### Manual Test Scenarios
1. **Auth Flow**: Register → Login → Access Dashboard
2. **Master Data**: Add Product → Add Partner → Verify lists
3. **Transactions**: Thu tiền → Chi tiền → Check totals
4. **Sales/Purchases**: Bán hàng + VAT → Balance update
5. **Workers**: Chấm công → Thanh toán → PIT calculated
6. **Dashboard**: Verify all totals match

---

## 📅 TIMELINE ESTIMATE

| Week | Tasks | Hours |
|------|-------|-------|
| 1 | T1, T2 | 6-8h |
| 2 | T3, T4 | 6-8h |
| 3 | T5, T6 | 11-14h |
| 4 | T7 | 5-6h |
| 5 | T8, T9 | 8-10h |
| **Total** | **9 Tasks** | **36-46h** |
