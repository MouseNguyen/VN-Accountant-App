# 📋 PHASE 5 - TASK 2: EMPLOYEE CRUD

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P5-T2 |
| **Tên** | Employee CRUD |
| **Thời gian** | 6-8 giờ |
| **Phụ thuộc** | Task 1 (Schema) |
| **Task tiếp theo** | Task 3 (Payroll Calculate) |

---

## 📋 MỤC TIÊU

- CRUD nhân viên chính thức
- Migrate từ Workers (Phase 1)
- Thông tin BHXH, ngân hàng
- Quản lý người phụ thuộc

---

## PHẦN 1: API ENDPOINTS

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | /api/employees | List employees |
| GET | /api/employees/:id | Get detail |
| POST | /api/employees | Create |
| PUT | /api/employees/:id | Update |
| DELETE | /api/employees/:id | Delete |
| POST | /api/employees/migrate-workers | Migrate từ Workers |

---

## PHẦN 2: EMPLOYEE SERVICE

```typescript
// src/services/employee.service.ts

export async function createEmployee(input: CreateEmployeeInput) {
  const code = await generateEmployeeCode(input.farm_id);
  
  return prisma.employee.create({
    data: {
      farm_id: input.farm_id,
      code,
      name: input.name,
      phone: input.phone,
      email: input.email,
      id_number: input.id_number,
      contract_type: input.contract_type,
      start_date: input.start_date,
      base_salary: input.base_salary,
      dependents: input.dependents || 0,
      has_insurance: input.has_insurance || false,
      insurance_code: input.insurance_code,
      bank_account: input.bank_account,
      bank_name: input.bank_name,
    },
  });
}

// Migrate from Workers
export async function migrateWorkers(farmId: string) {
  const workers = await prisma.worker.findMany({
    where: { farm_id: farmId },
  });
  
  let migrated = 0;
  
  for (const worker of workers) {
    const exists = await prisma.employee.findFirst({
      where: { farm_id: farmId, name: worker.name },
    });
    
    if (!exists) {
      await createEmployee({
        farm_id: farmId,
        name: worker.name,
        phone: worker.phone,
        contract_type: worker.has_contract ? 'LABOR' : 'SEASONAL',
        has_insurance: false,
        dependents: 0,
      });
      migrated++;
    }
  }
  
  return { migrated, total: workers.length };
}
```

---

## PHẦN 3: UI COMPONENTS

### Pages
- `/employees` - List với search, filter
- `/employees/new` - Create form
- `/employees/[id]` - Detail/Edit

### Form Fields
- Thông tin cơ bản: Mã, Tên, SĐT, Email, CCCD
- Hợp đồng: Loại, Ngày bắt đầu, Ngày kết thúc
- Lương: Lương cơ bản
- Thuế: Số người phụ thuộc
- Bảo hiểm: Có BHXH, Mã BHXH
- Ngân hàng: Số TK, Tên NH

---

## ✅ CHECKLIST

- [ ] Create employee API
- [ ] Update/Delete APIs
- [ ] Employee list page
- [ ] Employee form
- [ ] Migrate from Workers

---

## 🔗 KẾT NỐI

### Output → Task 3 (Payroll)
- Employee data cho tính lương

---

**Estimated Time:** 6-8 giờ  
**Next Task:** Task 3 - Payroll Auto Calculate
