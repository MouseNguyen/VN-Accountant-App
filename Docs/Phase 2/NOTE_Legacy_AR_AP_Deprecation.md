# Legacy AR/AP Tables Deprecation Plan

## Problem

We have 2 sets of tables causing data inconsistency:

| Table | Status | Usage |
|-------|--------|-------|
| `ar_transactions` | ⚠️ LEGACY | Old Phase 1, should NOT be used |
| `ap_transactions` | ⚠️ LEGACY | Old Phase 1, should NOT be used |
| `transactions` | ✅ CURRENT | Unified table with `trans_type` (INCOME/EXPENSE) |

## Current State (2024-12-14)

- **Transaction table**: Contains accurate, up-to-date financial data
- **Legacy AR**: 4,471,200đ (STALE DATA - do not use!)
- **Legacy AP**: ~? (STALE DATA)

## Services Already Migrated to Transaction Table ✅

1. `getARAgingReport()` - Fixed 
2. `getARSummary()` - Fixed
3. `getPayableReport()` - Already uses Transaction table
4. `getCashBookReport()` - Uses Transaction table
5. `getBankBookReport()` - Uses Transaction table
6. All report exports in Task 6-7

## Services Still Using Legacy Tables ⚠️

Need to check and migrate:
- [ ] `getARTransactions()` 
- [ ] `getARTransactionById()`
- [ ] `createARFromSale()`
- [ ] `collectPayment()` (AR)
- [ ] AP equivalents

## Recommended Action

### Option A: Full Migration (Recommended for next Phase)
1. Migrate all AR/AP service functions to use Transaction table
2. Delete legacy AR/AP tables after data verification
3. Update all frontend components

### Option B: Keep for Reference Only
1. Mark legacy tables as "DEPRECATED - READ ONLY"
2. All new writes go to Transaction table
3. Eventually remove in future cleanup

## Quick Reference

When you see code using these, it's LEGACY and potentially broken:
```typescript
// ❌ LEGACY - May have stale data
prisma.aRTransaction.findMany(...)
prisma.aPTransaction.findMany(...)

// ✅ CORRECT - Use this
prisma.transaction.findMany({
  where: {
    trans_type: 'INCOME',  // for AR
    // or
    trans_type: 'EXPENSE', // for AP
  }
})
```

## Files Fixed Today

- `src/services/ar.service.ts`:
  - `getARAgingReport()` - Migrated
  - `getARSummary()` - Migrated
  
- `src/services/report.service.ts`:
  - `getPayableReport()` - Already correct

## Next Steps

1. Complete Task 8 (VAT Declaration)
2. Schedule full AR/AP migration as separate task
3. Eventually drop legacy tables after verification
