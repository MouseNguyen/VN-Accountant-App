# 🎯 LABA ERP - QUALITY ASSURANCE MASTER CHECKLIST

## Đảm bảo app hoạt động hoàn hảo

---

## 📋 TỔNG QUAN CÁC LAYERS CẦN CHECK

```
┌─────────────────────────────────────────────────────────┐
│  1. CODE QUALITY        - Bugs, patterns, consistency   │
├─────────────────────────────────────────────────────────┤
│  2. DATA INTEGRITY      - Schema, relations, validation │
├─────────────────────────────────────────────────────────┤
│  3. BUSINESS LOGIC      - Calculations, rules, flows    │
├─────────────────────────────────────────────────────────┤
│  4. API CONTRACTS       - Endpoints, responses, errors  │
├─────────────────────────────────────────────────────────┤
│  5. UI/UX               - Forms, displays, navigation   │
├─────────────────────────────────────────────────────────┤
│  6. SECURITY            - Auth, permissions, injection  │
├─────────────────────────────────────────────────────────┤
│  7. PERFORMANCE         - Queries, caching, load        │
├─────────────────────────────────────────────────────────┤
│  8. TESTING             - Unit, integration, E2E        │
├─────────────────────────────────────────────────────────┤
│  9. DEPLOYMENT          - Env, migrations, monitoring   │
└─────────────────────────────────────────────────────────┘
```

---

## 1️⃣ CODE QUALITY

### 1.1 Prisma Patterns ✅ (Đã có guide)
- [ ] Tất cả `create` dùng `connect` cho relations
- [ ] Tất cả `update` dùng `connect/disconnect`
- [ ] Không dùng raw FK trong data objects

### 1.2 Business Logic Bugs ✅ (Đã có guide)
- [ ] AR queries include `SALE` + `INCOME`
- [ ] AP queries include `PURCHASE` + `EXPENSE`
- [ ] Query đúng tables

### 1.3 TypeScript Strict Mode
```bash
# Check TypeScript errors
npx tsc --noEmit

# Các lỗi thường gặp:
- [ ] Type mismatches
- [ ] Undefined/null handling
- [ ] Missing return types
```

### 1.4 Code Consistency
- [ ] Naming conventions (camelCase, PascalCase)
- [ ] Error handling patterns
- [ ] Response formats
- [ ] Date/time handling (timezone)
- [ ] Money calculations (Decimal precision)

---

## 2️⃣ DATA INTEGRITY

### 2.1 Schema Validation
```bash
# Validate Prisma schema
npx prisma validate

# Check for issues:
- [ ] All required fields have defaults or are handled
- [ ] Unique constraints are correct
- [ ] Indexes exist for frequently queried fields
- [ ] Cascade deletes are intentional
```

### 2.2 Required Fields Check
| Model | Required Fields | Default/Handled? |
|-------|-----------------|------------------|
| Transaction | farm_id, trans_number, code, trans_type, trans_date | ✅/❌ |
| ARTransaction | farm_id, customer_id, code, type | ✅/❌ |
| PayrollItem | farm_id, payroll_id, worker_id | ✅/❌ |
| ... | ... | ... |

### 2.3 Data Validation Rules
- [ ] Amount fields >= 0
- [ ] Percentage fields 0-100
- [ ] Date fields valid format
- [ ] Email format validation
- [ ] Phone number format
- [ ] Tax code format (10 or 13 digits)

### 2.4 Referential Integrity
- [ ] FK constraints enforced
- [ ] Soft delete handled (deleted_at)
- [ ] Orphan records prevented

---

## 3️⃣ BUSINESS LOGIC VALIDATION

### 3.1 Financial Calculations

#### Transaction Totals
```typescript
// Rule: total_amount = subtotal + vat_amount
// Check in: transaction.service.ts, invoice.service.ts

test('Transaction total calculation', () => {
  expect(total_amount).toBe(subtotal + vat_amount);
});
```

