# 📋 PHASE 1 - TASK 5: TRANSACTIONS (CASH IN/OUT)

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P1-T5 |
| **Tên** | Transactions - Thu Chi Tiền |
| **Thời gian** | 5-6 giờ |
| **Phụ thuộc** | Task 4 (Products & Partners) |
| **Task tiếp theo** | Task 6 (Sales/Purchases) |

---

## 📋 MỤC TIÊU

- Form Thu tiền (Cash In)
- Form Chi tiền (Cash Out)  
- Danh sách giao dịch với filter
- Transaction code auto-generate

---

## PHẦN 1: TRANSACTION API

### 1.1 GET /api/transactions

```typescript
// src/app/api/transactions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthContext } from '@/lib/auth-context';

export async function GET(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const from_date = searchParams.get('from_date');
  const to_date = searchParams.get('to_date');
  const partner_id = searchParams.get('partner_id');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  
  const where: any = {
    farm_id: auth.farm_id,
  };
  
  if (type) where.type = type;
  if (partner_id) where.partner_id = partner_id;
  if (from_date || to_date) {
    where.trans_date = {};
    if (from_date) where.trans_date.gte = new Date(from_date);
    if (to_date) where.trans_date.lte = new Date(to_date);
  }
  
  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        partner: { select: { id: true, name: true, code: true } },
        items: { include: { product: { select: { name: true, unit: true } } } },
      },
      orderBy: [{ trans_date: 'desc' }, { created_at: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);
  
  return NextResponse.json({
    success: true,
    data: transactions,
    meta: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  });
}
```

### 1.2 POST /api/transactions

```typescript
// src/app/api/transactions/route.ts (thêm)

import { z } from 'zod';
import { generateTransactionCode } from '@/lib/transaction-utils';

const transactionSchema = z.object({
  type: z.enum(['CASH_IN', 'CASH_OUT', 'BANK_TRANSFER', 'SALE', 'PURCHASE', 'PAYROLL']),
  trans_date: z.string(), // ISO date
  partner_id: z.string().optional(),
  amount: z.number().positive(),
  payment_method: z.enum(['CASH', 'BANK_TRANSFER', 'CREDIT']).default('CASH'),
  description: z.string().optional(),
  notes: z.string().optional(),
  ref_number: z.string().optional(),
  vat_rate: z.number().min(0).max(100).default(0),
  items: z.array(z.object({
    product_id: z.string(),
    quantity: z.number().positive(),
    unit: z.string(),
    unit_price: z.number().positive(),
    vat_rate: z.number().default(0),
  })).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await getAuthContext(request);
  if (!auth) return NextResponse.json({ success: false }, { status: 401 });
  
  const body = await request.json();
  const validated = transactionSchema.parse(body);
  
  // Generate transaction code (e.g., "PT-2024-0001")
  const code = await generateTransactionCode(auth.farm_id, validated.type);
  
  // Calculate VAT
  const vat_rate = validated.vat_rate / 100;
  const vat_amount = validated.amount * vat_rate;
  
  const result = await prisma.$transaction(async (tx) => {
    // Create transaction
    const transaction = await tx.transaction.create({
      data: {
        farm_id: auth.farm_id,
        type: validated.type,
        code,
        trans_date: new Date(validated.trans_date),
        partner_id: validated.partner_id,
        amount: validated.amount,
        vat_rate,
        vat_amount,
        payment_method: validated.payment_method,
        description: validated.description,
        notes: validated.notes,
        ref_number: validated.ref_number,
        created_by: auth.user_id,
      },
    });
    
    // Create items if provided
    if (validated.items?.length) {
      await tx.transactionItem.createMany({
        data: validated.items.map((item) => ({
          transaction_id: transaction.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          amount: item.quantity * item.unit_price,
          vat_rate: item.vat_rate / 100,
          vat_amount: item.quantity * item.unit_price * (item.vat_rate / 100),
        })),
      });
    }
    
    // Update partner balance if applicable
    if (validated.partner_id && validated.payment_method === 'CREDIT') {
      const balanceField = validated.type === 'SALE' ? 'balance_ar' : 'balance_ap';
      await tx.partner.update({
        where: { id: validated.partner_id },
        data: { [balanceField]: { increment: validated.amount + vat_amount } },
      });
    }
    
    return transaction;
  });
  
  return NextResponse.json({
    success: true,
    data: result,
    message: 'Tạo giao dịch thành công',
  });
}
```

