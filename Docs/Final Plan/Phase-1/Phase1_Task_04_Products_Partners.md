# 📋 PHASE 1 - TASK 4: PRODUCTS & PARTNERS CRUD

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P1-T4 |
| **Tên** | Products & Partners CRUD |
| **Thời gian** | 4-5 giờ |
| **Phụ thuộc** | Task 3 (Farm & User Management) |
| **Task tiếp theo** | Task 5 (Transactions) |

---

## 📋 MỤC TIÊU

- CRUD Sản phẩm/Nông sản
- CRUD Khách hàng + Nhà cung cấp
- UI Mobile-first với list/form

---

## PHẦN 1: PRODUCT API

### 1.1 GET /api/products

```typescript
// src/app/api/products/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth-context';

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category');
  const is_active = searchParams.get('is_active') !== 'false';
  
  const products = await prisma.product.findMany({
    where: {
      farm_id: auth.farm_id,
      is_active,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(category && { category }),
    },
    orderBy: { created_at: 'desc' },
  });
  
  return NextResponse.json({
    success: true,
    data: products,
  });
}
```

### 1.2 POST /api/products

```typescript
// src/app/api/products/route.ts (thêm)

import { z } from 'zod';

const productSchema = z.object({
  code: z.string().min(1, 'Mã sản phẩm không được để trống'),
  name: z.string().min(1, 'Tên sản phẩm không được để trống'),
  description: z.string().optional(),
  unit: z.string().default('kg'),
  default_price: z.number().min(0).default(0),
  vat_rate: z.number().min(0).max(100).default(0),
  category: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  
  const body = await request.json();
  const validated = productSchema.parse(body);
  
  // Check duplicate code
  const existing = await prisma.product.findUnique({
    where: { farm_id_code: { farm_id: auth.farm_id, code: validated.code } },
  });
  
  if (existing) {
    return NextResponse.json(
      { success: false, error: { code: 'DUPLICATE_CODE', message: 'Mã sản phẩm đã tồn tại' } },
      { status: 400 }
    );
  }
  
  const product = await prisma.product.create({
    data: {
      farm_id: auth.farm_id,
      ...validated,
      vat_rate: validated.vat_rate / 100, // Convert to decimal
    },
  });
  
  return NextResponse.json({
    success: true,
    data: product,
    message: 'Thêm sản phẩm thành công',
  });
}
```

### 1.3 PUT & DELETE /api/products/[id]

```typescript
// src/app/api/products/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth-context';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  
  const body = await request.json();
  
  const product = await prisma.product.findFirst({
    where: { id: params.id, farm_id: auth.farm_id },
  });
  
  if (!product) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Không tìm thấy sản phẩm' } },
      { status: 404 }
    );
  }
  
  const updated = await prisma.product.update({
    where: { id: params.id },
    data: {
      name: body.name,
      description: body.description,
      unit: body.unit,
      default_price: body.default_price,
      vat_rate: body.vat_rate / 100,
      category: body.category,
    },
  });
  
  return NextResponse.json({
    success: true,
    data: updated,
    message: 'Cập nhật thành công',
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  
  // Soft delete
  await prisma.product.update({
    where: { id: params.id, farm_id: auth.farm_id },
    data: { is_active: false },
  });
  
  return NextResponse.json({
    success: true,
    message: 'Xóa sản phẩm thành công',
  });
}
```

---

## PHẦN 2: PARTNER API

### 2.1 GET /api/partners

```typescript
// src/app/api/partners/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth-context';

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const type = searchParams.get('type'); // 'customer' | 'supplier' | null
  
  const where: any = {
    farm_id: auth.farm_id,
    is_active: true,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ],
    }),
  };
  
  if (type === 'customer') where.is_customer = true;
  if (type === 'supplier') where.is_supplier = true;
  
  const partners = await prisma.partner.findMany({
    where,
    orderBy: { created_at: 'desc' },
  });
  
  return NextResponse.json({
    success: true,
    data: partners,
  });
}
```

### 2.2 POST /api/partners

```typescript
// src/app/api/partners/route.ts (thêm)

const partnerSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  tax_code: z.string().optional(),
  is_customer: z.boolean().default(true),
  is_supplier: z.boolean().default(false),
  credit_limit: z.number().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  
  const body = await request.json();
  const validated = partnerSchema.parse(body);
  
  // Check duplicate code
  const existing = await prisma.partner.findUnique({
    where: { farm_id_code: { farm_id: auth.farm_id, code: validated.code } },
  });
  
  if (existing) {
    return NextResponse.json(
      { success: false, error: { code: 'DUPLICATE_CODE', message: 'Mã đối tác đã tồn tại' } },
      { status: 400 }
    );
  }
  
  const partner = await prisma.partner.create({
    data: {
      farm_id: auth.farm_id,
      ...validated,
    },
  });
  
  return NextResponse.json({
    success: true,
    data: partner,
    message: 'Thêm đối tác thành công',
  });
}
```

### 2.3 PUT & DELETE /api/partners/[id]

```typescript
// src/app/api/partners/[id]/route.ts

// Similar to products - PUT updates partner, DELETE soft-deletes
```

---

## PHẦN 3: UI COMPONENTS

### 3.1 Product List Page

