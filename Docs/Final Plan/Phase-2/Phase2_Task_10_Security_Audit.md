# 📋 PHASE 2 - TASK 10: SECURITY & AUDIT

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P2-T10 |
| **Tên** | Security & Audit Log |
| **Thời gian** | 8-10 giờ |
| **Phụ thuộc** | Task 1 (AuditLog model) |
| **Task tiếp theo** | Phase 3 |

---

## 📋 MỤC TIÊU

- Session management enhanced
- Failed login tracking
- Audit log cho mọi thay đổi data
- Activity history

---

## 📥 INPUTS

| Input | Từ | Chi tiết |
|-------|-----|----------|
| AuditLog model | Task 1 | Schema |
| Auth system | Phase 1 | JWT, middleware |

---

## PHẦN 1: MODELS BỔ SUNG

```prisma
// Đã định nghĩa trong Task 1

model UserSession {
  id            String   @id @default(uuid())
  user_id       String
  token_hash    String   // Hashed JWT
  ip_address    String?
  user_agent    String?
  expires_at    DateTime
  created_at    DateTime @default(now())
  
  user          User     @relation(fields: [user_id], references: [id])
  
  @@index([user_id, expires_at])
  @@map("user_sessions")
}

model FailedLogin {
  id          String   @id @default(uuid())
  email       String
  ip_address  String?
  user_agent  String?
  reason      String   // INVALID_PASSWORD, USER_NOT_FOUND, LOCKED
  created_at  DateTime @default(now())
  
  @@index([email, created_at])
  @@map("failed_logins")
}
```

---

## PHẦN 2: AUDIT LOG SERVICE

```typescript
// src/services/audit.service.ts

export async function logAudit(params: {
  farm_id: string;
  user_id: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: string;
  entity_id: string;
  old_data?: any;
  new_data?: any;
  ip_address?: string;
}) {
  await prisma.auditLog.create({
    data: {
      farm_id: params.farm_id,
      user_id: params.user_id,
      action: params.action,
      entity: params.entity,
      entity_id: params.entity_id,
      old_data: params.old_data,
      new_data: params.new_data,
      ip_address: params.ip_address,
    },
  });
}

// Middleware để auto-log
export function withAuditLog<T>(
  fn: (params: any) => Promise<T>,
  entity: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE'
) {
  return async (params: any, context: any): Promise<T> => {
    const old_data = action !== 'CREATE' 
      ? await getExistingData(entity, params.id) 
      : null;
    
    const result = await fn(params);
    
    await logAudit({
      farm_id: context.farm_id,
      user_id: context.user_id,
      action,
      entity,
      entity_id: params.id || result.id,
      old_data,
      new_data: action !== 'DELETE' ? result : null,
    });
    
    return result;
  };
}
```

---

## PHẦN 3: LOGIN SECURITY

```typescript
// src/services/auth-security.service.ts

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export async function checkLoginAllowed(email: string): Promise<boolean> {
  const recentFails = await prisma.failedLogin.count({
    where: {
      email,
      created_at: { gte: subMinutes(new Date(), LOCKOUT_DURATION_MINUTES) },
    },
  });
  
  return recentFails < MAX_FAILED_ATTEMPTS;
}

export async function recordFailedLogin(
  email: string, 
  reason: string,
  ip_address?: string
) {
  await prisma.failedLogin.create({
    data: { email, reason, ip_address },
  });
}

export async function clearFailedLogins(email: string) {
  await prisma.failedLogin.deleteMany({
    where: { email },
  });
}
```

---

## PHẦN 4: SESSION MANAGEMENT

```typescript
// Enhanced session with device tracking

export async function createSession(
  user_id: string,
  token: string,
  request: NextRequest
) {
  const ip_address = request.headers.get('x-forwarded-for') || 'unknown';
  const user_agent = request.headers.get('user-agent') || 'unknown';
  
  await prisma.userSession.create({
    data: {
      user_id,
      token_hash: hashToken(token),
      ip_address,
      user_agent,
      expires_at: addDays(new Date(), 7),
    },
  });
}

export async function invalidateSession(token: string) {
  await prisma.userSession.deleteMany({
    where: { token_hash: hashToken(token) },
  });
}

export async function invalidateAllSessions(user_id: string) {
  await prisma.userSession.deleteMany({
    where: { user_id },
  });
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### Session Management
- [ ] Session creation with device info
- [ ] Session invalidation (logout)
- [ ] Logout all devices

### Failed Login
- [ ] Track failed attempts
- [ ] Lockout after 5 fails
- [ ] Auto unlock after 15 mins

### Audit Log
- [ ] Log CREATE actions
- [ ] Log UPDATE with old/new
- [ ] Log DELETE with old data
- [ ] Activity history API

---

## 🔗 KẾT NỐI VỚI PHASES TIẾP THEO

### Output → Phase 3
- Audit log cho compliance reports

### Output → Phase 4
- Enhanced RBAC system
- Full security module

---

**Estimated Time:** 8-10 giờ  
**Phase 2 Complete!** → Next: Phase 3
