// src/app/(dashboard)/giao-dich/tao/page.tsx
// Tạo giao dịch mới (Income/Expense)

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatMoney } from '@/lib/utils';
import { toast } from 'sonner';
import {
    ArrowLeft,
    TrendingUp,
    TrendingDown,
    Loader2,
    Check,
} from 'lucide-react';

type TransactionType = 'INCOME' | 'EXPENSE' | 'CASH_IN' | 'CASH_OUT';

// Mapping for labels and colors
const TYPE_CONFIG: Record<TransactionType, { label: string; subLabel: string; color: string; icon: 'up' | 'down' }> = {
    INCOME: { label: 'Bán hàng', subLabel: 'Doanh thu từ bán sản phẩm', color: 'bg-green-500 hover:bg-green-600', icon: 'up' },
    CASH_IN: { label: 'Thu tiền', subLabel: 'Thu công nợ, vay, góp vốn', color: 'bg-emerald-500 hover:bg-emerald-600', icon: 'up' },
    EXPENSE: { label: 'Mua hàng', subLabel: 'Chi phí mua nguyên vật liệu', color: 'bg-red-500 hover:bg-red-600', icon: 'down' },
    CASH_OUT: { label: 'Chi tiền', subLabel: 'Trả nợ, lương, điện nước', color: 'bg-orange-500 hover:bg-orange-600', icon: 'down' },
};


export default function CreateTransactionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const typeParam = searchParams.get('type') as TransactionType | null;

    const [type, setType] = useState<TransactionType>(typeParam || 'EXPENSE');
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [transactionDate, setTransactionDate] = useState(
        new Date().toISOString().split('T')[0]
    );
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const numAmount = parseFloat(amount.replace(/[,.]/g, ''));
        if (isNaN(numAmount) || numAmount <= 0) {
            toast.error('Vui lòng nhập số tiền hợp lệ');
            return;
        }

        setSubmitting(true);
        try {
            const res = await apiClient.post('/transactions', {
                trans_type: type,
                trans_date: transactionDate,
                description: description || TYPE_CONFIG[type].label,
                items: [{
                    description: description || TYPE_CONFIG[type].label,
                    quantity: 1,
                    unit: 'lần',
                    unit_price: numAmount,
                }],
                payment_method: 'CASH',
                paid_amount: numAmount,
            });

            if (!res.success) {
                throw new Error(res.error?.message || 'Lỗi tạo giao dịch');
            }

            toast.success(`Đã ghi ${TYPE_CONFIG[type].label}!`);
            router.push('/giao-dich');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Lỗi tạo giao dịch');
        } finally {
            setSubmitting(false);
        }
    };

    const isIncome = type === 'INCOME' || type === 'CASH_IN';
    const config = TYPE_CONFIG[type];

    return (
        <div className="p-4 min-h-screen pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Link href="/dashboard" className="p-2 hover:bg-muted rounded-lg">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-xl font-bold">
                    {isIncome ? '📈 Thu tiền' : '📉 Chi tiền'}
                </h1>
            </div>

            {/* Type Switcher - 4 buttons */}
            <div className="grid grid-cols-2 gap-2 mb-6">
                <Button
                    variant={type === 'INCOME' ? 'default' : 'outline'}
                    className={type === 'INCOME' ? TYPE_CONFIG.INCOME.color : ''}
                    onClick={() => setType('INCOME')}
                >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Bán hàng
                </Button>
                <Button
                    variant={type === 'EXPENSE' ? 'default' : 'outline'}
                    className={type === 'EXPENSE' ? TYPE_CONFIG.EXPENSE.color : ''}
                    onClick={() => setType('EXPENSE')}
                >
                    <TrendingDown className="w-4 h-4 mr-2" />
                    Mua hàng
                </Button>
                <Button
                    variant={type === 'CASH_IN' ? 'default' : 'outline'}
                    className={type === 'CASH_IN' ? TYPE_CONFIG.CASH_IN.color : ''}
                    onClick={() => setType('CASH_IN')}
                >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Thu tiền
                </Button>
                <Button
                    variant={type === 'CASH_OUT' ? 'default' : 'outline'}
                    className={type === 'CASH_OUT' ? TYPE_CONFIG.CASH_OUT.color : ''}
                    onClick={() => setType('CASH_OUT')}
                >
                    <TrendingDown className="w-4 h-4 mr-2" />
                    Chi tiền
                </Button>
            </div>

            {/* Selected Type Info */}
            <div className="mb-4 p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">{config.subLabel}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Amount */}
                <Card>
                    <CardContent className="p-4">
                        <Label htmlFor="amount" className="text-lg">Số tiền</Label>
                        <div className="relative mt-2">
                            <Input
                                id="amount"
                                type="text"
                                inputMode="numeric"
                                value={amount}
                                onChange={(e) => {
                                    // Format as VND number
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    if (val) {
                                        setAmount(parseInt(val).toLocaleString('vi-VN'));
                                    } else {
                                        setAmount('');
                                    }
                                }}
                                placeholder="0"
                                className="text-2xl font-bold text-right pr-12"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">
                                đ
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Date */}
                <Card>
                    <CardContent className="p-4">
                        <Label htmlFor="date">Ngày giao dịch</Label>
                        <Input
                            id="date"
                            type="date"
                            value={transactionDate}
                            onChange={(e) => setTransactionDate(e.target.value)}
                            className="mt-2"
                        />
                    </CardContent>
                </Card>

                {/* Description */}
                <Card>
                    <CardContent className="p-4">
                        <Label htmlFor="description">Ghi chú</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder={`VD: ${config.subLabel}`}
                            className="mt-2"
                            rows={2}
                        />
                    </CardContent>
                </Card>

                {/* Preview */}
                <Card className={isIncome ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}>
                    <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                            <span>{isIncome ? 'Tổng thu:' : 'Tổng chi:'}</span>
                            <span className="text-2xl font-bold">
                                {amount ? formatMoney(parseFloat(amount.replace(/[,.]/g, ''))) : '0đ'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Submit */}
                <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    disabled={submitting || !amount}
                >
                    {submitting ? (
                        <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Đang lưu...
                        </>
                    ) : (
                        <>
                            <Check className="w-5 h-5 mr-2" />
                            {isIncome ? 'Ghi thu' : 'Ghi chi'}
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}
