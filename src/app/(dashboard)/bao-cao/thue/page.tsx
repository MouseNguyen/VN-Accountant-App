// src/app/(dashboard)/bao-cao/thue/page.tsx

'use client';

import { useState } from 'react';
import { useTaxReport, useConfirmTaxPayment } from '@/hooks/use-tax-report';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/utils';
import { Calendar, Check, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TaxReportPage() {
    const currentDate = new Date();
    const [quarter, setQuarter] = useState(Math.ceil((currentDate.getMonth() + 1) / 3));
    const [year, setYear] = useState(currentDate.getFullYear());

    const { data, isLoading, error } = useTaxReport(quarter, year);
    const confirmMutation = useConfirmTaxPayment();

    const handleConfirmVAT = () => {
        if (!data) return;
        confirmMutation.mutate({
            tax_type: 'VAT',
            quarter,
            year,
            amount: data.vat.payable,
        });
    };

    const handleConfirmBHXH = () => {
        if (!data) return;
        confirmMutation.mutate({
            tax_type: 'BHXH',
            quarter,
            year,
            amount: data.insurance.total_payable,
        });
    };

    const vatPaid = data?.payments.find((p) => p.tax_type === 'VAT' && p.status === 'PAID');
    const bhxhPaid = data?.payments.find((p) => p.tax_type === 'BHXH' && p.status === 'PAID');

    // Debug log for mobile issue
    console.log('[TaxReportPage] State:', { quarter, year, isLoading, hasError: !!error, hasData: !!data });
    if (data) {
        console.log('[TaxReportPage] Data:', { vatPayable: data.vat.payable, totalLiability: data.total_liability });
    }

    return (
        <div className="p-4 pb-24 space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/dashboard" className="p-2 hover:bg-muted rounded-lg">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-xl font-bold">📊 Báo cáo Thuế</h1>
            </div>

            {/* Period Selector */}
            <Card>
                <CardContent className="p-4 flex items-center gap-4">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <select
                        value={quarter}
                        onChange={(e) => setQuarter(Number(e.target.value))}
                        className="border rounded-lg px-3 py-2 text-sm"
                    >
                        <option value={1}>Quý 1</option>
                        <option value={2}>Quý 2</option>
                        <option value={3}>Quý 3</option>
                        <option value={4}>Quý 4</option>
                    </select>
                    <select
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="border rounded-lg px-3 py-2 text-sm"
                    >
                        {[2023, 2024, 2025, 2026].map((y) => (
                            <option key={y} value={y}>
                                {y}
                            </option>
                        ))}
                    </select>
                </CardContent>
            </Card>

            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-48 w-full rounded-xl" />
                    <Skeleton className="h-48 w-full rounded-xl" />
                    <Skeleton className="h-24 w-full rounded-xl" />
                </div>
            ) : error ? (
                <Card className="border-red-500 bg-red-50 dark:bg-red-900/20">
                    <CardContent className="p-6 text-center text-red-600">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                        <p>Không thể tải dữ liệu báo cáo thuế</p>
                    </CardContent>
                </Card>
            ) : data ? (
                <>
                    {/* VAT Summary */}
                    <Card className={vatPaid ? 'border-green-500' : 'border-orange-500'}>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                🧾 Thuế GTGT (VAT)
                                {vatPaid ? (
                                    <span className="text-green-600 text-sm flex items-center gap-1">
                                        <Check className="w-4 h-4" /> Đã nộp
                                    </span>
                                ) : (
                                    <span className="text-orange-600 text-sm flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" /> Chưa nộp
                                    </span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">VAT Đầu ra (bán hàng):</span>
                                <span className="font-medium text-green-600">+{formatMoney(data.vat.output)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">VAT Đầu vào (mua hàng):</span>
                                <span className="font-medium text-red-600">-{formatMoney(data.vat.input)}</span>
                            </div>
                            <hr className="my-2" />
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>VAT phải nộp:</span>
                                <span className={data.vat.payable > 0 ? 'text-red-600' : 'text-green-600'}>
                                    {formatMoney(data.vat.payable)}
                                </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Số giao dịch: {data.vat.transaction_count.income} thu, {data.vat.transaction_count.expense} chi
                            </p>

                            {!vatPaid && data.vat.payable > 0 && (
                                <Button
                                    onClick={handleConfirmVAT}
                                    className="w-full mt-4"
                                    disabled={confirmMutation.isPending}
                                >
                                    {confirmMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : null}
                                    🏦 Xác nhận đã nộp VAT
                                </Button>
                            )}

                            {vatPaid && (
                                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-sm text-green-700">
                                    ✅ Đã nộp ngày {new Date(vatPaid.paid_at!).toLocaleDateString('vi-VN')}
                                    {vatPaid.transaction_code && ` - Mã GD: ${vatPaid.transaction_code}`}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* BHXH Summary */}
                    <Card className={bhxhPaid ? 'border-green-500' : 'border-orange-500'}>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                🏢 Bảo hiểm xã hội
                                {bhxhPaid ? (
                                    <span className="text-green-600 text-sm flex items-center gap-1">
                                        <Check className="w-4 h-4" /> Đã nộp
                                    </span>
                                ) : (
                                    <span className="text-orange-600 text-sm flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" /> Chưa nộp
                                    </span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Phần NV đóng (10.5%):</span>
                                <span className="font-medium">{formatMoney(data.insurance.employee_portion)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Phần DN đóng (21.5%):</span>
                                <span className="font-medium">{formatMoney(data.insurance.employer_portion)}</span>
                            </div>
                            <hr className="my-2" />
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>Tổng nộp BHXH:</span>
                                <span className="text-red-600">{formatMoney(data.insurance.total_payable)}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Số nhân viên: {data.insurance.worker_count} người
                            </p>

                            {!bhxhPaid && data.insurance.total_payable > 0 && (
                                <Button
                                    onClick={handleConfirmBHXH}
                                    className="w-full mt-4"
                                    disabled={confirmMutation.isPending}
                                >
                                    {confirmMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : null}
                                    🏦 Xác nhận đã nộp BHXH
                                </Button>
                            )}

                            {bhxhPaid && (
                                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-sm text-green-700">
                                    ✅ Đã nộp ngày {new Date(bhxhPaid.paid_at!).toLocaleDateString('vi-VN')}
                                    {bhxhPaid.transaction_code && ` - Mã GD: ${bhxhPaid.transaction_code}`}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Total Summary */}
                    <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                        <CardContent className="p-6">
                            <div className="text-lg opacity-90">
                                Tổng nghĩa vụ thuế Quý {quarter}/{year}
                            </div>
                            <div className="text-3xl font-bold mt-2">{formatMoney(data.total_liability)}</div>
                            <div className="mt-3 text-sm opacity-80">
                                {vatPaid && bhxhPaid ? (
                                    <span className="flex items-center gap-1">
                                        <Check className="w-4 h-4" /> Đã nộp đầy đủ
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" /> Còn {!vatPaid && !bhxhPaid ? '2' : '1'} khoản chưa nộp
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </>
            ) : (
                <Card>
                    <CardContent className="p-8 text-center">
                        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-muted-foreground">Không có dữ liệu thuế cho kỳ này</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Hãy tạo giao dịch thu/chi để bắt đầu tính thuế
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
