# Refactor: Simplify Inventory Architecture

## Status: PLANNED

## Problem
Currently there are 2 tables storing inventory data:
- `Product.stock_qty`, `Product.avg_cost` - denormalized for quick access
- `Stock.quantity`, `Stock.avg_cost` - designed for multi-location

This causes data sync issues and inconsistencies.

## Solution
Since LABA ERP targets small/medium farms that don't need multi-location inventory:

1. **Remove Stock table dependency** - Use Product as single source of truth
2. **Keep StockMovement table** - For transaction history
3. **Deprecate Stock table** - Remove from queries, keep for backwards compatibility

## Implementation Steps

### Phase 1: Quick Fixes (Done)
- [x] Add sync script: `scripts/sync-stock-to-product.ts`
- [x] Fix decimal serialization in APIs
- [x] stockIn/stockOut/stockAdjust already sync to Product table

### Phase 2: Refactor getStocks() 
- [ ] Update `getStocks()` to query from Product table instead of Stock
- [ ] Update summary calculations
- [ ] Update stock alerts to use Product table

### Phase 3: Cleanup
- [ ] Remove Stock table creation from stockIn
- [ ] Add migration to deprecate Stock table
- [ ] Update all UI to use Product data directly

## Affected Files
- `src/services/inventory.service.ts`
- `src/services/stock-alerts.service.ts`
- `src/app/api/stocks/route.ts`
- `src/app/(dashboard)/kho/*.tsx`

## Testing
After each phase, run:
```bash
npx tsx scripts/comprehensive-api-test.ts
```

## Notes
- Stock table data should be migrated to Product before deprecation
- StockMovement table is still needed for audit trail
