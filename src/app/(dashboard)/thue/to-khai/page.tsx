// src/app/(dashboard)/thue/to-khai/page.tsx
// VAT Declarations List Page

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    Plus,
    FileText,
    Download,
    Calculator,
    ChevronRight,
    Trash2,
    RefreshCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    useVATDeclarations,
    useDeleteVATDeclaration,
    useDownloadVATXML,
} from '@/hooks/use-vat';
import type { VATDeclaration } from '@/types/vat';

// Format money
function formatMoney(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(value);
}

// Status config
const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    DRAFT: { label: 'Nháp', variant: 'outline' },
    CALCULATED: { label: 'Đã tính', variant: 'secondary' },
    SUBMITTED: { label: 'Đã nộp', variant: 'default' },
    APPROVED: { label: 'Đã duyệt', variant: 'default' },
    REJECTED: { label: 'Bị từ chối', variant: 'destructive' },
};

export default function VATDeclarationsPage() {
    const currentYear = new Date().getFullYear();
    const [year, setYear] = useState<number>(currentYear);

    const { data, isLoading, refetch } = useVATDeclarations({ year });
    const deleteDeclaration = useDeleteVATDeclaration();
    const downloadXML = useDownloadVATXML();

    const declarations = data?.items || [];

    const handleDelete = async (id: string) => {
        if (confirm('Bạn có chắc muốn xóa tờ khai này?')) {
            await deleteDeclaration.mutateAsync(id);
        }
    };

    const handleDownloadXML = async (dec: VATDeclaration) => {
        await downloadXML.mutateAsync({ id: dec.id, periodCode: dec.period_code });
    };

    return (
        <div className="p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">📋 Tờ khai thuế GTGT</h1>
                    <p className="text-muted-foreground text-sm">
                        Quản lý tờ khai thuế giá trị gia tăng
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => refetch()}>
                        <RefreshCcw className="h-4 w-4" />
                    </Button>
                    <Link href="/thue/to-khai/tao-moi">
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Tạo tờ khai
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Năm" />
                    </SelectTrigger>
                    <SelectContent>
                        {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                            <SelectItem key={y} value={String(y)}>
                                {y}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Thuế phải nộp</div>
                        <div className="text-2xl font-bold text-red-600">
                            {formatMoney(data?.summary?.total_payable || 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Còn được khấu trừ</div>
                        <div className="text-2xl font-bold text-green-600">
                            {formatMoney(data?.summary?.total_carried || 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* List */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))}
                </div>
            ) : declarations.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Chưa có tờ khai nào trong năm {year}</p>
                        <Link href="/thue/to-khai/tao-moi" className="inline-block mt-4">
                            <Button>
                                <Plus className="w-4 h-4 mr-2" />
                                Tạo tờ khai đầu tiên
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {declarations.map((dec) => {
                        const status = statusConfig[dec.status] || { label: dec.status, variant: 'outline' as const };
                        const isPayable = dec.payable_vat > 0;

                        return (
                            <Card key={dec.id} className="hover:border-primary/50 transition-colors">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between">
                                        <Link href={`/thue/to-khai/${dec.id}`} className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 rounded-lg bg-primary/10">
                                                    <FileText className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <div className="font-semibold">
                                                        Kỳ {dec.period_code}
                                                        {dec.period_type === 'QUARTERLY' && ' (Quý)'}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {dec.from_date} → {dec.to_date}
                                                    </div>
                                                </div>
                                            </div>
                                        </Link>

                                        <div className="flex items-center gap-2">
                                            <Badge variant={status.variant}>{status.label}</Badge>
                                            <div className="text-right ml-4">
                                                {isPayable ? (
                                                    <div className="text-lg font-bold text-red-600">
                                                        -{formatMoney(dec.payable_vat)}
                                                    </div>
                                                ) : (
                                                    <div className="text-lg font-bold text-green-600">
                                                        +{formatMoney(dec.carried_forward)}
                                                    </div>
                                                )}
                                                <div className="text-xs text-muted-foreground">
                                                    {isPayable ? 'Phải nộp' : 'Khấu trừ'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick stats */}
                                    <div className="flex items-center gap-6 mt-4 pt-4 border-t text-sm text-muted-foreground">
                                        <span>
                                            Đầu vào: {dec.input_vat.count} HĐ / {formatMoney(dec.input_vat.tax)}
                                        </span>
                                        <span>
                                            Đầu ra: {dec.output_vat.count} HĐ / {formatMoney(dec.output_vat.tax)}
                                        </span>
                                        <div className="flex-1" />

                                        {/* Actions */}
                                        {(dec.status === 'CALCULATED' || dec.status === 'SUBMITTED') && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDownloadXML(dec)}
                                                disabled={downloadXML.isPending}
                                            >
                                                <Download className="h-4 w-4 mr-1" />
                                                XML
                                            </Button>
                                        )}
                                        {dec.status === 'DRAFT' && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(dec.id)}
                                                disabled={deleteDeclaration.isPending}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        )}
                                        <Link href={`/thue/to-khai/${dec.id}`}>
                                            <Button variant="ghost" size="sm">
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
