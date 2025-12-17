# 📋 PHASE 4 - TASK 11: RBAC & MULTI-TENANT

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P4-T11 |
| **Tên** | RBAC & Multi-Tenant Security |
| **Thời gian** | 10-12 giờ |
| **Phụ thuộc** | Task 10 (Auth) |
| **Task tiếp theo** | Task 12 (AWS) |

---

## 📋 MỤC TIÊU

- Role-Based Access Control
- Permission system
- Multi-tenant data isolation
- Audit logging

---

## PHẦN 1: PERMISSIONS

```typescript
// src/lib/auth/permissions.ts

export const PERMISSIONS = {
  // AR
  'ar:view': 'Xem hóa đơn bán',
  'ar:create': 'Tạo hóa đơn',
  'ar:edit': 'Sửa hóa đơn',
  'ar:post': 'Post hóa đơn',
  'ar:void': 'Hủy hóa đơn',
  
  // AP
  'ap:view': 'Xem hóa đơn mua',
  'ap:create': 'Tạo hóa đơn mua',
  'ap:post': 'Post hóa đơn mua',
  
  // Reports
  'reports:view': 'Xem báo cáo',
  'reports:export': 'Export báo cáo',
  
  // Settings
  'settings:view': 'Xem cài đặt',
  'settings:edit': 'Sửa cài đặt',
  
  // Users
  'users:manage': 'Quản lý người dùng',
};

export const ROLES = {
  OWNER: Object.keys(PERMISSIONS),
  ACCOUNTANT: ['ar:*', 'ap:*', 'reports:*'],
  STAFF: ['ar:view', 'ap:view'],
};
```

---

## PHẦN 2: MIDDLEWARE

```typescript
// src/middleware/authorize.ts

export function requirePermission(permission: string) {
  return async (req: NextRequest) => {
    const user = await getCurrentUser(req);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const hasPermission = checkPermission(user.role, permission);
    
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    return null; // Continue
  };
}
```

---

## PHẦN 3: MULTI-TENANT ISOLATION

```typescript
// All queries must include farm_id
// Use Prisma middleware

prisma.$use(async (params, next) => {
  if (params.action === 'findMany' || params.action === 'findFirst') {
    const farmId = getCurrentFarmId();
    if (farmId) {
      params.args.where = { ...params.args.where, farm_id: farmId };
    }
  }
  return next(params);
});
```

---

## ✅ CHECKLIST

- [ ] Permission definitions
- [ ] Role mappings
- [ ] Authorization middleware
- [ ] Farm-scoped queries
- [ ] UI permission checks

---

**Estimated Time:** 10-12 giờ  
**Next Task:** Task 12 - AWS Infrastructure
