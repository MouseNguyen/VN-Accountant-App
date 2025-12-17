# 📋 PHASE 3 - TASK 3: VAT VALIDATION

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P3-T3 |
| **Tên** | VAT Validation - Validate MST |
| **Thời gian** | 4-5 giờ |
| **Phụ thuộc** | Task 2 (Tax Rules) |
| **Task tiếp theo** | Task 4 (CIT Calculation) |

---

## 📋 MỤC TIÊU

- Validate MST format (10 hoặc 13 số)
- Lookup MST từ API Tổng cục Thuế (nếu có)
- Cache kết quả validation
- Warning khi MST invalid

---

## 📥 INPUTS

| Input | Từ | Chi tiết |
|-------|-----|----------|
| Partner.tax_code | Phase 1 | MST đối tác |
| VATDeclaration | P2-T8 | Tờ khai có MST |

---

## PHẦN 1: MST VALIDATION

```typescript
// src/services/mst-validation.service.ts

/**
 * Vietnam Tax Code Format:
 * - 10 digits: Main company
 * - 13 digits (10-XXX): Branch
 */
export function validateMSTFormat(mst: string): boolean {
  const cleaned = mst.replace(/[-\s]/g, '');
  
  // 10 digits
  if (/^\d{10}$/.test(cleaned)) return true;
  
  // 13 digits with branch code
  if (/^\d{10}-?\d{3}$/.test(cleaned)) return true;
  
  return false;
}

export function parseMST(mst: string): { main: string; branch?: string } {
  const cleaned = mst.replace(/[-\s]/g, '');
  
  if (cleaned.length === 10) {
    return { main: cleaned };
  }
  
  return {
    main: cleaned.substring(0, 10),
    branch: cleaned.substring(10),
  };
}

// Lookup from tax authority (mock - real API requires registration)
export async function lookupMST(mst: string): Promise<{
  valid: boolean;
  company_name?: string;
  address?: string;
  status?: string;
}> {
  // In production: call API Tổng cục Thuế
  // For now: format validation only
  const isValid = validateMSTFormat(mst);
  
  return {
    valid: isValid,
    company_name: isValid ? undefined : undefined,
    status: isValid ? 'FORMAT_OK' : 'INVALID_FORMAT',
  };
}
```

---

## PHẦN 2: VALIDATION IN TRANSACTION

```typescript
// Hook when creating purchase with MST
export async function validatePartnerMST(partnerId: string) {
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
  });
  
  if (!partner.tax_code) {
    return { valid: true, warning: 'Đối tác chưa có MST' };
  }
  
  const result = await lookupMST(partner.tax_code);
  
  if (!result.valid) {
    return { 
      valid: false, 
      error: 'MST không hợp lệ',
      details: result.status,
    };
  }
  
  return { valid: true };
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### Validation
- [ ] Format validation (10/13 digits)
- [ ] Parse main + branch code
- [ ] Cache results

### Integration
- [ ] Validate on Partner create/update
- [ ] Validate on Purchase transaction
- [ ] Warning UI

---

## 🔗 KẾT NỐI

### Output → Task 8 (VAT Declaration)
- Validated MST cho tờ khai

---

**Estimated Time:** 4-5 giờ  
**Next Task:** Task 4 - CIT Calculation
