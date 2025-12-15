// src/app/(dashboard)/thue/to-khai/tao-moi/page.tsx
// Create new VAT Declaration page

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCreateVATDeclaration, useCalculateVAT } from '@/hooks/use-vat';
import Link from 'next/link';

export default function CreateVATDeclarationPage() {
    const router = useRouter();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const [periodType, setPeriodType] = useState<'MONTHLY' | 'QUARTERLY'>('MONTHLY');
    const [year, setYear] = useState(currentYear);
    const [month, setMonth] = useState(currentMonth);
    const [quarter, setQuarter] = useState(Math.ceil(currentMonth / 3));
    const [notes, setNotes] = useState('');

    const createDeclaration = useCreateVATDeclaration();
    const calculateVAT = useCalculateVAT();

    const periodCode = periodType === 'MONTHLY'
        ? `${year}-${String(month).padStart(2, '0')}`
        : `${year}-Q${quarter}`;

    const handleSubmit = async () => {
        try {
            const declaration = await createDeclaration.mutateAsync({
                period_type: periodType,
                period_code: periodCode,
                notes: notes || undefined,
            });

            // Auto calculate after create
            await calculateVAT.mutateAsync(declaration.id);

            router.push(`/thue/to-khai/${declaration.id}`);
        } catch (error) {
            // Error handling done in hook
        }
    };

    const isLoading = createDeclaration.isPending || calculateVAT.isPending;

    return (
        <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/thue/to-khai">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Tạo tờ khai mới</h1>
                    <p className="text-muted-foreground text-sm">
                        Tạo tờ khai thuế GTGT cho kỳ kế toán
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Thông tin kỳ khai</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Period Type */}
                    <div className="space-y-2">
                        <Label>Loại kỳ khai</Label>
                        <Select
                            value={periodType}
                            onValueChange={(v) => setPeriodType(v as 'MONTHLY' | 'QUARTERLY')}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="MONTHLY">Hàng tháng</SelectItem>
                                <SelectItem value="QUARTERLY">Hàng quý</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Year */}
                    <div className="space-y-2">
                        <Label>Năm</Label>
                        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[currentYear, currentYear - 1].map((y) => (
                                    <SelectItem key={y} value={String(y)}>
                                        {y}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Month/Quarter */}
                    {periodType === 'MONTHLY' ? (
                        <div className="space-y-2">
                            <Label>Tháng</Label>
                            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                        <SelectItem key={m} value={String(m)}>
                                            Tháng {m}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <Label>Quý</Label>
                            <Select value={String(quarter)} onValueChange={(v) => setQuarter(Number(v))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4].map((q) => (
                                        <SelectItem key={q} value={String(q)}>
                                            Quý {q}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Preview */}
                    <div className="p-4 bg-muted rounded-lg">
                        <div className="text-sm text-muted-foreground">Mã kỳ khai</div>
                        <div className="text-xl font-bold">{periodCode}</div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2">
                        <Label>Ghi chú (không bắt buộc)</Label>
                        <Textarea
                            placeholder="Ghi chú thêm..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
                <Link href="/thue/to-khai" className="flex-1">
                    <Button variant="outline" className="w-full">
                        Hủy
                    </Button>
                </Link>
                <Button className="flex-1" onClick={handleSubmit} disabled={isLoading}>
                    {isLoading ? (
                        <>Đang xử lý...</>
                    ) : (
                        <>
                            <Calculator className="w-4 h-4 mr-2" />
                            Tạo và tính thuế
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
