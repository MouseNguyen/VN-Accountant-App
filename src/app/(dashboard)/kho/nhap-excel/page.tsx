'use client';

// src/app/(dashboard)/kho/nhap-excel/page.tsx
// Trang nhập kho từ Excel

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft,
    Upload,
    FileSpreadsheet,
    Check,
    X,
    AlertCircle,
    Download,
    Trash2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { formatMoney, formatQuantity } from '@/lib/decimal';

interface ImportItem {
    product_code: string;
    quantity: number;
    unit_price: number;
    valid?: boolean;
    error?: string;
}

interface ImportResult {
    success: boolean;
    product_code: string;
    product_name?: string;
    quantity: number;
    unit_price?: number;
    message?: string;
}

export default function ImportExcelPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [importType, setImportType] = useState<'IN' | 'OUT'>('IN');
    const [importDate, setImportDate] = useState(new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState<ImportItem[]>([]);
    const [isImporting, setIsImporting] = useState(false);
    const [results, setResults] = useState<ImportResult[] | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Simple CSV/TSV parser (for demo - in production use xlsx library)
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
            toast.error('File không hợp lệ', { description: 'File phải có header và ít nhất 1 dòng dữ liệu' });
            return;
        }

        const parsedItems: ImportItem[] = [];

        // Skip header (first line)
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(/[,\t;]/);
            if (cols.length >= 2) {
                const productCode = cols[0]?.trim();
                const quantity = parseFloat(cols[1]?.trim() || '0');
                const unitPrice = parseFloat(cols[2]?.trim() || '0');

                if (productCode && quantity > 0) {
                    parsedItems.push({
                        product_code: productCode,
                        quantity,
                        unit_price: unitPrice || 0,
                        valid: true,
                    });
                }
            }
        }

        if (parsedItems.length === 0) {
            toast.error('Không tìm thấy dữ liệu', { description: 'Kiểm tra định dạng file' });
            return;
        }

        setItems(parsedItems);
        setResults(null);
        toast.success(`Đã tải ${parsedItems.length} sản phẩm`);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleImport = async () => {
        if (items.length === 0) {
            toast.error('Chưa có dữ liệu để import');
            return;
        }

        setIsImporting(true);
        try {
            const res = await fetch('/api/stock-movements/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: importType,
                    date: importDate,
                    items: items.map(item => ({
                        product_code: item.product_code,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                    })),
                }),
            });

            const data = await res.json();

            if (data.success) {
                setResults(data.data.results);
                toast.success(data.message);
            } else {
                toast.error('Lỗi import', { description: data.error?.message });
            }
        } catch (error) {
            toast.error('Lỗi kết nối');
        } finally {
            setIsImporting(false);
        }
    };

    const handleDownloadTemplate = () => {
        const template = 'product_code,quantity,unit_price\nSP001,100,50000\nSP002,50,80000';
        const blob = new Blob([template], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_import_kho.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const successCount = results?.filter(r => r.success).length || 0;
    const failCount = results?.filter(r => !r.success).length || 0;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-card border-b">
                <div className="flex items-center gap-3 px-4 py-3">
                    <Link href="/kho">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold">Import từ Excel</h1>
                        <p className="text-xs text-muted-foreground">Nhập/xuất kho hàng loạt</p>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="p-4 max-w-4xl mx-auto space-y-4">
                {/* Settings */}
                <Card>
                    <CardContent className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <Label>Loại phiếu</Label>
                                <Select value={importType} onValueChange={(v: 'IN' | 'OUT') => setImportType(v)}>
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="IN">📥 Nhập kho</SelectItem>
                                        <SelectItem value="OUT">📤 Xuất kho</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Ngày</Label>
                                <Input
                                    type="date"
                                    value={importDate}
                                    onChange={(e) => setImportDate(e.target.value)}
                                    className="mt-1"
                                />
                            </div>
                            <div className="flex items-end">
                                <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
                                    <Download className="h-4 w-4 mr-2" />
                                    Tải mẫu CSV
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Upload */}
                <Card>
                    <CardContent className="p-4">
                        <div
                            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                            <p className="font-medium">Kéo thả file hoặc click để chọn</p>
                            <p className="text-sm text-muted-foreground mt-1">
                                Hỗ trợ: CSV, TSV (Mã SP, Số lượng, Đơn giá)
                            </p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv,.tsv,.txt"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Preview */}
                {items.length > 0 && !results && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center justify-between">
                                <span>Xem trước ({items.length} sản phẩm)</span>
                                <Button variant="ghost" size="sm" onClick={() => setItems([])}>
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Xóa tất cả
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-80 overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Mã SP</TableHead>
                                            <TableHead className="text-right">Số lượng</TableHead>
                                            <TableHead className="text-right">Đơn giá</TableHead>
                                            <TableHead className="w-10"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {items.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-mono">{item.product_code}</TableCell>
                                                <TableCell className="text-right">{formatQuantity(item.quantity)}</TableCell>
                                                <TableCell className="text-right">{formatMoney(item.unit_price)}đ</TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleRemoveItem(index)}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Results */}
                {results && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                Kết quả Import
                                <Badge variant="secondary" className="bg-green-100 text-green-700">
                                    {successCount} thành công
                                </Badge>
                                {failCount > 0 && (
                                    <Badge variant="secondary" className="bg-red-100 text-red-700">
                                        {failCount} thất bại
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-80 overflow-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-10"></TableHead>
                                            <TableHead>Mã SP</TableHead>
                                            <TableHead>Tên</TableHead>
                                            <TableHead className="text-right">SL</TableHead>
                                            <TableHead>Ghi chú</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {results.map((result, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    {result.success ? (
                                                        <Check className="h-4 w-4 text-green-600" />
                                                    ) : (
                                                        <AlertCircle className="h-4 w-4 text-red-600" />
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-mono">{result.product_code}</TableCell>
                                                <TableCell>{result.product_name || '-'}</TableCell>
                                                <TableCell className="text-right">{formatQuantity(result.quantity)}</TableCell>
                                                <TableCell className={result.success ? '' : 'text-red-600'}>
                                                    {result.message || (result.success ? 'OK' : '')}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    {!results ? (
                        <Button
                            className="flex-1 h-14 text-lg"
                            onClick={handleImport}
                            disabled={items.length === 0 || isImporting}
                        >
                            <Upload className="h-5 w-5 mr-2" />
                            {isImporting ? 'Đang import...' : `Import ${items.length} sản phẩm`}
                        </Button>
                    ) : (
                        <Button
                            className="flex-1 h-14"
                            onClick={() => router.push('/kho')}
                        >
                            <Check className="h-5 w-5 mr-2" />
                            Hoàn thành
                        </Button>
                    )}
                </div>
            </main>
        </div>
    );
}
