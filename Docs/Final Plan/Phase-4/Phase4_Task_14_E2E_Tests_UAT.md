# 📋 PHASE 4 - TASK 14: E2E TESTING & UAT

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P4-T14 |
| **Tên** | E2E Testing & UAT |
| **Thời gian** | 10-12 giờ |
| **Phụ thuộc** | All Phase 4 tasks |
| **Task tiếp theo** | Phase 5 |

---

## 📋 MỤC TIÊU

- Playwright E2E tests
- UAT process & signoff
- Go-live checklist
- Documentation

---

## PHẦN 1: PLAYWRIGHT TESTS

```typescript
// tests/e2e/ar-invoice.spec.ts

import { test, expect } from '@playwright/test';

test.describe('AR Invoice', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@laba.vn');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });
  
  test('create and post invoice', async ({ page }) => {
    await page.goto('/ar/invoices/new');
    
    // Fill customer
    await page.click('[data-testid="customer-select"]');
    await page.click('text=Khách Hàng ABC');
    
    // Add line
    await page.click('text=Thêm dòng');
    await page.fill('[name="lines.0.product_name"]', 'Sản phẩm Test');
    await page.fill('[name="lines.0.quantity"]', '10');
    await page.fill('[name="lines.0.unit_price"]', '100000');
    
    // Save
    await page.click('text=Lưu');
    await expect(page.locator('.toast')).toContainText('Đã lưu');
    
    // Post
    await page.click('text=Post');
    await page.click('text=Xác nhận');
    await expect(page.locator('[data-testid="status"]')).toContainText('POSTED');
  });
});
```

---

## PHẦN 2: UAT CHECKLIST

### Business Flow Testing
- [ ] Full AR cycle: Invoice → Post → Payment → Closed
- [ ] Full AP cycle: Invoice → Post → Payment → Closed
- [ ] Tax calculation accuracy
- [ ] Financial statement balance

### Performance
- [ ] Page load < 3 seconds
- [ ] API response < 1 second
- [ ] 100 concurrent users

### Security
- [ ] Password policy enforced
- [ ] Session timeout working
- [ ] RBAC permissions correct

---

## PHẦN 3: GO-LIVE CHECKLIST

### Pre-Launch
- [ ] SSL certificate configured
- [ ] Domain DNS pointing
- [ ] Database backups enabled
- [ ] Monitoring alerts set

### Data Migration
- [ ] Opening balances imported
- [ ] Master data migrated
- [ ] User accounts created

### Training
- [ ] Admin training completed
- [ ] User guide distributed
- [ ] Support contact provided

---

## ✅ CHECKLIST

- [ ] Playwright test suite
- [ ] UAT signoff document
- [ ] Go-live checklist
- [ ] User documentation

---

**Estimated Time:** 10-12 giờ  
**Phase 4 Complete!** → Next: Phase 5
