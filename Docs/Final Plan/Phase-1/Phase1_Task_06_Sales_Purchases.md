# 📋 PHASE 1 - TASK 6: SALES/PURCHASES + PAYABLES

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P1-T6 |
| **Tên** | Sales/Purchases + Công Nợ |
| **Thời gian** | 6-8 giờ |
| **Phụ thuộc** | Task 5 (Transactions) |
| **Task tiếp theo** | Task 7 (Workers) |

---

## 📋 MỤC TIÊU

- Form Bán hàng (SALE) với items
- Form Mua hàng (PURCHASE) với items  
- Hỗ trợ Credit (Công nợ) cho Phase 2
- VAT calculation theo từng item
- Cập nhật Partner balance

---

## PHẦN 1: ENHANCED TRANSACTION API

### 1.1 POST /api/sales

```typescript
// src/app/api/sales/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth-context';
import { generateTransactionCode } from '@/lib/transaction-utils';
import { z } from 'zod';

const saleSchema = z.object({
  trans_date: z.string(),
  customer_id: z.string().optional(),
  customer_name: z.string().optional(), // For quick entry without partner
  payment_method: z.enum(['CASH', 'BANK_TRANSFER', 'CREDIT']),
  items: z.array(z.object({
    product_id: z.string(),
    quantity: z.number().positive(),
    unit: z.string(),
    unit_price: z.number().positive(),
    vat_rate: z.number().min(0).max(100).default(0),
  })).min(1, 'Phải có ít nhất 1 sản phẩm'),
  notes: z.string().optional(),
  ref_number: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  
  const body = await request.json();
  const validated = saleSchema.parse(body);
  
  // Calculate totals
  const itemsWithTotals = validated.items.map((item) => {
    const amount = item.quantity * item.unit_price;
    const vat = amount * (item.vat_rate / 100);
    return { ...item, amount, vat_amount: vat };
  });
  
  const totalAmount = itemsWithTotals.reduce((sum, i) => sum + i.amount, 0);
  const totalVat = itemsWithTotals.reduce((sum, i) => sum + i.vat_amount, 0);
  
  const code = await generateTransactionCode(auth.farm_id, 'SALE');
  
  const result = await prisma.$transaction(async (tx) => {
    // Create transaction
    const transaction = await tx.transaction.create({
      data: {
        farm_id: auth.farm_id,
        type: 'SALE',
        code,
        trans_date: new Date(validated.trans_date),
        partner_id: validated.customer_id,
        amount: totalAmount,
        vat_rate: 0, // Will use item-level VAT
        vat_amount: totalVat,
        payment_method: validated.payment_method,
        description: validated.customer_name || 'Bán hàng',
        notes: validated.notes,
        ref_number: validated.ref_number,
        created_by: auth.user_id,
      },
    });
    
    // Create items
    await tx.transactionItem.createMany({
      data: itemsWithTotals.map((item) => ({
        transaction_id: transaction.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        amount: item.amount,
        vat_rate: item.vat_rate / 100,
        vat_amount: item.vat_amount,
      })),
    });
    
    // Update customer balance if credit
    if (validated.customer_id && validated.payment_method === 'CREDIT') {
      await tx.partner.update({
        where: { id: validated.customer_id },
        data: { balance_ar: { increment: totalAmount + totalVat } },
      });
    }
    
    return transaction;
  });
  
  return NextResponse.json({
    success: true,
    data: result,
    message: 'Tạo phiếu bán hàng thành công',
  });
}
```

### 1.2 POST /api/purchases

```typescript
// src/app/api/purchases/route.ts

// Similar to sales but with:
// - type: 'PURCHASE'
// - supplier_id instead of customer_id
// - Update balance_ap instead of balance_ar
```

### 1.3 GET Partner Balance