#### VAT Calculations
```typescript
// Standard VAT rates: 0%, 5%, 8%, 10%
// Rule: vat_amount = subtotal * vat_rate / 100

// VAT Deductibility Rules (TT219):
// - Cash payment >= 20M VND → NOT deductible
// - No invoice → NOT deductible
// - Invalid supplier tax code → NOT deductible
```

#### Payroll Calculations
```typescript
// Insurance rates (2024):
// Employee: BHXH 8%, BHYT 1.5%, BHTN 1% = 10.5%
// Employer: BHXH 17.5%, BHYT 3%, BHTN 1%, BHTNLD 0.5% = 22%

// PIT Progressive rates:
// 0-5M: 5%, 5-10M: 10%, 10-18M: 15%, 18-32M: 20%
// 32-52M: 25%, 52-80M: 30%, >80M: 35%

// Deductions:
// Personal: 11,000,000 VND/month
// Dependent: 4,400,000 VND/person/month
```

#### CIT Calculations
```typescript
// CIT rate: 20%
// Non-deductible expenses:
// - Admin penalties (fines)
// - Cash payments >= 20M without bank transfer
// - Expenses without valid invoices
// - Entertainment > limit
// - Welfare > 1 month average salary
// - Depreciation of cars < 9 seats > 1.6B VND
```

### 3.2 Status Transitions

#### Payment Status Flow
```
UNPAID → PARTIAL → PAID
         ↓
      OVERDUE (if past due_date)
```

#### Payroll Status Flow
```
DRAFT → CONFIRMED → PAID
  ↓
CANCELLED
```

#### Asset Status Flow
```
ACTIVE → DISPOSED
   ↓
SOLD
```

### 3.3 Business Rules Matrix

| Action | Pre-conditions | Post-actions |
|--------|---------------|--------------|
| Create SALE | Partner exists | Create ARTransaction if unpaid |
| Create PURCHASE | Partner exists | Create APTransaction if unpaid, Update Stock |
| Make AR Payment | AR exists, amount <= balance | Update AR balance/status |
| Create Payroll | Workers exist | Calculate insurance, PIT |
| Lock Period | No pending transactions | Prevent edits to locked period |

### 3.4 Transaction Type Mappings ✅ (FIXED 2024-12-16)

| Business Function | Transaction Types | Notes |
|-------------------|-------------------|-------|
| AR (Accounts Receivable) | SALE + INCOME | Customer owes us |
| AP (Accounts Payable) | PURCHASE + EXPENSE | We owe vendor |
| Revenue/Sales | SALE + INCOME | For P&L reports |
| Cost/Expenses | PURCHASE + EXPENSE | For P&L reports |
| VAT Output | SALE + INCOME | We collected VAT |
| VAT Input | PURCHASE + EXPENSE | We paid VAT |

### 3.5 Data Sync Rules ✅ (FIXED 2024-12-16)

When creating a Transaction, the system MUST:
- [x] Update `Product.stock_qty`
- [x] Upsert `Stock` record (quantity, avg_cost)
- [x] Create `StockMovement` record
- [x] Create `ARTransaction` (if SALE/INCOME unpaid)
- [x] Create `APTransaction` (if PURCHASE/EXPENSE unpaid)

When adding Payment to Transaction, the system MUST:
- [x] Update `Transaction.paid_amount` and `payment_status`
- [x] Update `Partner.balance`
- [x] Update `ARTransaction` or `APTransaction` (balance, status)

---

## 4️⃣ API CONTRACTS

### 4.1 Endpoint Checklist
```
For each endpoint, verify:
- [ ] Input validation (Zod schemas)
- [ ] Authentication required
- [ ] Authorization (farm_id check)
- [ ] Error responses consistent
- [ ] Success response format
```

### 4.2 Common API Issues
```typescript
// ❌ Missing farm_id validation
const data = await service.getData(input);

// ✅ With farm_id validation
const data = await service.getData(farmId, input);
if (data.farm_id !== session.farmId) throw new ForbiddenError();
```

### 4.3 Error Response Format
```typescript
// Standard error format
{
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Human readable message',
    details: { field: 'error details' }
  }
}
```

