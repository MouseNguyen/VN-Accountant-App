// src/app/(dashboard)/test-payroll/page.tsx
'use client';

import { useState } from 'react';
import { useWorkers, useCreateWorker, useActiveWorkers } from '@/hooks/use-workers';
import { useAttendances, useCreateAttendance, useBulkCreateAttendance } from '@/hooks/use-attendances';
import { usePayrolls, useCreatePayroll, usePayroll, useConfirmPayroll, usePayPayroll } from '@/hooks/use-payrolls';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestPayrollPage() {
    const [selectedPayrollId, setSelectedPayrollId] = useState<string>('');

    // Workers
    const { data: workersData, isLoading: loadingWorkers } = useWorkers({ limit: 100 });
    const { data: activeWorkers } = useActiveWorkers();
    const createWorker = useCreateWorker();

    // Attendances
    const today = new Date().toISOString().split('T')[0];
    const { data: attendancesData } = useAttendances({ date_from: today, date_to: today });
    const createAttendance = useCreateAttendance();
    const bulkAttendance = useBulkCreateAttendance();

    // Payrolls
    const { data: payrollsData } = usePayrolls({});
    const { data: payrollDetail } = usePayroll(selectedPayrollId);
    const createPayroll = useCreatePayroll();
    const confirmPayroll = useConfirmPayroll();
    const payPayroll = usePayPayroll();

    const handleCreateWorker = async () => {
        try {
            await createWorker.mutateAsync({
                name: `Nhân viên Test ${Date.now()}`,
                base_salary: 15000000,
                salary_type: 'MONTHLY',
                worker_type: 'FULL_TIME',
                dependents: 0,
            });
            alert('✅ Tạo nhân viên thành công!');
        } catch (err: any) {
            alert('❌ Lỗi: ' + err.message);
        }
    };

    const handleBulkAttendance = async () => {
        if (!activeWorkers?.length) {
            alert('Không có nhân viên active');
            return;
        }
        try {
            const result = await bulkAttendance.mutateAsync({
                work_date: today,
                attendances: activeWorkers.slice(0, 5).map((w: any) => ({
                    worker_id: w.id,
                    attendance_type: 'NORMAL',
                    work_hours: 8,
                    ot_normal_hours: 2,
                })),
            });
            alert(`✅ Chấm công: ${result.success_count}/${result.total}`);
        } catch (err: any) {
            alert('❌ Lỗi: ' + err.message);
        }
    };

    const handleCreatePayroll = async () => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        try {
            const result = await createPayroll.mutateAsync({
                period_start: firstDay.toISOString().split('T')[0],
                period_end: lastDay.toISOString().split('T')[0],
                period_type: 'MONTHLY',
            });
            alert(`✅ Tạo bảng lương ${result.code} thành công!`);
            setSelectedPayrollId(result.id);
        } catch (err: any) {
            alert('❌ Lỗi: ' + err.message);
        }
    };

    const handleConfirmPayroll = async () => {
        if (!selectedPayrollId) {
            alert('Chọn bảng lương trước');
            return;
        }
        try {
            await confirmPayroll.mutateAsync(selectedPayrollId);
            alert('✅ Xác nhận thành công!');
        } catch (err: any) {
            alert('❌ Lỗi: ' + err.message);
        }
    };

    const handlePayPayroll = async () => {
        if (!payrollDetail || payrollDetail.remaining_amount <= 0) {
            alert('Không có còn nợ');
            return;
        }
        try {
            await payPayroll.mutateAsync({
                id: selectedPayrollId,
                amount: payrollDetail.remaining_amount,
                payment_method: 'BANK_TRANSFER',
            });
            alert('✅ Đã chi trả lương!');
        } catch (err: any) {
            alert('❌ Lỗi: ' + err.message);
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <h1 className="text-3xl font-bold">🧪 Test Payroll Module</h1>

            {/* Workers */}
            <Card>
                <CardHeader>
                    <CardTitle>👷 Workers ({workersData?.summary?.total_active || 0} active)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={handleCreateWorker} disabled={createWorker.isPending}>
                        {createWorker.isPending ? 'Đang tạo...' : '➕ Tạo NV Test'}
                    </Button>

                    <div className="max-h-40 overflow-auto bg-muted p-2 rounded text-sm">
                        {loadingWorkers ? 'Loading...' : (
                            <pre>{JSON.stringify(workersData?.items?.slice(0, 3), null, 2)}</pre>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Attendances */}
            <Card>
                <CardHeader>
                    <CardTitle>📅 Chấm công hôm nay ({attendancesData?.total || 0})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={handleBulkAttendance} disabled={bulkAttendance.isPending}>
                        {bulkAttendance.isPending ? 'Đang chấm...' : '✅ Chấm công 5 NV đầu'}
                    </Button>

                    <div className="text-sm text-muted-foreground">
                        OT Normal: {attendancesData?.summary?.ot_normal_hours || 0}h |
                        OT Weekend: {attendancesData?.summary?.ot_weekend_hours || 0}h
                    </div>
                </CardContent>
            </Card>

            {/* Payrolls */}
            <Card>
                <CardHeader>
                    <CardTitle>💰 Bảng lương ({payrollsData?.total || 0})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2 flex-wrap">
                        <Button onClick={handleCreatePayroll} disabled={createPayroll.isPending}>
                            {createPayroll.isPending ? 'Đang tạo...' : '📝 Tạo BL tháng này'}
                        </Button>
                        <Button onClick={handleConfirmPayroll} variant="outline" disabled={!selectedPayrollId}>
                            ✅ Xác nhận
                        </Button>
                        <Button onClick={handlePayPayroll} variant="secondary" disabled={!selectedPayrollId}>
                            💳 Chi trả hết
                        </Button>
                    </div>

                    {/* Payroll List */}
                    <div className="grid gap-2">
                        {payrollsData?.items?.map((p: any) => (
                            <div
                                key={p.id}
                                className={`p-3 border rounded cursor-pointer hover:bg-muted ${selectedPayrollId === p.id ? 'border-primary bg-primary/10' : ''}`}
                                onClick={() => setSelectedPayrollId(p.id)}
                            >
                                <div className="font-medium">{p.code}</div>
                                <div className="text-sm text-muted-foreground">
                                    {p.period_start} → {p.period_end} |
                                    Net: {Number(p.total_net).toLocaleString()}đ |
                                    Còn lại: {Number(p.remaining_amount).toLocaleString()}đ |
                                    <span className={`ml-1 ${p.status === 'PAID' ? 'text-green-600' :
                                            p.status === 'CONFIRMED' ? 'text-blue-600' : 'text-yellow-600'
                                        }`}>{p.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Payroll Detail */}
                    {payrollDetail && (
                        <div className="mt-4 p-4 bg-muted rounded">
                            <h4 className="font-medium mb-2">Chi tiết: {payrollDetail.code}</h4>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>Lương cơ bản: {payrollDetail.total_base.toLocaleString()}đ</div>
                                <div>OT: {payrollDetail.total_ot.toLocaleString()}đ</div>
                                <div>Phụ cấp: {payrollDetail.total_allowance.toLocaleString()}đ</div>
                                <div>Khấu trừ: {payrollDetail.total_deduction.toLocaleString()}đ</div>
                                <div className="font-medium">Gross: {payrollDetail.total_gross.toLocaleString()}đ</div>
                                <div className="font-medium text-green-600">Net: {payrollDetail.total_net.toLocaleString()}đ</div>
                            </div>

                            {payrollDetail.items && (
                                <div className="mt-4">
                                    <h5 className="font-medium mb-2">Chi tiết nhân viên:</h5>
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left p-2">Mã</th>
                                                <th className="text-left p-2">Tên</th>
                                                <th className="text-right p-2">Ngày công</th>
                                                <th className="text-right p-2">BHXH</th>
                                                <th className="text-right p-2">Thuế</th>
                                                <th className="text-right p-2">Net</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payrollDetail.items.map((item: any) => (
                                                <tr key={item.id} className="border-b">
                                                    <td className="p-2">{item.worker?.code}</td>
                                                    <td className="p-2">{item.worker?.name}</td>
                                                    <td className="p-2 text-right">{item.work_days}</td>
                                                    <td className="p-2 text-right">{item.insurance_amount.toLocaleString()}</td>
                                                    <td className="p-2 text-right">{item.tax_amount.toLocaleString()}</td>
                                                    <td className="p-2 text-right font-medium">{item.net_amount.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
