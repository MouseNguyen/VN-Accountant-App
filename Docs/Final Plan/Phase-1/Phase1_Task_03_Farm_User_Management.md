# 📋 PHASE 1 - TASK 3: FARM & USER MANAGEMENT

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P1-T3 |
| **Tên** | Farm & User Management |
| **Thời gian** | 2-3 giờ |
| **Phụ thuộc** | Task 2 (Authentication) |
| **Task tiếp theo** | Task 4 (Products & Partners) |

---

## 📋 MỤC TIÊU

- Trang Settings: Thông tin Farm, MST
- API Update Farm
- Thêm/xóa Staff (cho OWNER)
- Dynamic Labels theo Business Type

---

## PHẦN 1: API ENDPOINTS

### 1.1 GET /api/farm

```typescript
// src/app/api/farm/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth-context';

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' } },
      { status: 401 }
    );
  }
  
  const farm = await prisma.farm.findUnique({
    where: { id: auth.farm_id },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          is_active: true,
          last_login: true,
        },
        orderBy: { created_at: 'asc' },
      },
    },
  });
  
  return NextResponse.json({
    success: true,
    data: farm,
  });
}
```

### 1.2 PUT /api/farm

```typescript
// src/app/api/farm/route.ts (thêm)

import { z } from 'zod';

const updateFarmSchema = z.object({
  name: z.string().min(2).optional(),
  tax_code: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  fiscal_year_start: z.number().min(1).max(12).optional(),
});

export async function PUT(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' } },
      { status: 401 }
    );
  }
  
  // Only OWNER can update farm settings
  if (auth.role !== 'OWNER') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Không có quyền' } },
      { status: 403 }
    );
  }
  
  const body = await request.json();
  const validated = updateFarmSchema.parse(body);
  
  const farm = await prisma.farm.update({
    where: { id: auth.farm_id },
    data: validated,
  });
  
  return NextResponse.json({
    success: true,
    data: farm,
    message: 'Cập nhật thành công',
  });
}
```

### 1.3 POST /api/farm/users (Add Staff)

```typescript
// src/app/api/farm/users/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth-context';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';

const addUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(['STAFF', 'ACCOUNTANT']),
});

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth || auth.role !== 'OWNER') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Chỉ chủ sở hữu mới có thể thêm nhân viên' } },
      { status: 403 }
    );
  }
  
  const body = await request.json();
  const validated = addUserSchema.parse(body);
  
  // Check email exists
  const existing = await prisma.user.findUnique({
    where: { email: validated.email },
  });
  
  if (existing) {
    return NextResponse.json(
      { success: false, error: { code: 'EMAIL_EXISTS', message: 'Email đã được sử dụng' } },
      { status: 400 }
    );
  }
  
  const hashedPassword = await hashPassword(validated.password);
  
  const user = await prisma.user.create({
    data: {
      farm_id: auth.farm_id,
      email: validated.email,
      password: hashedPassword,
      name: validated.name,
      phone: validated.phone,
      role: validated.role,
    },
  });
  
  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    message: 'Thêm nhân viên thành công',
  });
}
```

### 1.4 DELETE /api/farm/users/[id]

```typescript
// src/app/api/farm/users/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth-context';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthContext(request);
  if (!auth || auth.role !== 'OWNER') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Không có quyền' } },
      { status: 403 }
    );
  }
  
  // Cannot delete self
  if (params.id === auth.user_id) {
    return NextResponse.json(
      { success: false, error: { code: 'CANNOT_DELETE_SELF', message: 'Không thể xóa chính mình' } },
      { status: 400 }
    );
  }
  
  const user = await prisma.user.findUnique({
    where: { id: params.id },
  });
  
  if (!user || user.farm_id !== auth.farm_id) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy người dùng' } },
      { status: 404 }
    );
  }
  
  await prisma.user.delete({
    where: { id: params.id },
  });
  
  return NextResponse.json({
    success: true,
    message: 'Xóa nhân viên thành công',
  });
}
```

---

## PHẦN 2: DYNAMIC LABELS

### 2.1 Label Configuration

