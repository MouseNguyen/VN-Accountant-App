# 📋 PHASE 4 - TASK 10: PRODUCTION AUTH

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P4-T10 |
| **Tên** | Production Authentication |
| **Thời gian** | 8-10 giờ |
| **Phụ thuộc** | Phase 1 Auth |
| **Task tiếp theo** | Task 11 (RBAC) |

---

## 📋 MỤC TIÊU

- OAuth providers (Google, Facebook)
- Refresh token rotation
- Brute force protection
- 2FA (TOTP)

---

## PHẦN 1: OAUTH INTEGRATION

```typescript
// src/lib/auth/providers.ts

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
// Or use NextAuth.js

export const authProviders = {
  google: {
    name: 'Google',
    icon: 'google',
    signIn: async () => {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return result.user;
    },
  },
  // Facebook, etc.
};
```

---

## PHẦN 2: BRUTE FORCE PROTECTION

```typescript
// src/middleware/rate-limit.ts

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function checkLoginAllowed(email: string, ip: string): Promise<boolean> {
  const recentFails = await prisma.failedLogin.count({
    where: {
      OR: [
        { email },
        { ip_address: ip },
      ],
      attempt_at: { gte: subMinutes(new Date(), LOCKOUT_MINUTES) },
    },
  });
  
  return recentFails < MAX_FAILED_ATTEMPTS;
}

export async function recordFailedLogin(email: string, ip: string) {
  await prisma.failedLogin.create({
    data: { email, ip_address: ip },
  });
}
```

---

## PHẦN 3: 2FA (TOTP)

```typescript
// Using speakeasy library
import speakeasy from 'speakeasy';

export function generate2FASecret(email: string) {
  return speakeasy.generateSecret({
    name: `LABA ERP (${email})`,
    length: 20,
  });
}

export function verify2FA(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
  });
}
```

---

## ✅ CHECKLIST

- [ ] Google OAuth
- [ ] Refresh token rotation
- [ ] Brute force protection
- [ ] 2FA TOTP
- [ ] Password reset flow

---

**Estimated Time:** 8-10 giờ  
**Next Task:** Task 11 - RBAC