---

## 5️⃣ UI/UX VALIDATION

### 5.1 Form Validation
- [ ] Required fields marked
- [ ] Input format hints
- [ ] Real-time validation
- [ ] Error messages in Vietnamese
- [ ] Success feedback

### 5.2 Data Display
- [ ] Money formatted: 1,234,567 VND
- [ ] Dates formatted: DD/MM/YYYY
- [ ] Percentages: 10.5%
- [ ] Empty states handled
- [ ] Loading states

### 5.3 Mobile Responsiveness
- [ ] Large fonts for older users (target: 50-70 years)
- [ ] Touch-friendly buttons (min 44x44px)
- [ ] Simplified navigation
- [ ] Offline capability (future)

### 5.4 Accessibility
- [ ] Color contrast
- [ ] Screen reader support
- [ ] Keyboard navigation

---

## 6️⃣ SECURITY

### 6.1 Authentication
- [ ] Password hashing (bcrypt)
- [ ] Session management
- [ ] Token expiration
- [ ] Logout clears session

### 6.2 Authorization
- [ ] Farm-level isolation (multi-tenant)
- [ ] Role-based access (OWNER, MANAGER, ACCOUNTANT, STAFF)
- [ ] API routes protected
- [ ] Data queries filtered by farm_id

### 6.3 Input Sanitization
- [ ] SQL injection prevention (Prisma handles)
- [ ] XSS prevention
- [ ] File upload validation
- [ ] Rate limiting

### 6.4 Data Protection
- [ ] Sensitive data encrypted
- [ ] HTTPS enforced
- [ ] Audit logging
- [ ] Backup strategy

---

## 7️⃣ PERFORMANCE

### 7.1 Database Optimization
```sql
-- Check for missing indexes
-- Common queries should have indexes on:
-- farm_id, trans_date, code, partner_id, status

-- Check slow queries
EXPLAIN ANALYZE SELECT ...
```

### 7.2 Query Optimization
- [ ] Avoid N+1 queries (use include/select)
- [ ] Pagination for large lists
- [ ] Aggregations at DB level
- [ ] Connection pooling

### 7.3 Caching Strategy
- [ ] Static data (tax rules, config)
- [ ] Dashboard summaries
- [ ] Report results

### 7.4 Load Testing
```bash
# Targets:
# - 100 concurrent users
# - < 500ms response time
# - < 1% error rate
```

---

## 8️⃣ TESTING STRATEGY

### 8.1 Unit Tests
```typescript
// test/services/ar.service.test.ts
describe('ARService', () => {
  it('should include SALE and INCOME in AR queries', async () => {
    // Create SALE transaction
    // Create INCOME transaction
    // Query AR
    // Assert both are included
  });
  
  it('should calculate balance correctly', async () => {
    // total_amount - paid_amount = balance
  });
});
```

### 8.2 Integration Tests
```typescript
// test/integration/ar-flow.test.ts
describe('AR Flow', () => {
  it('should create AR when SALE is unpaid', async () => {
    // 1. Create SALE with status UNPAID
    // 2. Check ARTransaction created
    // 3. Check balance = total_amount
  });
  
  it('should update AR when payment made', async () => {
    // 1. Create SALE unpaid
    // 2. Make partial payment
    // 3. Check AR balance updated
    // 4. Check AR status = PARTIAL
  });
});
```

### 8.3 E2E Test Scenarios

| Scenario | Steps | Expected |
|----------|-------|----------|
| Complete Sale Flow | Create sale → Invoice → Payment → AR cleared | AR balance = 0 |
| Purchase with VAT | Create purchase → Check VAT deductible | VAT in declaration |
| Payroll Cycle | Attendance → Calculate → Confirm → Pay | Net salary correct |
| Period Lock | Lock month → Try edit | Edit blocked |
| Tax Filing | Generate VAT → Submit | Declaration created |

