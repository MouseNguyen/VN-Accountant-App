#!/bin/bash
# scripts/health-check.sh
# Run all quality checks for LABA ERP
# Usage: bash scripts/health-check.sh

echo "🏥 LABA ERP - HEALTH CHECK"
echo "=========================="
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

# Function to print status
check_pass() { echo -e "${GREEN}✅ PASS${NC}: $1"; }
check_fail() { echo -e "${RED}❌ FAIL${NC}: $1"; ((ERRORS++)); }
check_warn() { echo -e "${YELLOW}⚠️  WARN${NC}: $1"; ((WARNINGS++)); }

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 1. TYPESCRIPT CHECK"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if npx tsc --noEmit 2>/dev/null; then
  check_pass "TypeScript compilation"
else
  check_fail "TypeScript errors found"
  echo "   Run: npx tsc --noEmit"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 2. PRISMA SCHEMA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if npx prisma validate 2>/dev/null; then
  check_pass "Prisma schema valid"
else
  check_fail "Prisma schema invalid"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 3. PRISMA PATTERNS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Count connect patterns vs raw FK
CONNECT_COUNT=$(grep -r "{ connect:" src/services/ 2>/dev/null | wc -l)
RAW_FK_COUNT=$(grep -rE "(farm_id|partner_id|worker_id|product_id):" src/services/ 2>/dev/null | grep -v "where\|Where" | grep "\.create\|\.update" | wc -l)

echo "   Connect patterns: $CONNECT_COUNT"
echo "   Raw FK in create/update: ~$RAW_FK_COUNT (estimate)"

if [ "$CONNECT_COUNT" -gt 0 ]; then
  check_pass "Some connect patterns found"
else
  check_fail "No connect patterns found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 4. BUSINESS LOGIC - AR/AP TRANS TYPES"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check AR service
AR_INCOME_ONLY=$(grep -c "trans_type.*[=:].*['\"]INCOME['\"]" src/services/ar.service.ts 2>/dev/null || echo 0)
AR_SALE_INCOME=$(grep -c "SALE.*INCOME\|in:.*SALE" src/services/ar.service.ts 2>/dev/null || echo 0)

if [ "$AR_INCOME_ONLY" -gt 0 ] && [ "$AR_SALE_INCOME" -eq 0 ]; then
  check_fail "ar.service.ts: Only queries INCOME, missing SALE"
else
  check_pass "ar.service.ts: Trans types OK or needs manual review"
fi

# Check AP service
AP_EXPENSE_ONLY=$(grep -c "trans_type.*[=:].*['\"]EXPENSE['\"]" src/services/ap.service.ts 2>/dev/null || echo 0)
AP_PURCHASE_EXPENSE=$(grep -c "PURCHASE.*EXPENSE\|in:.*PURCHASE" src/services/ap.service.ts 2>/dev/null || echo 0)

if [ "$AP_EXPENSE_ONLY" -gt 0 ] && [ "$AP_PURCHASE_EXPENSE" -eq 0 ]; then
  check_fail "ap.service.ts: Only queries EXPENSE, missing PURCHASE"
else
  check_pass "ap.service.ts: Trans types OK or needs manual review"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 5. SECURITY - FARM_ID CHECKS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if services have farm_id in queries
FARMID_IN_WHERE=$(grep -r "farm_id:" src/services/ 2>/dev/null | grep "where" | wc -l)
echo "   farm_id in where clauses: $FARMID_IN_WHERE"

if [ "$FARMID_IN_WHERE" -gt 50 ]; then
  check_pass "Farm isolation appears implemented"
else
  check_warn "Limited farm_id checks found - verify manually"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 6. DELETED_AT SOFT DELETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

DELETED_AT_CHECKS=$(grep -r "deleted_at:" src/services/ 2>/dev/null | grep -c "null")
echo "   deleted_at: null checks: $DELETED_AT_CHECKS"

if [ "$DELETED_AT_CHECKS" -gt 20 ]; then
  check_pass "Soft delete checks present"
else
  check_warn "Limited deleted_at checks - may show deleted records"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 7. ERROR HANDLING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

TRY_CATCH=$(grep -r "try {" src/services/ 2>/dev/null | wc -l)
THROW_ERROR=$(grep -r "throw" src/services/ 2>/dev/null | wc -l)
echo "   try-catch blocks: $TRY_CATCH"
echo "   throw statements: $THROW_ERROR"

if [ "$TRY_CATCH" -gt 10 ]; then
  check_pass "Error handling present"
else
  check_warn "Limited error handling"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 8. FILE STATISTICS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SERVICE_FILES=$(find src/services -name "*.ts" | wc -l)
API_FILES=$(find src/app/api -name "*.ts" 2>/dev/null | wc -l)
TOTAL_LINES=$(find src -name "*.ts" -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}')

echo "   Service files: $SERVICE_FILES"
echo "   API route files: $API_FILES"
echo "   Total TypeScript lines: $TOTAL_LINES"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}🎉 All checks passed!${NC}"
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️  $WARNINGS warnings found${NC}"
else
  echo -e "${RED}❌ $ERRORS errors, $WARNINGS warnings${NC}"
fi

echo ""
echo "Next steps:"
echo "  1. Fix any errors above"
echo "  2. Run: bash scripts/audit-prisma-relations.sh"
echo "  3. Run: npx tsx scripts/seed-all-phases-test-data.ts"
echo "  4. Test manually with seed data"