```typescript
// src/config/labels.ts

export type BusinessType = 'FARM' | 'RETAIL_FNB';

export const labels: Record<BusinessType, Record<string, string>> = {
  FARM: {
    // Menu
    dashboard: 'Tổng quan',
    transactions: 'Thu Chi',
    sales: 'Bán hàng',
    purchases: 'Mua hàng',
    products: 'Nông sản',
    partners: 'Đối tác',
    workers: 'Nhân công',
    reports: 'Báo cáo',
    settings: 'Cài đặt',
    
    // Products
    product: 'Nông sản',
    products_list: 'Danh sách nông sản',
    add_product: 'Thêm nông sản',
    product_category: 'Loại nông sản',
    
    // Partners
    customer: 'Khách hàng',
    customers: 'Khách hàng',
    supplier: 'Nhà cung cấp',
    suppliers: 'Nhà cung cấp',
    
    // Workers
    worker: 'Nhân công',
    workers_list: 'Danh sách nhân công',
    add_worker: 'Thêm nhân công',
    work_log: 'Chấm công',
    
    // Transaction
    cash_in: 'Thu tiền',
    cash_out: 'Chi tiền',
    sale: 'Bán hàng',
    purchase: 'Mua vật tư',
    payroll: 'Trả công',
    
    // Farm specific
    farm_name: 'Tên nông trại',
    harvest: 'Thu hoạch',
  },
  
  RETAIL_FNB: {
    // Menu
    dashboard: 'Tổng quan',
    transactions: 'Thu Chi',
    sales: 'Bán hàng',
    purchases: 'Nhập hàng',
    products: 'Sản phẩm',
    partners: 'Đối tác',
    workers: 'Nhân viên',
    reports: 'Báo cáo',
    settings: 'Cài đặt',
    
    // Products
    product: 'Sản phẩm',
    products_list: 'Danh sách sản phẩm',
    add_product: 'Thêm sản phẩm',
    product_category: 'Danh mục',
    
    // Partners
    customer: 'Khách hàng',
    customers: 'Khách hàng',
    supplier: 'Nhà cung cấp',
    suppliers: 'Nhà cung cấp',
    
    // Workers
    worker: 'Nhân viên',
    workers_list: 'Danh sách nhân viên',
    add_worker: 'Thêm nhân viên',
    work_log: 'Chấm công',
    
    // Transaction
    cash_in: 'Thu tiền',
    cash_out: 'Chi tiền',
    sale: 'Doanh thu',
    purchase: 'Nhập hàng',
    payroll: 'Trả lương',
    
    // FNB specific
    farm_name: 'Tên cửa hàng',
    harvest: 'Doanh thu',
  },
};
```

### 2.2 Label Hook

```typescript
// src/hooks/use-labels.ts

import { useAuthStore } from '@/stores/auth-store';
import { labels, BusinessType } from '@/config/labels';

export function useLabels() {
  const { farm } = useAuthStore();
  const businessType: BusinessType = farm?.business_type || 'FARM';
  
  const t = (key: string): string => {
    return labels[businessType]?.[key] || labels.FARM[key] || key;
  };
  
  return { t, businessType };
}
```

---

## PHẦN 3: UI COMPONENTS

### 3.1 Settings Page

```tsx
// src/app/(dashboard)/settings/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useLabels } from '@/hooks/use-labels';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { farm, user, fetchMe } = useAuthStore();
  const { t } = useLabels();
  
  const [farmData, setFarmData] = useState({
    name: '',
    tax_code: '',
    address: '',
    phone: '',
  });
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    fetchFarmData();
  }, []);
  
  const fetchFarmData = async () => {
    const res = await apiClient.get('/api/farm');
    if (res.success && res.data) {
      setFarmData({
        name: res.data.name || '',
        tax_code: res.data.tax_code || '',
        address: res.data.address || '',
        phone: res.data.phone || '',
      });
      setUsers(res.data.users || []);
    }
  };
  
  const handleSaveFarm = async () => {
    setIsLoading(true);
    const res = await apiClient.put('/api/farm', farmData);
    if (res.success) {
      toast.success('Cập nhật thành công');
      fetchMe(); // Refresh auth context
    } else {
      toast.error(res.error?.message || 'Có lỗi xảy ra');
    }
    setIsLoading(false);
  };
  
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">{t('settings')}</h1>
      
      <Tabs defaultValue="farm">
        <TabsList className="mb-4">
          <TabsTrigger value="farm">{t('farm_name')}</TabsTrigger>
          <TabsTrigger value="users">Quản lý người dùng</TabsTrigger>
        </TabsList>
        
        <TabsContent value="farm">
          <Card>
            <CardHeader>
              <CardTitle>Thông tin cơ bản</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('farm_name')}</Label>
                  <Input
                    value={farmData.name}
                    onChange={(e) => setFarmData({ ...farmData, name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Mã số thuế (MST)</Label>
                  <Input
                    placeholder="10 hoặc 13 chữ số"
                    value={farmData.tax_code}
                    onChange={(e) => setFarmData({ ...farmData, tax_code: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <Label>Địa chỉ</Label>
                  <Input
                    value={farmData.address}
                    onChange={(e) => setFarmData({ ...farmData, address: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Số điện thoại</Label>
                  <Input
                    value={farmData.phone}
                    onChange={(e) => setFarmData({ ...farmData, phone: e.target.value })}
                  />
                </div>
              </div>
              
              <Button 
                onClick={handleSaveFarm} 
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <UserManagement users={users} onUpdate={fetchFarmData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 3.2 User Management Component

```tsx
// src/components/settings/user-management.tsx

