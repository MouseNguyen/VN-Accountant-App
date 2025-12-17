# AI PROMPT: TEST PHASE 4 - AR/AP ADVANCED & INFRASTRUCTURE

## TASK
Test Phase 4 features: Advanced AR/AP, Financial Reports, Production Auth, RBAC, Infrastructure

## PHASE 4 SCOPE
AR Invoice workflow, AP module, Financial reports, Production auth, RBAC, AWS, CI/CD

## CHECKLIST

### 1. AR Invoice CRUD
```
□ Create invoice from SALE transaction
□ Invoice number auto-generated
□ Invoice linked to partner
□ Invoice items from TransactionItems
□ PDF generation works
□ Status: DRAFT → POSTED → PAID
```

### 2. AR Invoice Posting
```
□ DRAFT invoice editable
□ POST invoice → creates ARTransaction
□ POST → locks invoice (no edit)
□ POST → updates Partner.balance
□ Reverse posting works (if allowed)
```

### 3. AR Payments & Allocation
```
□ Create payment for invoice(s)
□ Partial payment supported
□ Payment allocates across multiple invoices
□ Over-payment handled (credit)
□ Payment receipt generated
```

### 4. AR Aging Report
```
□ Groups: Current, 1-30, 31-60, 61-90, >90 days
□ Based on invoice due_date
□ Total matches sum of all AR balances
□ Export to Excel works
```

### 5. AP Module (Mirror of AR)
```
□ AP Invoice from PURCHASE
□ AP posting workflow
□ AP payment allocation
□ AP aging report
□ Vendor statement
```

### 6. Financial Reports
```
□ Balance Sheet
  - Assets = Liabilities + Equity
  - Cash matches bank balance
□ Income Statement (P&L)
  - Revenue - COGS - Expenses = Net Income
□ Cash Flow Statement
  - Operating + Investing + Financing = Net Change
□ Trial Balance
  - Debits = Credits
```

### 7. Production Auth
```
□ Secure session management
□ HTTPS enforced
□ CORS configured
□ Rate limiting works
□ Brute force protection
```

### 8. RBAC & Multi-Tenant
```
□ Roles: OWNER, ADMIN, ACCOUNTANT, STAFF
□ Permissions enforced per role
□ Data isolation between farms
□ Cross-farm access blocked
□ User can belong to multiple farms
```

### 9. AWS Infrastructure
```
□ RDS PostgreSQL connected
□ S3 for file uploads
□ CloudFront CDN (if used)
□ Environment variables secure
□ Backup strategy exists
```

### 10. CI/CD & Monitoring
```
□ GitHub Actions / GitLab CI works
□ Auto-deploy on merge
□ Database migrations run
□ Error logging (Sentry/CloudWatch)
□ Health check endpoint
```

## TEST SCENARIOS

### AR Payment Flow
```
1. Create SALE transaction 10,000,000đ
2. POST creates ARTransaction
3. Receive payment 6,000,000đ
4. AR balance = 4,000,000đ
5. Receive payment 4,000,000đ
6. AR balance = 0, status = PAID
```

### Multi-Tenant Test
```
1. User A owns Farm A
2. User B owns Farm B
3. User A cannot see Farm B data
4. API rejects cross-farm requests
```

## OUTPUT FORMAT
```
PHASE 4 TEST RESULTS
====================
✓ AR Invoice: 6/6 passed
✓ AR Payment: 5/5 passed
✗ RBAC: 4/5 (STAFF can delete)
✓ Financial Reports: 4/4 passed
...
```