```tsx
// src/app/(dashboard)/products/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useLabels } from '@/hooks/use-labels';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Plus, Search, Package } from 'lucide-react';
import { ProductForm } from '@/components/products/product-form';
import { formatCurrency } from '@/lib/utils';

export default function ProductsPage() {
  const { t } = useLabels();
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  
  useEffect(() => {
    fetchProducts();
  }, [search]);
  
  const fetchProducts = async () => {
    const res = await apiClient.get(`/api/products?search=${search}`);
    if (res.success) setProducts(res.data);
  };
  
  const handleSave = () => {
    setIsOpen(false);
    setEditingProduct(null);
    fetchProducts();
  };
  
  return (
    <div className="container mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">{t('products_list')}</h1>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              {t('add_product')}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>
                {editingProduct ? 'Sửa sản phẩm' : t('add_product')}
              </SheetTitle>
            </SheetHeader>
            <ProductForm 
              product={editingProduct} 
              onSave={handleSave}
              onCancel={() => { setIsOpen(false); setEditingProduct(null); }}
            />
          </SheetContent>
        </Sheet>
      </div>
      
      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Tìm theo tên, mã..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>
      
      {/* List */}
      <div className="space-y-2">
        {products.map((product) => (
          <Card
            key={product.id}
            className="cursor-pointer hover:bg-gray-50"
            onClick={() => {
              setEditingProduct(product);
              setIsOpen(true);
            }}
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Package className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium">{product.name}</div>
                <div className="text-sm text-gray-500">
                  {product.code} • {product.unit}
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium text-green-600">
                  {formatCurrency(product.default_price)}
                </div>
                {product.vat_rate > 0 && (
                  <div className="text-xs text-gray-500">
                    VAT {product.vat_rate * 100}%
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        
        {products.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Chưa có sản phẩm nào
          </div>
        )}
      </div>
    </div>
  );
}
```

### 3.2 Product Form Component

```tsx
// src/components/products/product-form.tsx

'use client';

import { useState } from 'react';
import { useLabels } from '@/hooks/use-labels';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

interface ProductFormProps {
  product?: any;
  onSave: () => void;
  onCancel: () => void;
}

const VAT_OPTIONS = [
  { value: '0', label: 'Không áp dụng (0%)' },
  { value: '5', label: 'VAT 5%' },
  { value: '8', label: 'VAT 8%' },
  { value: '10', label: 'VAT 10%' },
];

export function ProductForm({ product, onSave, onCancel }: ProductFormProps) {
  const { t, businessType } = useLabels();
  const isEditing = !!product;
  
  const [formData, setFormData] = useState({
    code: product?.code || '',
    name: product?.name || '',
    description: product?.description || '',
    unit: product?.unit || 'kg',
    default_price: product?.default_price || 0,
    vat_rate: (product?.vat_rate * 100)?.toString() || '0',
    category: product?.category || '',
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const payload = {
      ...formData,
      default_price: Number(formData.default_price),
      vat_rate: Number(formData.vat_rate),
    };
    
    const res = isEditing
      ? await apiClient.put(`/api/products/${product.id}`, payload)
      : await apiClient.post('/api/products', payload);
    
    if (res.success) {
      toast.success(isEditing ? 'Cập nhật thành công' : 'Thêm thành công');
      onSave();
    } else {
      toast.error(res.error?.message || 'Có lỗi xảy ra');
    }
    
    setIsLoading(false);
  };
  
  const unitOptions = businessType === 'FARM'
    ? ['kg', 'tấn', 'bó', 'con', 'trái', 'cây']
    : ['cái', 'hộp', 'chai', 'ly', 'phần', 'suất'];
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
      <div className="space-y-2">
        <Label>Mã {t('product')}</Label>
        <Input
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          placeholder="VD: SP001"
          disabled={isEditing}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label>Tên {t('product')}</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder={businessType === 'FARM' ? 'VD: Lúa giống' : 'VD: Cà phê đen'}
          required
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Đơn vị</Label>
          <Select
            value={formData.unit}
            onValueChange={(v) => setFormData({ ...formData, unit: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {unitOptions.map((u) => (
                <SelectItem key={u} value={u}>{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Giá mặc định</Label>
          <Input
            type="number"
            value={formData.default_price}
            onChange={(e) => setFormData({ ...formData, default_price: e.target.value })}
            placeholder="0"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Thuế VAT</Label>
        <Select
          value={formData.vat_rate}
          onValueChange={(v) => setFormData({ ...formData, vat_rate: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VAT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Hủy
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1 bg-green-600 hover:bg-green-700">
          {isLoading ? 'Đang lưu...' : (isEditing ? 'Cập nhật' : 'Thêm mới')}
        </Button>
      </div>
    </form>
  );
}
```

### 3.3 Partners Page (Similar structure)

```tsx
// src/app/(dashboard)/partners/page.tsx
// Similar to Products but with is_customer/is_supplier toggle tabs
```

---

## ✅ CHECKLIST HOÀN THÀNH

### Product API
- [ ] GET /api/products (with search)
- [ ] POST /api/products
- [ ] PUT /api/products/[id]
- [ ] DELETE /api/products/[id]

### Partner API
- [ ] GET /api/partners (with type filter)
- [ ] POST /api/partners
- [ ] PUT /api/partners/[id]
- [ ] DELETE /api/partners/[id]

### UI
- [ ] Product list page
- [ ] Product form (Sheet/Drawer)
- [ ] Partner list page với tabs
- [ ] Partner form

### Testing
- [ ] Add product → list updates
- [ ] Edit product → changes save
- [ ] Add customer/supplier → appears in correct tab
- [ ] Search → filters work

---

## 🔗 KẾT NỐI VỚI TASK TIẾP THEO

### Output → Task 5 (Transactions)
- Product list cho selection
- Partner list cho customer/supplier

### Output → Task 6 (Sales/Purchases)
- Products với VAT rates
- Partner balances

---

**Estimated Time:** 4-5 giờ  
**Next Task:** Task 5 - Transactions (Cash In/Out)
