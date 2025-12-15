// src/app/(dashboard)/thue/xuat-ho-so/page.tsx
// Tax Package Export Page

'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    Package,
    CheckCircle,
    AlertTriangle,
    XCircle,
    Download,
    Loader2,
    FileArchive,
    History,
    RefreshCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    useExportChecklist,
    useExportTaxPackage,
    useTaxPackageHistory,
    useDownloadTaxPackage,
} from '@/hooks/use-tax-package';
import type { ChecklistItem } from '@/types/tax-package';

// Format file size
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Generate period options
function generatePeriodOptions(type: 'MONTHLY' | 'QUARTERLY') {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();

    if (type === 'MONTHLY') {
        for (let y = currentYear; y >= currentYear - 1; y--) {
            const maxMonth = y === currentYear ? now.getMonth() + 1 : 12;
            for (let m = maxMonth; m >= 1; m--) {
                options.push({
                    value: `${y}-${String(m).padStart(2, '0')}`,
                    label: `Tháng ${m}/${y}`,
                });
            }
        }
    } else {
        for (let y = currentYear; y >= currentYear - 1; y--) {
            const maxQ = y === currentYear ? Math.ceil((now.getMonth() + 1) / 3) : 4;
            for (let q = maxQ; q >= 1; q--) {
                options.push({
                    value: `${y}-Q${q}`,
                    label: `Quý ${q}/${y}`,
                });
            }
        }
    }

    return options;
}