### 1.3 Transaction Code Generator

```typescript
// src/lib/transaction-utils.ts

import { prisma } from '@/lib/prisma';

const TYPE_PREFIX: Record<string, string> = {
  CASH_IN: 'PT',      // Phiếu thu
  CASH_OUT: 'PC',     // Phiếu chi
  BANK_TRANSFER: 'BC', // Bank chuyển
  SALE: 'BH',         // Bán hàng
  PURCHASE: 'MH',     // Mua hàng
  PAYROLL: 'TL',      // Trả lương
};

export async function generateTransactionCode(
  farm_id: string,
  type: string
): Promise<string> {
  const prefix = TYPE_PREFIX[type] || 'GD';
  const year = new Date().getFullYear();
  
  // Find last transaction of this type and year
  const lastTrans = await prisma.transaction.findFirst({
    where: {
      farm_id,
      code: { startsWith: `${prefix}-${year}` },
    },
    orderBy: { code: 'desc' },
  });
  
  let nextNumber = 1;
  if (lastTrans) {
    const lastNumber = parseInt(lastTrans.code.split('-').pop() || '0');
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}-${year}-${String(nextNumber).padStart(4, '0')}`;
}
```

---

## PHẦN 2: UI COMPONENTS

### 2.1 Transaction List Page

```tsx
// src/app/(dashboard)/transactions/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useLabels } from '@/hooks/use-labels';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ArrowDownCircle, ArrowUpCircle, Plus } from 'lucide-react';
import { TransactionCard } from '@/components/transactions/transaction-card';
import { CashInForm } from '@/components/transactions/cash-in-form';
import { CashOutForm } from '@/components/transactions/cash-out-form';
import { formatDate, formatCurrency } from '@/lib/utils';

