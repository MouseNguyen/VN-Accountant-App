// src/app/(dashboard)/thue/to-khai/[id]/page.tsx
// VAT Declaration Detail Page

'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Calculator,
    Download,
    Send,
    Trash2,
    FileText,
    AlertTriangle,
    CheckCircle2,
    RefreshCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';
import {
    useVATDeclaration,
    useCalculateVAT,
    useSubmitVATDeclaration,
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
const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
    DRAFT: { label: 'Nháp', variant: 'outline', icon: <FileText className="h-4 w-4" /> },
    CALCULATED: { label: 'Đã tính', variant: 'secondary', icon: <Calculator className="h-4 w-4" /> },
    SUBMITTED: { label: 'Đã nộp', variant: 'default', icon: <Send className="h-4 w-4" /> },
    APPROVED: { label: 'Đã duyệt', variant: 'default', icon: <CheckCircle2 className="h-4 w-4" /> },
    REJECTED: { label: 'Bị từ chối', variant: 'destructive', icon: <AlertTriangle className="h-4 w-4" /> },
};

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function VATDeclarationDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const router = useRouter();

    const { data: declaration, isLoading, refetch } = useVATDeclaration(id);
    const calculateVAT = useCalculateVAT();
    const submitDeclaration = useSubmitVATDeclaration();
    const deleteDeclaration = useDeleteVATDeclaration();
    const downloadXML = useDownloadVATXML();

    const handleCalculate = async () => {
        await calculateVAT.mutateAsync(id);
        refetch();
    };

    const handleSubmit = async () => {
        if (confirm('Bạn có chắc muốn nộp tờ khai này? Sau khi nộp sẽ không thể chỉnh sửa.')) {
            await submitDeclaration.mutateAsync(id);
            refetch();
        }
    };

    const handleDelete = async () => {
        if (confirm('Bạn có chắc muốn xóa tờ khai này?')) {
            await deleteDeclaration.mutateAsync(id);
            router.push('/thue/to-khai');
        }
    };

    const handleDownloadXML = async () => {
        if (!declaration) return;
        await downloadXML.mutateAsync({ id: id, periodCode: declaration.period_code });
    };

    if (isLoading) {
        return (
            <div className="p-4 md:p-6 space-y-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        );
    }

    if (!declaration) {
        return (
            <div className="p-4 md:p-6 text-center">
                <p className="text-muted-foreground">Không tìm thấy tờ khai</p>
                <Link href="/thue/to-khai">
                    <Button className="mt-4">Quay lại</Button>
                </Link>
            </div>
        );
    }

    const status = statusConfig[declaration.status] || { label: declaration.status, variant: 'outline' as const, icon: null };
    const isPayable = declaration.payable_vat > 0;
    const canEdit = declaration.status === 'DRAFT' || declaration.status === 'CALCULATED';
    const canSubmit = declaration.status === 'CALCULATED';

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/thue/to-khai">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold">Kỳ {declaration.period_code}</h1>
                            <Badge variant={status.variant} className="flex items-center gap-1">
                                {status.icon}
                                {status.label}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm">
                            {declaration.from_date} → {declaration.to_date}
                        </p>
                    </div>
                </div>

                <Button variant="outline" size="icon" onClick={() => refetch()}>
                    <RefreshCcw className="h-4 w-4" />
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Thuế đầu vào</div>
                        <div className="text-xl font-bold text-blue-600">
                            {formatMoney(declaration.input_vat.tax)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {declaration.input_vat.count} hóa đơn
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Thuế đầu ra</div>
                        <div className="text-xl font-bold text-orange-600">
                            {formatMoney(declaration.output_vat.tax)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {declaration.output_vat.count} hóa đơn
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">
                            {isPayable ? 'Thuế phải nộp' : 'Thuế khấu trừ'}
                        </div>
                        <div className={`text-xl font-bold ${isPayable ? 'text-red-600' : 'text-green-600'}`}>
                            {formatMoney(isPayable ? declaration.payable_vat : declaration.carried_forward)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="text-sm text-muted-foreground">Giá trị hàng hóa</div>
                        <div className="text-xl font-bold">
                            {formatMoney(declaration.input_vat.amount + declaration.output_vat.amount)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Detail Cards */}
            <div className="grid md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Thuế đầu vào (Mua hàng)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Số hóa đơn</span>
                            <span className="font-medium">{declaration.input_vat.count}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Giá trị hàng hóa</span>
                            <span className="font-medium">{formatMoney(declaration.input_vat.amount)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                            <span className="font-semibold">Thuế GTGT</span>
                            <span className="font-bold text-blue-600">{formatMoney(declaration.input_vat.tax)}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Thuế đầu ra (Bán hàng)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Số hóa đơn</span>
                            <span className="font-medium">{declaration.output_vat.count}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Giá trị hàng hóa</span>
                            <span className="font-medium">{formatMoney(declaration.output_vat.amount)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                            <span className="font-semibold">Thuế GTGT</span>
                            <span className="font-bold text-orange-600">{formatMoney(declaration.output_vat.tax)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Result Card */}
            <Card className={isPayable ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : 'border-green-200 bg-green-50 dark:bg-green-950/20'}>
                <CardContent className="p-6 text-center">
                    <div className="text-lg text-muted-foreground">
                        {isPayable ? 'Thuế GTGT phải nộp' : 'Thuế GTGT còn được khấu trừ'}
                    </div>
                    <div className={`text-4xl font-bold mt-2 ${isPayable ? 'text-red-600' : 'text-green-600'}`}>
                        {formatMoney(isPayable ? declaration.payable_vat : declaration.carried_forward)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">
                        = {formatMoney(declaration.output_vat.tax)} (đầu ra) - {formatMoney(declaration.input_vat.tax)} (đầu vào)
                    </div>
                </CardContent>
            </Card>

            {/* Notes */}
            {declaration.notes && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Ghi chú</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground">{declaration.notes}</p>
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
                {canEdit && (
                    <>
                        <Button
                            onClick={handleCalculate}
                            disabled={calculateVAT.isPending}
                        >
                            <Calculator className="w-4 h-4 mr-2" />
                            {calculateVAT.isPending ? 'Đang tính...' : 'Tính lại thuế'}
                        </Button>
                    </>
                )}

                {canSubmit && (
                    <Button
                        variant="default"
                        onClick={handleSubmit}
                        disabled={submitDeclaration.isPending}
                    >
                        <Send className="w-4 h-4 mr-2" />
                        {submitDeclaration.isPending ? 'Đang nộp...' : 'Nộp tờ khai'}
                    </Button>
                )}

                {(declaration.status === 'CALCULATED' || declaration.status === 'SUBMITTED') && (
                    <Button
                        variant="outline"
                        onClick={handleDownloadXML}
                        disabled={downloadXML.isPending}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Tải XML
                    </Button>
                )}

                <div className="flex-1" />

                {canEdit && (
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={deleteDeclaration.isPending}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Xóa
                    </Button>
                )}
            </div>
        </div>
    );
}
