# 🔍 PRISMA RELATIONS AUDIT REPORT
## LABA ERP - New Codebase Analysis

**Date:** December 16, 2025

---

## 📊 SUMMARY

| Component | Status | Details |
|-----------|--------|---------|
| **Seed File** | ✅ FIXED | Uses `connect` pattern correctly |
| **Service Files** | ❌ NOT FIXED | Still using raw foreign keys |

---

## ✅ SEED FILE - PASSED

File: `seed-all-phases-test-data1.ts`

```
Connect patterns: 34
Raw farm_id (in create): 0
```

**Examples of correct patterns found:**
```typescript
farm: { connect: { id: farm.id } }
partner: { connect: { id: partners[s.partner].id } }
worker: { connect: { id: worker.id } }
```

---

## ❌ SERVICE FILES - NEED FIX

All service files still use raw foreign keys in `create` operations:

| File | Creates | Raw FK | Connect |
|------|---------|--------|---------|
| ap.service.ts | 5 | 28 | 0 |
| ar.service.ts | 4 | 29 | 0 |
| attendance.service.ts | 2 | 17 | 0 |
| audit-log.service.ts | 8 | 6 | 0 |
| dashboard.service.ts | 0 | 18 | 0 |
| inventory.service.ts | 8 | 33 | 0 |
| invoice.service.ts | 7 | 15 | 0 |
| payable.service.ts | 5 | 30 | 0 |
| payroll.service.ts | 7 | 12 | 0 |
| period-lock.service.ts | 1 | 10 | 0 |
| report.service.ts | 0 | 15 | 0 |
| reports.service.ts | 0 | 30 | 0 |
| stock-alerts.service.ts | 0 | 4 | 0 |
| stock-reports.service.ts | 0 | 18 | 0 |
| tax-package.service.ts | 4 | 7 | 0 |
| tax-report.service.ts | 2 | 8 | 0 |
| transaction.service.ts | 2 | 4 | 1 |
| vat.service.ts | 2 | 4 | 0 |
| worker.service.ts | 2 | 1 | 0 |

**Total: 61 create operations using raw FK patterns**

---

## 🔧 EXAMPLE OF ISSUE

### Current (Wrong):
```typescript
// ap.service.ts line 272
const apTrans = await tx.aPTransaction.create({
    data: {
        farm_id: farmId,          // ❌ Wrong
        vendor_id: input.vendor_id, // ❌ Wrong
        type: 'INVOICE',
        code,
        ...
    },
});
```

### Should Be:
```typescript
const apTrans = await tx.aPTransaction.create({
    data: {
        type: 'INVOICE',
        code,
        ...
        farm: { connect: { id: farmId } },           // ✅ Correct
        vendor: { connect: { id: input.vendor_id } }, // ✅ Correct
    },
});
```

---

## 📋 FILES THAT NEED FIXING (Priority Order)

### High Priority (Have create operations):
1. `inventory.service.ts` - 8 creates, 33 raw FK
2. `audit-log.service.ts` - 8 creates
3. `payroll.service.ts` - 7 creates
4. `invoice.service.ts` - 7 creates
5. `ap.service.ts` - 5 creates
6. `payable.service.ts` - 5 creates
7. `ar.service.ts` - 4 creates
8. `tax-package.service.ts` - 4 creates
9. `attendance.service.ts` - 2 creates
10. `tax-report.service.ts` - 2 creates
11. `transaction.service.ts` - 2 creates
12. `vat.service.ts` - 2 creates
13. `worker.service.ts` - 2 creates
14. `period-lock.service.ts` - 1 create

### Lower Priority (Query only - where clauses OK):
- `dashboard.service.ts`
- `report.service.ts`
- `reports.service.ts`
- `stock-alerts.service.ts`
- `stock-reports.service.ts`

---

## ⚠️ NOTE

The raw foreign key pattern (`farm_id: farmId`) **MAY WORK** in some Prisma versions, but:

1. It's **not the recommended pattern**
2. It **bypasses Prisma's relation validation**
3. It can cause **inconsistent behavior** across environments
4. It makes the code **harder to maintain**

The `connect` pattern is the **official Prisma way** and ensures:
- Type safety
- Relation integrity
- Consistent behavior
- Better error messages

---

## 🛠️ RECOMMENDED ACTION

Use the AI prompt from `docs/AI_PROMPT_FIX_PRISMA.md` to fix each service file systematically.

```bash
# Fix priority order:
1. inventory.service.ts
2. audit-log.service.ts
3. payroll.service.ts
4. invoice.service.ts
5. ap.service.ts
... etc
```