export default function TransactionsPage() {
  const { t } = useLabels();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [formType, setFormType] = useState<'in' | 'out' | null>(null);
  
  useEffect(() => {
    fetchTransactions();
  }, [activeTab]);
  
  const fetchTransactions = async () => {
    let url = '/api/transactions?limit=50';
    if (activeTab === 'in') url += '&type=CASH_IN';
    if (activeTab === 'out') url += '&type=CASH_OUT';
    
    const res = await apiClient.get(url);
    if (res.success) setTransactions(res.data);
  };
  
  const handleFormClose = () => {
    setFormType(null);
    fetchTransactions();
  };
  
  // Calculate totals
  const totals = transactions.reduce(
    (acc, t) => {
      if (['CASH_IN', 'SALE'].includes(t.type)) acc.in += Number(t.amount);
      else acc.out += Number(t.amount);
      return acc;
    },
    { in: 0, out: 0 }
  );
  
  return (
    <div className="container mx-auto p-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600 flex items-center gap-2">
            <ArrowDownCircle className="w-4 h-4" />
            Tổng thu
          </div>
          <div className="text-xl font-bold text-green-700">
            {formatCurrency(totals.in)}
          </div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-sm text-red-600 flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4" />
            Tổng chi
          </div>
          <div className="text-xl font-bold text-red-700">
            {formatCurrency(totals.out)}
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-2 mb-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              className="flex-1 bg-green-600"
              onClick={() => setFormType('in')}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('cash_in')}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{t('cash_in')}</SheetTitle>
            </SheetHeader>
            <CashInForm onSuccess={handleFormClose} />
          </SheetContent>
        </Sheet>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button 
              className="flex-1"
              variant="outline"
              onClick={() => setFormType('out')}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('cash_out')}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md">
            <SheetHeader>
              <SheetTitle>{t('cash_out')}</SheetTitle>
            </SheetHeader>
            <CashOutForm onSuccess={handleFormClose} />
          </SheetContent>
        </Sheet>
      </div>
      
      {/* Tabs & List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="all" className="flex-1">Tất cả</TabsTrigger>
          <TabsTrigger value="in" className="flex-1">Thu</TabsTrigger>
          <TabsTrigger value="out" className="flex-1">Chi</TabsTrigger>
        </TabsList>
        
        <div className="space-y-2">
          {transactions.map((trans) => (
            <TransactionCard key={trans.id} transaction={trans} />
          ))}
        </div>
      </Tabs>
    </div>
  );
}
```

### 2.2 Cash In/Out Forms

```tsx
// src/components/transactions/cash-in-form.tsx

'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface CashInFormProps {
  onSuccess: () => void;
}

export function CashInForm({ onSuccess }: CashInFormProps) {
  const [formData, setFormData] = useState({
    trans_date: new Date().toISOString().split('T')[0],
    amount: '',
    description: '',
    notes: '',
    payment_method: 'CASH',
  });
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const res = await apiClient.post('/api/transactions', {
      type: 'CASH_IN',
      ...formData,
      amount: Number(formData.amount),
    });
    
    if (res.success) {
      toast.success(`Thu tiền thành công: ${res.data.code}`);
      onSuccess();
    } else {
      toast.error(res.error?.message || 'Có lỗi xảy ra');
    }
    
    setIsLoading(false);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-6">
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
        <Label>Số tiền</Label>
        <Input
          type="number"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
          placeholder="0"
          required
          className="text-xl font-bold text-green-600"
        />
      </div>
      
      <div className="space-y-2">
        <Label>Nội dung</Label>
        <Input
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="VD: Thu tiền bán lúa"
        />
      </div>
      
      <div className="space-y-2">
        <Label>Ghi chú</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Ghi chú thêm..."
          rows={2}
        />
      </div>
      
      <Button 
        type="submit" 
        disabled={isLoading}
        className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
      >
        {isLoading ? 'Đang lưu...' : 'Xác nhận thu tiền'}
      </Button>
    </form>
  );
}

// cash-out-form.tsx similar but with type: 'CASH_OUT' and red styling
```

### 2.3 Transaction Card

```tsx
// src/components/transactions/transaction-card.tsx

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';

const TYPE_CONFIG: Record<string, { label: string; isIncome: boolean }> = {
  CASH_IN: { label: 'Thu tiền', isIncome: true },
  CASH_OUT: { label: 'Chi tiền', isIncome: false },
  SALE: { label: 'Bán hàng', isIncome: true },
  PURCHASE: { label: 'Mua hàng', isIncome: false },
  PAYROLL: { label: 'Trả lương', isIncome: false },
};

interface TransactionCardProps {
  transaction: {
    id: string;
    code: string;
    type: string;
    trans_date: string;
    amount: number;
    description?: string;
    partner?: { name: string };
  };
}

export function TransactionCard({ transaction }: TransactionCardProps) {
  const config = TYPE_CONFIG[transaction.type] || { label: transaction.type, isIncome: false };
  const Icon = config.isIncome ? ArrowDownCircle : ArrowUpCircle;
  const colorClass = config.isIncome ? 'text-green-600' : 'text-red-600';
  const bgClass = config.isIncome ? 'bg-green-100' : 'bg-red-100';
  
  return (
    <Card className="hover:bg-gray-50">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`w-10 h-10 ${bgClass} rounded-full flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{config.label}</span>
            <Badge variant="outline" className="text-xs">{transaction.code}</Badge>
          </div>
          <div className="text-sm text-gray-500">
            {transaction.description || transaction.partner?.name || 'Không có mô tả'}
          </div>
        </div>
        
        <div className="text-right">
          <div className={`font-bold ${colorClass}`}>
            {config.isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
          </div>
          <div className="text-xs text-gray-400">
            {formatDate(transaction.trans_date)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## ✅ CHECKLIST HOÀN THÀNH

### API
- [ ] GET /api/transactions (with filters, pagination)
- [ ] POST /api/transactions
- [ ] Transaction code auto-generation
- [ ] Partner balance update for credit transactions

### UI
- [ ] Transaction list page
- [ ] Summary cards (total in/out)
- [ ] Cash In form (Sheet)
- [ ] Cash Out form (Sheet)
- [ ] Transaction card component
- [ ] Filter tabs (All/In/Out)

### Testing
- [ ] Create cash in → code generated, list updates
- [ ] Create cash out → code different, list updates
- [ ] Filter by type → correct filtering
- [ ] Totals calculate correctly

---

## 🔗 KẾT NỐI VỚI TASK TIẾP THEO

### Output → Task 6 (Sales/Purchases)
- Transaction API (reused with SALE/PURCHASE type)
- Transaction items model
- Partner balance logic

### Output → Task 8 (Dashboard)
- Transaction data cho summary calculations

---

**Estimated Time:** 5-6 giờ  
**Next Task:** Task 6 - Sales/Purchases + Payables
