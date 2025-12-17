# 📋 PHASE 1 - TASK 2: AUTHENTICATION

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P1-T2 |
| **Tên** | Authentication |
| **Thời gian** | 3-4 giờ |
| **Phụ thuộc** | Task 1 (Database Schema) |
| **Task tiếp theo** | Task 3 (Farm & User Management) |

---

## 📋 MỤC TIÊU

- API Register với chọn Business Type
- API Login + JWT Token
- Protected Routes Middleware
- UI Đăng ký, Đăng nhập

---

## PHẦN 1: API ENDPOINTS

### 1.1 POST /api/auth/register

```typescript
// src/app/api/auth/register/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, generateToken } from '@/lib/auth';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  name: z.string().min(2, 'Họ tên tối thiểu 2 ký tự'),
  phone: z.string().optional(),
  farm_name: z.string().min(2, 'Tên nông trại tối thiểu 2 ký tự'),
  business_type: z.enum(['FARM', 'RETAIL_FNB']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = registerSchema.parse(body);
    
    // Check email exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: { code: 'EMAIL_EXISTS', message: 'Email đã được sử dụng' } },
        { status: 400 }
      );
    }
    
    // Hash password
    const hashedPassword = await hashPassword(validated.password);
    
    // Create Farm + User in transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Farm
      const farm = await tx.farm.create({
        data: {
          name: validated.farm_name,
          business_type: validated.business_type,
        },
      });
      
      // 2. Create User
      const user = await tx.user.create({
        data: {
          farm_id: farm.id,
          email: validated.email,
          password: hashedPassword,
          name: validated.name,
          phone: validated.phone,
          role: 'OWNER',
        },
      });
      
      // 3. Create default accounts for farm
      await seedAccountsForFarm(tx, farm.id);
      
      return { farm, user };
    });
    
    // Generate JWT
    const token = generateToken({
      user_id: result.user.id,
      farm_id: result.farm.id,
      role: result.user.role,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          role: result.user.role,
        },
        farm: {
          id: result.farm.id,
          name: result.farm.name,
          business_type: result.farm.business_type,
        },
      },
      message: 'Đăng ký thành công',
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.errors[0].message } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
```

### 1.2 POST /api/auth/login

```typescript
// src/app/api/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, generateToken } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = loginSchema.parse(body);
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: validated.email },
      include: { farm: true },
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Email hoặc mật khẩu không đúng' } },
        { status: 401 }
      );
    }
    
    // Check password
    const isValid = await comparePassword(validated.password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Email hoặc mật khẩu không đúng' } },
        { status: 401 }
      );
    }
    
    // Check active
    if (!user.is_active) {
      return NextResponse.json(
        { success: false, error: { code: 'ACCOUNT_DISABLED', message: 'Tài khoản đã bị vô hiệu hóa' } },
        { status: 403 }
      );
    }
    
    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });
    
    // Generate JWT
    const token = generateToken({
      user_id: user.id,
      farm_id: user.farm_id,
      role: user.role,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        farm: {
          id: user.farm.id,
          name: user.farm.name,
          business_type: user.farm.business_type,
        },
      },
      message: 'Đăng nhập thành công',
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: error.errors[0].message } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
```

### 1.3 GET /api/auth/me

```typescript
// src/app/api/auth/me/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' } },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    
    if (!payload) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_TOKEN', message: 'Token không hợp lệ' } },
        { status: 401 }
      );
    }
    
    const user = await prisma.user.findUnique({
      where: { id: payload.user_id },
      include: { farm: true },
    });
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'USER_NOT_FOUND', message: 'Không tìm thấy người dùng' } },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
        farm: {
          id: user.farm.id,
          name: user.farm.name,
          business_type: user.farm.business_type,
          tax_code: user.farm.tax_code,
        },
      },
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
```

---

## PHẦN 2: AUTH LIBRARY

### 2.1 Auth Utilities

```typescript
// src/lib/auth.ts

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface TokenPayload {
  user_id: string;
  farm_id: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
```

### 2.2 API Client

```typescript
// src/lib/api-client.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  message?: string;
}

class ApiClient {
  private token: string | null = null;
  
  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }
  
  getToken(): string | null {
    if (!this.token) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
    
    const data = await response.json();
    
    // Handle 401 - redirect to login
    if (response.status === 401) {
      this.setToken(null);
      window.location.href = '/login';
    }
    
    return data;
  }
  
  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }
  
  post<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }
  
  put<T>(endpoint: string, body: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }
  
  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
```

---

## PHẦN 3: AUTH STORE (Zustand)

```typescript
// src/stores/auth-store.ts

import { create } from 'zustand';
import { apiClient } from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
}

interface Farm {
  id: string;
  name: string;
  business_type: 'FARM' | 'RETAIL_FNB';
  tax_code?: string;
}

interface AuthState {
  user: User | null;
  farm: Farm | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  farm_name: string;
  business_type: 'FARM' | 'RETAIL_FNB';
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  farm: null,
  isLoading: true,
  isAuthenticated: false,
  
  login: async (email, password) => {
    const res = await apiClient.post('/api/auth/login', { email, password });
    
    if (res.success && res.data) {
      apiClient.setToken(res.data.token);
      set({
        user: res.data.user,
        farm: res.data.farm,
        isAuthenticated: true,
      });
      return true;
    }
    return false;
  },
  
  register: async (data) => {
    const res = await apiClient.post('/api/auth/register', data);
    
    if (res.success && res.data) {
      apiClient.setToken(res.data.token);
      set({
        user: res.data.user,
        farm: res.data.farm,
        isAuthenticated: true,
      });
      return true;
    }
    return false;
  },
  
  logout: () => {
    apiClient.setToken(null);
    set({
      user: null,
      farm: null,
      isAuthenticated: false,
    });
  },
  
  fetchMe: async () => {
    set({ isLoading: true });
    
    const token = apiClient.getToken();
    if (!token) {
      set({ isLoading: false });
      return;
    }
    
    const res = await apiClient.get('/api/auth/me');
    
    if (res.success && res.data) {
      set({
        user: res.data.user,
        farm: res.data.farm,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      apiClient.setToken(null);
      set({ isLoading: false });
    }
  },
}));
```