export default function TaxPackageExportPage() {
    const now = new Date();
    const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);

    const [config, setConfig] = useState({
        period_type: 'QUARTERLY' as 'MONTHLY' | 'QUARTERLY',
        period_code: `${now.getFullYear()}-Q${currentQuarter}`,
        include_xml: true,
        include_reports: true,
        include_images: true,
        reports: [
            'cash-book',
            'bank-book',
            'purchase-invoices',
            'sales-invoices',
            'ar-131',
            'ap-331',
            'trial-balance',
            'profit-loss',
        ] as string[],
        image_quality: 'compressed' as 'original' | 'compressed',
    });

    // Queries
    const { data: checklist, isLoading: checklistLoading, refetch: refetchChecklist } = useExportChecklist(
        config.period_type,
        config.period_code
    );
    const { data: history, isLoading: historyLoading } = useTaxPackageHistory(1);
    const exportMutation = useExportTaxPackage();
    const downloadMutation = useDownloadTaxPackage();

    const handleExport = () => {
        if (!checklist?.can_export) {
            return;
        }
        exportMutation.mutate(config as any);
    };

    const statusIcons: Record<string, React.ReactNode> = {
        passed: <CheckCircle className="w-5 h-5 text-green-500" />,
        warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
        failed: <XCircle className="w-5 h-5 text-red-500" />,
    };

    const reportOptions = [
        { key: 'cash-book', label: 'Sổ quỹ tiền mặt' },
        { key: 'bank-book', label: 'Sổ tiền gửi ngân hàng' },
        { key: 'purchase-invoices', label: 'Bảng kê HĐ mua vào' },
        { key: 'sales-invoices', label: 'Bảng kê HĐ bán ra' },
        { key: 'ar-131', label: 'Sổ chi tiết công nợ 131' },
        { key: 'ap-331', label: 'Sổ chi tiết công nợ 331' },
        { key: 'trial-balance', label: 'Bảng cân đối SPS' },
        { key: 'profit-loss', label: 'Báo cáo lãi lỗ' },
    ];

    return (
        <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Package className="w-7 h-7" />
                        Xuất hồ sơ thuế
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Tạo bộ hồ sơ thuế đầy đủ dạng ZIP
                    </p>
                </div>
            </div>

            <Tabs defaultValue="export" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="export">Xuất mới</TabsTrigger>
                    <TabsTrigger value="history">Lịch sử</TabsTrigger>
                </TabsList>

                <TabsContent value="export" className="space-y-4">
                    {/* Period Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Chọn kỳ khai thuế</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Loại kỳ</Label>
                                    <Select
                                        value={config.period_type}
                                        onValueChange={(v) =>
                                            setConfig({
                                                ...config,
                                                period_type: v as 'MONTHLY' | 'QUARTERLY',
                                                period_code:
                                                    v === 'MONTHLY'
                                                        ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
                                                        : `${now.getFullYear()}-Q${currentQuarter}`,
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="MONTHLY">Tháng</SelectItem>
                                            <SelectItem value="QUARTERLY">Quý</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Kỳ</Label>
                                    <Select
                                        value={config.period_code}
                                        onValueChange={(v) => setConfig({ ...config, period_code: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {generatePeriodOptions(config.period_type).map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Checklist */}
                    <Card>
                        <CardHeader className="flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    📋 Kiểm tra trước khi xuất
                                    {checklist && (
                                        <Badge variant={checklist.can_export ? 'default' : 'destructive'}>
                                            {checklist.summary.passed}/{checklist.summary.total}
                                        </Badge>
                                    )}
                                </CardTitle>
                                {checklist && (
                                    <CardDescription>
                                        Kỳ: {checklist.period.from_date} → {checklist.period.to_date}
                                    </CardDescription>
                                )}
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => refetchChecklist()}>
                                <RefreshCcw className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {checklistLoading ? (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Đang kiểm tra...
                                </div>
                            ) : checklist ? (
                                <div className="space-y-2">
                                    {checklist.items.map((item: ChecklistItem) => (
                                        <div
                                            key={item.id}
                                            className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                                        >
                                            {statusIcons[item.status]}
                                            <div className="flex-1">
                                                <div className="font-medium">{item.title}</div>
                                                <div className="text-sm text-muted-foreground">{item.description}</div>
                                                {item.details && (
                                                    <div className="text-xs text-muted-foreground mt-1">{item.details}</div>
                                                )}
                                            </div>
                                            {item.fix_action && item.status !== 'passed' && (
                                                <Button size="sm" variant="outline" asChild>
                                                    <a href={item.link}>{item.fix_action}</a>
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </CardContent>
                    </Card>

                    {/* Export Options */}
                    <Card>
                        <CardHeader>
                            <CardTitle>📁 Nội dung hồ sơ</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id="include_xml"
                                    checked={config.include_xml}
                                    onCheckedChange={(c) => setConfig({ ...config, include_xml: !!c })}
                                />
                                <Label htmlFor="include_xml" className="flex-1">
                                    <div className="font-medium">Tờ khai GTGT (XML)</div>
                                    <div className="text-sm text-muted-foreground">File XML theo format chuẩn GDT</div>
                                </Label>
                            </div>

                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id="include_reports"
                                    checked={config.include_reports}
                                    onCheckedChange={(c) => setConfig({ ...config, include_reports: !!c })}
                                />
                                <Label htmlFor="include_reports" className="flex-1">
                                    <div className="font-medium">8 báo cáo kế toán (Excel)</div>
                                    <div className="text-sm text-muted-foreground">
                                        Sổ quỹ, sổ ngân hàng, bảng kê HĐ, công nợ...
                                    </div>
                                </Label>
                            </div>

                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id="include_images"
                                    checked={config.include_images}
                                    onCheckedChange={(c) => setConfig({ ...config, include_images: !!c })}
                                />
                                <Label htmlFor="include_images" className="flex-1">
                                    <div className="font-medium">Ảnh hóa đơn</div>
                                    <div className="text-sm text-muted-foreground">
                                        Ảnh chụp/scan hóa đơn mua vào, bán ra
                                    </div>
                                </Label>
                            </div>

                            {config.include_reports && (
                                <div className="pl-8 pt-2 space-y-2 border-l-2 border-muted">
                                    <div className="text-sm font-medium text-muted-foreground mb-2">Chọn báo cáo:</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {reportOptions.map((opt) => (
                                            <div key={opt.key} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={`report-${opt.key}`}
                                                    checked={config.reports.includes(opt.key)}
                                                    onCheckedChange={(c) => {
                                                        if (c) {
                                                            setConfig({
                                                                ...config,
                                                                reports: [...config.reports, opt.key],
                                                            });
                                                        } else {
                                                            setConfig({
                                                                ...config,
                                                                reports: config.reports.filter((r) => r !== opt.key),
                                                            });
                                                        }
                                                    }}
                                                />
                                                <Label htmlFor={`report-${opt.key}`} className="text-sm">
                                                    {opt.label}
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Export Button */}
                    <Button
                        className="w-full h-14 text-lg"
                        disabled={!checklist?.can_export || exportMutation.isPending}
                        onClick={handleExport}
                    >
                        {exportMutation.isPending ? (
                            <>
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                Đang xuất...
                            </>
                        ) : (
                            <>
                                <FileArchive className="w-5 h-5 mr-2" />
                                Xuất hồ sơ thuế (.zip)
                            </>
                        )}
                    </Button>

                    {!checklist?.can_export && checklist && (
                        <p className="text-center text-sm text-destructive">
                            Vui lòng khắc phục các lỗi (❌) trước khi xuất
                        </p>
                    )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="w-5 h-5" />
                                Lịch sử xuất hồ sơ
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {historyLoading ? (
                                <div className="space-y-3">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton key={i} className="h-16 w-full" />
                                    ))}
                                </div>
                            ) : history && history.items.length > 0 ? (
                                <div className="space-y-3">
                                    {history.items.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <FileArchive className="w-8 h-8 text-primary" />
                                                <div>
                                                    <div className="font-medium">{item.file_name}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })} •{' '}
                                                        {formatFileSize(item.file_size)} •{' '}
                                                        {item.download_count} lượt tải
                                                    </div>
                                                </div>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    downloadMutation.mutate({ id: item.id, fileName: item.file_name })
                                                }
                                            >
                                                <Download className="w-4 h-4 mr-1" />
                                                Tải
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <FileArchive className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>Chưa có hồ sơ nào được xuất</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