### 8.4 Test Data
```bash
# Use seed script for consistent test data
npx tsx scripts/seed-all-phases-test-data.ts

# Verify test cases:
# - MH-2412-002: Cash >= 20M → VAT không khấu trừ
# - CP-2411-002: Phạt → CIT add-back
# - NV004: LĐ thời vụ → PIT 10%
```

---

## 9️⃣ DEPLOYMENT & MONITORING

### 9.1 Environment Setup
```bash
# Required env vars
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# Optional
SENTRY_DSN=
ANALYTICS_ID=
```

### 9.2 Database Migrations
```bash
# Before deploy:
npx prisma migrate deploy

# Verify:
npx prisma db pull
npx prisma validate
```

### 9.3 Health Checks
- [ ] Database connection
- [ ] API responsiveness
- [ ] Background jobs (if any)

### 9.4 Monitoring & Alerts
- [ ] Error tracking (Sentry)
- [ ] Performance monitoring
- [ ] Uptime monitoring
- [ ] Database metrics

### 9.5 Backup & Recovery
- [ ] Daily database backups
- [ ] Point-in-time recovery
- [ ] Backup testing

### 9.6 Automated Health Check Scripts ✅ (Created 2024-12-16)

**When to use:**
| Script | When to Run | Purpose |
|--------|-------------|----------|
| `health-check.ts` | Before deploy, after major changes, daily in CI | Full system health verification |
| `verify-test-cases.ts` | After seeding data, before UAT | Business logic verification |
| `sync-stock-to-product.ts` | One-time fix, after data import | Fix data inconsistency |
| `check-stock.ts` | Debug stock issues | Diagnose stock sync problems |

**Commands:**
```bash
# Full health check (run before every deploy)
npx tsx scripts/health-check.ts

# Verify business logic with test data
npx tsx scripts/verify-test-cases.ts

# Fix stock sync (one-time or after data import)
npx tsx scripts/sync-stock-to-product.ts

# Debug stock data
npx tsx scripts/check-stock.ts
```

**Integration with CI/CD:**
```yaml
# In GitHub Actions or similar:
- name: Health Check
  run: npx tsx scripts/health-check.ts
  # Exit code 0 = pass, 1 = fail
```

---

## 🚀 IMPLEMENTATION PRIORITY

### Phase 1: Critical (Before Production)
1. ✅ Fix Prisma patterns (verified)
2. ✅ Fix business logic bugs - AR/AP trans_types (2024-12-16)
3. ✅ Fix data sync bugs - Transaction → Stock/AR/AP (2024-12-16)
4. ✅ Create automated health check scripts (2024-12-16)
5. ⬜ Add input validation (Zod)
6. ⬜ Add farm_id authorization checks
7. ⬜ Basic unit tests for calculations

### Phase 2: Important (First Month)
8. ⬜ Integration tests for main flows
9. ⬜ Error handling standardization
10. ⬜ Performance optimization
11. ⬜ Security audit

### Phase 3: Enhancement (Ongoing)
12. ⬜ E2E tests
13. ⬜ Monitoring setup
14. ⬜ Documentation
15. ⬜ CI/CD pipeline

---

## 📝 AI PROMPTS FOR EACH AREA

### For Security Audit:
```
Audit file [FILENAME] for security issues:
1. SQL injection risks
2. Missing authorization checks (farm_id)
3. Sensitive data exposure
4. Input validation gaps
```

### For Performance Audit:
```
Audit file [FILENAME] for performance:
1. N+1 query problems
2. Missing pagination
3. Unnecessary data fetching
4. Potential for caching
```

### For Test Generation:
```
Generate unit tests for [FILENAME]:
1. Happy path scenarios
2. Edge cases
3. Error scenarios
4. Business rule validation
```

---

## ✅ SIGN-OFF CHECKLIST

Before going to production:

| Category | Owner | Status | Date |
|----------|-------|--------|------|
| Code Quality Audit | | ⬜ | |
| Security Review | | ⬜ | |
| Performance Test | | ⬜ | |
| UAT (User Testing) | | ⬜ | |
| Data Migration Plan | | ⬜ | |
| Rollback Plan | | ⬜ | |
| Documentation | | ⬜ | |