```typescript
// src/app/api/partners/[id]/balance/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth-context';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  
  const partner = await prisma.partner.findFirst({
    where: { id: params.id, farm_id: auth.farm_id },
    select: {
      id: true,
      code: true,
      name: true,
      balance_ar: true,
      balance_ap: true,
      credit_limit: true,
    },
  });
  
  if (!partner) {
    return NextResponse.json({ success: false }, { status: 404 });
  }
  
  // Get recent transactions
  const recentTransactions = await prisma.transaction.findMany({
    where: {
      farm_id: auth.farm_id,
      partner_id: params.id,
      type: { in: ['SALE', 'PURCHASE'] },
    },
    orderBy: { trans_date: 'desc' },
    take: 10,
    select: {
      id: true,
      code: true,
      type: true,
      trans_date: true,
      amount: true,
      vat_amount: true,
      payment_method: true,
    },
  });
  
  return NextResponse.json({
    success: true,
    data: {
      ...partner,
      recent_transactions: recentTransactions,
    },
  });
}
```

---

## PHẦN 2: UI COMPONENTS

### 2.1 Sale Form

```tsx
// src/components/sales/sale-form.tsx

'use client';

import { useState, useEffect } from 'react';
import { useLabels } from '@/hooks/use-labels';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ProductSearch } from '@/components/products/product-search';
import { PartnerSearch } from '@/components/partners/partner-search';

interface SaleItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
}

interface SaleFormProps {
  onSuccess: () => void;
}

export function SaleForm({ onSuccess }: SaleFormProps) {
  const { t } = useLabels();
  
  const [formData, setFormData] = useState({
    trans_date: new Date().toISOString().split('T')[0],
    customer_id: '',
    customer_name: '',
    payment_method: 'CASH' as 'CASH' | 'BANK_TRANSFER' | 'CREDIT',
    notes: '',
  });
  const [items, setItems] = useState<SaleItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Add item
  const handleAddItem = (product: any) => {
    const newItem: SaleItem = {
      id: crypto.randomUUID(),
      product_id: product.id,
      product_name: product.name,
      quantity: 1,
      unit: product.unit,
      unit_price: product.default_price || 0,
      vat_rate: (product.vat_rate || 0) * 100,
    };
    setItems([...items, newItem]);
  };
  
  // Update item
  const handleUpdateItem = (id: string, field: string, value: any) => {
    setItems(items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };
  
  // Remove item
  const handleRemoveItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };
  
  // Calculate totals
  const totals = items.reduce(
    (acc, item) => {
      const amount = item.quantity * item.unit_price;
      const vat = amount * (item.vat_rate / 100);
      return {
        subtotal: acc.subtotal + amount,
        vat: acc.vat + vat,
        total: acc.total + amount + vat,
      };
    },
    { subtotal: 0, vat: 0, total: 0 }
  );
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      toast.error('Vui lòng thêm ít nhất 1 sản phẩm');
      return;
    }
    
    setIsLoading(true);
    
    const res = await apiClient.post('/api/sales', {
      ...formData,
      items: items.map(({ product_id, quantity, unit, unit_price, vat_rate }) => ({
        product_id,
        quantity,
        unit,
        unit_price,
        vat_rate,
      })),
    });
    
    if (res.success) {
      toast.success(`Bán hàng thành công: ${res.data.code}`);
      onSuccess();
    } else {
      toast.error(res.error?.message || 'Có lỗi xảy ra');
    }
    
    setIsLoading(false);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      {/* Date & Customer */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Ngày</Label>
          <Input
            type="date"
            value={formData.trans_date}
            onChange={(e) => setFormData({ ...formData, trans_date: e.target.value })}
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label>Khách hàng</Label>
          <PartnerSearch
            type="customer"
            value={formData.customer_id}
            onChange={(id) => setFormData({ ...formData, customer_id: id })}
          />
        </div>
      </div>
      
      {/* Items */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label>Sản phẩm</Label>
          <ProductSearch onSelect={handleAddItem} />
        </div>
        
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-medium">{item.product_name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-red-500 h-6 w-6"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">SL</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleUpdateItem(item.id, 'quantity', Number(e.target.value))}
                      min={0.1}
                      step={0.1}
                      className="h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Đơn giá</Label>
                    <Input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) => handleUpdateItem(item.id, 'unit_price', Number(e.target.value))}
                      className="h-8"
                    />
                  </div>
                  <div className="text-right">
                    <Label className="text-xs">Thành tiền</Label>
                    <div className="font-medium text-green-600">
                      {formatCurrency(item.quantity * item.unit_price)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {items.length === 0 && (
            <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
              Nhấn nút + để thêm sản phẩm
            </div>
          )}
        </div>
      </div>
      
      {/* Payment Method */}
      <div className="space-y-2">
        <Label>Hình thức</Label>
        <Select
          value={formData.payment_method}
          onValueChange={(v) => setFormData({ ...formData, payment_method: v as any })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CASH">Tiền mặt</SelectItem>
            <SelectItem value="BANK_TRANSFER">Chuyển khoản</SelectItem>
            <SelectItem value="CREDIT">Ghi công nợ</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Totals */}
      <Card className="bg-gray-50">
        <CardContent className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Tiền hàng:</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.vat > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>VAT:</span>
              <span>{formatCurrency(totals.vat)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>Tổng cộng:</span>
            <span className="text-green-600">{formatCurrency(totals.total)}</span>
          </div>
        </CardContent>
      </Card>
      
      <Button 
        type="submit" 
        disabled={isLoading || items.length === 0}
        className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
      >
        {isLoading ? 'Đang lưu...' : 'Xác nhận bán hàng'}
      </Button>
    </form>
  );
}
```