'use client';

import { useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Trash2, UserPlus } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
  is_active: boolean;
}

export function UserManagement({ users, onUpdate }: { users: User[], onUpdate: () => void }) {
  const { user: currentUser } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'STAFF',
  });
  
  const handleAddUser = async () => {
    const res = await apiClient.post('/api/farm/users', newUser);
    if (res.success) {
      toast.success('Thêm nhân viên thành công');
      setIsOpen(false);
      setNewUser({ email: '', password: '', name: '', phone: '', role: 'STAFF' });
      onUpdate();
    } else {
      toast.error(res.error?.message || 'Có lỗi xảy ra');
    }
  };
  
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Bạn có chắc muốn xóa người dùng này?')) return;
    
    const res = await apiClient.delete(`/api/farm/users/${userId}`);
    if (res.success) {
      toast.success('Xóa thành công');
      onUpdate();
    } else {
      toast.error(res.error?.message || 'Có lỗi xảy ra');
    }
  };
  
  const roleLabel = (role: string) => {
    switch (role) {
      case 'OWNER': return 'Chủ sở hữu';
      case 'STAFF': return 'Nhân viên';
      case 'ACCOUNTANT': return 'Kế toán';
      default: return role;
    }
  };
  
  const isOwner = currentUser?.role === 'OWNER';
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Người dùng</CardTitle>
        {isOwner && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Thêm nhân viên
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thêm nhân viên mới</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Họ tên</Label>
                  <Input
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mật khẩu</Label>
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quyền</Label>
                  <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STAFF">Nhân viên</SelectItem>
                      <SelectItem value="ACCOUNTANT">Kế toán</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleAddUser} className="w-full">
                  Thêm
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <div className="font-medium flex items-center gap-2">
                  {u.name}
                  {u.id === currentUser?.id && (
                    <Badge variant="outline" className="text-xs">Bạn</Badge>
                  )}
                </div>
                <div className="text-sm text-gray-500">{u.email}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={u.role === 'OWNER' ? 'default' : 'secondary'}>
                  {roleLabel(u.role)}
                </Badge>
                {isOwner && u.id !== currentUser?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteUser(u.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## PHẦN 4: AUTH CONTEXT HELPER

```typescript
// src/lib/auth-context.ts

import { NextRequest } from 'next/server';
import { verifyToken, TokenPayload } from '@/lib/auth';

export async function getAuthContext(request: NextRequest): Promise<TokenPayload | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### API
- [ ] GET /api/farm
- [ ] PUT /api/farm
- [ ] POST /api/farm/users
- [ ] DELETE /api/farm/users/[id]

### Dynamic Labels
- [ ] src/config/labels.ts
- [ ] src/hooks/use-labels.ts

### UI
- [ ] Settings page với tabs
- [ ] Farm info form
- [ ] User management với add/delete

### Testing
- [ ] Update farm settings → save thành công
- [ ] Add staff → user mới được tạo
- [ ] Delete staff → user bị xóa
- [ ] Labels thay đổi theo business_type

---

## 🔗 KẾT NỐI VỚI TASK TIẾP THEO

### Output → Task 4 (Products & Partners)
- `farm_id` từ auth context
- `useLabels` hook cho product/partner labels
- `getAuthContext` helper

---

**Estimated Time:** 2-3 giờ  
**Next Task:** Task 4 - Products & Partners CRUD