---

## PHẦN 4: UI COMPONENTS

### 4.1 Register Page

```tsx
// src/app/(auth)/register/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuthStore();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    farm_name: '',
    business_type: 'FARM' as 'FARM' | 'RETAIL_FNB',
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const success = await register(formData);
      if (success) {
        toast.success('Đăng ký thành công!');
        router.push('/dashboard');
      } else {
        toast.error('Đăng ký thất bại. Vui lòng thử lại.');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-green-600">Đăng Ký LABA</CardTitle>
          <p className="text-gray-500">Tạo tài khoản miễn phí</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Business Type Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Loại hình kinh doanh</Label>
              <RadioGroup
                value={formData.business_type}
                onValueChange={(value) => 
                  setFormData({ ...formData, business_type: value as 'FARM' | 'RETAIL_FNB' })
                }
                className="grid grid-cols-2 gap-4"
              >
                <Label
                  htmlFor="farm"
                  className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer ${
                    formData.business_type === 'FARM' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <RadioGroupItem value="FARM" id="farm" className="sr-only" />
                  <span className="text-3xl mb-2">🌾</span>
                  <span className="font-medium">Nông trại</span>
                  <span className="text-xs text-gray-500">Trồng trọt, Chăn nuôi</span>
                </Label>
                
                <Label
                  htmlFor="fnb"
                  className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer ${
                    formData.business_type === 'RETAIL_FNB' 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <RadioGroupItem value="RETAIL_FNB" id="fnb" className="sr-only" />
                  <span className="text-3xl mb-2">☕</span>
                  <span className="font-medium">F&B / Bán lẻ</span>
                  <span className="text-xs text-gray-500">Cafe, Nhà hàng</span>
                </Label>
              </RadioGroup>
            </div>
            
            <div className="space-y-2">
              <Label>Tên cơ sở</Label>
              <Input
                placeholder={formData.business_type === 'FARM' ? 'VD: Nông trại Chú Năm' : 'VD: Cafe Sài Gòn'}
                value={formData.farm_name}
                onChange={(e) => setFormData({ ...formData, farm_name: e.target.value })}
                required
                className="h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Họ và tên</Label>
              <Input
                placeholder="Nguyễn Văn A"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Số điện thoại</Label>
              <Input
                type="tel"
                placeholder="0912 345 678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Mật khẩu</Label>
              <Input
                type="password"
                placeholder="Tối thiểu 6 ký tự"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                className="h-12"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
              disabled={isLoading}
            >
              {isLoading ? 'Đang tạo...' : 'Tạo Tài Khoản'}
            </Button>
            
            <div className="text-center text-sm">
              Đã có tài khoản?{' '}
              <Link href="/login" className="text-green-600 font-medium">
                Đăng nhập
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 4.2 Login Page

```tsx
// src/app/(auth)/login/page.tsx

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const success = await login(email, password);
      if (success) {
        toast.success('Đăng nhập thành công!');
        router.push('/dashboard');
      } else {
        toast.error('Email hoặc mật khẩu không đúng');
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-green-600">Đăng Nhập</CardTitle>
          <p className="text-gray-500">LABA ERP - Quản lý tài chính nông trại</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Mật khẩu</Label>
              <Input
                type="password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
              disabled={isLoading}
            >
              {isLoading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
            </Button>
            
            <div className="text-center text-sm">
              Chưa có tài khoản?{' '}
              <Link href="/register" className="text-green-600 font-medium">
                Đăng ký miễn phí
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## PHẦN 5: PROTECTED ROUTE MIDDLEWARE

```typescript
// src/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login', '/register', '/'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Allow public paths
  if (publicPaths.some(path => pathname === path || pathname.startsWith('/api/auth/'))) {
    return NextResponse.next();
  }
  
  // Check for token in cookies or header
  const token = request.cookies.get('token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');
  
  // If no token and trying to access protected route, redirect to login
  if (!token && pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## ✅ CHECKLIST HOÀN THÀNH

### API
- [ ] POST /api/auth/register
- [ ] POST /api/auth/login
- [ ] GET /api/auth/me

### Library
- [ ] src/lib/auth.ts (hash, compare, JWT)
- [ ] src/lib/api-client.ts
- [ ] src/stores/auth-store.ts

### UI
- [ ] Register page với Business Type selection
- [ ] Login page
- [ ] Protected route middleware

### Testing
- [ ] Đăng ký → tạo Farm + User
- [ ] Đăng nhập → nhận token
- [ ] Access dashboard khi chưa login → redirect

---

## 🔗 KẾT NỐI VỚI TASK TIẾP THEO

### Output → Task 3 (Farm & User Management)
- Auth context với user_id, farm_id
- useAuthStore với user và farm data
- Token đã lưu trong localStorage

---

**Estimated Time:** 3-4 giờ  
**Next Task:** Task 3 - Farm & User Management + Dynamic Labels