### 2.2 Product Search Dialog

```tsx
// src/components/products/product-search.tsx

'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ProductSearchProps {
  onSelect: (product: any) => void;
}

export function ProductSearch({ onSelect }: ProductSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  
  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen, search]);
  
  const fetchProducts = async () => {
    const res = await apiClient.get(`/api/products?search=${search}`);
    if (res.success) setProducts(res.data);
  };
  
  const handleSelect = (product: any) => {
    onSelect(product);
    setIsOpen(false);
    setSearch('');
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-1" />
          Thêm SP
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Chọn sản phẩm</DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Tìm theo tên, mã..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>
        
        <div className="max-h-[300px] overflow-y-auto space-y-2">
          {products.map((product) => (
            <div
              key={product.id}
              className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => handleSelect(product)}
            >
              <div className="font-medium">{product.name}</div>
              <div className="text-sm text-gray-500 flex justify-between">
                <span>{product.code} • {product.unit}</span>
                <span className="text-green-600">{formatCurrency(product.default_price)}</span>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## PHẦN 3: SALES/PURCHASE PAGES

```tsx
// src/app/(dashboard)/sales/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useLabels } from '@/hooks/use-labels';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Plus } from 'lucide-react';
import { TransactionCard } from '@/components/transactions/transaction-card';
import { SaleForm } from '@/components/sales/sale-form';

export default function SalesPage() {
  const { t } = useLabels();
  const [sales, setSales] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    fetchSales();
  }, []);
  
  const fetchSales = async () => {
    const res = await apiClient.get('/api/transactions?type=SALE&limit=50');
    if (res.success) setSales(res.data);
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">{t('sale')}</h1>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Bán hàng
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Phiếu bán hàng</SheetTitle>
            </SheetHeader>
            <SaleForm onSuccess={() => { setIsOpen(false); fetchSales(); }} />
          </SheetContent>
        </Sheet>
      </div>
      
      <div className="space-y-2">
        {sales.map((sale) => (
          <TransactionCard key={sale.id} transaction={sale} />
        ))}
      </div>
    </div>
  );
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### API
- [ ] POST /api/sales
- [ ] POST /api/purchases
- [ ] GET /api/partners/[id]/balance
- [ ] VAT calculation per item
- [ ] Partner balance update

### UI
- [ ] Sale form với items
- [ ] Purchase form với items
- [ ] Product search dialog
- [ ] Partner search component
- [ ] Totals calculation
- [ ] Sales list page
- [ ] Purchases list page

### Testing
- [ ] Create sale với items → correct totals
- [ ] Credit sale → partner balance_ar increases
- [ ] Create purchase → partner balance_ap increases
- [ ] VAT calculated correctly

---

## 🔗 KẾT NỐI VỚI PHASE 2

### Output → Phase 2 Task 2 (Inventory)
- SALE → Auto create StockMovement.OUT
- PURCHASE → Auto create StockMovement.IN

### Output → Phase 2 Task 4-5 (AR/AP)
- Partner.balance_ar/ap → Migrate to ARTransaction/APTransaction
- Payment allocation

---

**Estimated Time:** 6-8 giờ  
**Next Task:** Task 7 - Workers + PIT
