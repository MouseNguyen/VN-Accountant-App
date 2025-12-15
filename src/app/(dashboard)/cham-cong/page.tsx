'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useActiveWorkers } from '@/hooks/use-workers';
import { useAttendances, useBulkCreateAttendance } from '@/hooks/use-attendances';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
    CalendarDays, Clock, Save, ChevronLeft, ChevronRight, Users,
    Sun, Moon, AlertCircle, ArrowLeft
} from 'lucide-react';

const ATTENDANCE_TYPES = [
    { value: 'NORMAL', label: 'Đi làm', color: 'bg-green-500' },
    { value: 'OVERTIME', label: 'Tăng ca', color: 'bg-blue-500' },
    { value: 'HALF_DAY', label: 'Nửa ngày', color: 'bg-yellow-500' },
    { value: 'ABSENT', label: 'Vắng', color: 'bg-red-500' },
    { value: 'SICK_LEAVE', label: 'Nghỉ ốm', color: 'bg-orange-500' },
    { value: 'ANNUAL_LEAVE', label: 'Nghỉ phép', color: 'bg-primary' },
    { value: 'HOLIDAY', label: 'Nghỉ lễ', color: 'bg-pink-500' },
];

interface AttendanceRow {
    worker_id: string;
    checked: boolean;
    attendance_type: string;
    work_hours: number;
    ot_normal_hours: number;
    ot_weekend_hours: number;
    ot_holiday_hours: number;
    night_hours: number;
    note: string;
}

export default function AttendancePage() {
    const { toast } = useToast();
    const today = new Date();
    const [selectedDate, setSelectedDate] = useState(today.toISOString().split('T')[0]);

    const { data: workers, isLoading: loadingWorkers } = useActiveWorkers();
    const { data: attendances, isLoading: loadingAttendances } = useAttendances({
        date_from: selectedDate,
        date_to: selectedDate,
        limit: 100,
    });
    const bulkCreate = useBulkCreateAttendance();

    // Build attendance rows from workers + existing attendances
    const [rows, setRows] = useState<Map<string, AttendanceRow>>(new Map());

    // Initialize rows when data loads - use useEffect instead of useMemo
    useEffect(() => {
        if (!workers || workers.length === 0) return;

        const existingMap = new Map(
            attendances?.items?.map((a: any) => [a.worker_id, a]) || []
        );

        const newRows = new Map<string, AttendanceRow>();
        workers.forEach((w: any) => {
            const existing = existingMap.get(w.id);
            newRows.set(w.id, {
                worker_id: w.id,
                checked: !!existing,
                attendance_type: existing?.attendance_type || 'NORMAL',
                work_hours: existing?.work_hours ?? 8,
                ot_normal_hours: existing?.ot_normal_hours ?? 0,
                ot_weekend_hours: existing?.ot_weekend_hours ?? 0,
                ot_holiday_hours: existing?.ot_holiday_hours ?? 0,
                night_hours: existing?.night_hours ?? 0,
                note: existing?.note || '',
            });
        });
        setRows(newRows);
    }, [workers, attendances, selectedDate]);

    const updateRow = (workerId: string, field: keyof AttendanceRow, value: any) => {
        setRows(prev => {
            const newMap = new Map(prev);
            const row = newMap.get(workerId);
            if (row) {
                newMap.set(workerId, { ...row, [field]: value });
            }
            return newMap;
        });
    };

    const toggleAll = (checked: boolean) => {
        setRows(prev => {
            const newMap = new Map(prev);
            newMap.forEach((row, id) => {
                newMap.set(id, { ...row, checked });
            });
            return newMap;
        });
    };

    const handleSave = async () => {
        const checkedRows = Array.from(rows.values()).filter(r => r.checked);
        if (!checkedRows.length) {
            toast({ title: 'Lỗi', description: 'Chọn ít nhất 1 nhân viên', variant: 'destructive' });
            return;
        }

        try {
            const result = await bulkCreate.mutateAsync({
                work_date: selectedDate,
                attendances: checkedRows.map(r => ({
                    worker_id: r.worker_id,
                    attendance_type: r.attendance_type as any,
                    work_hours: r.work_hours,
                    ot_normal_hours: r.ot_normal_hours,
                    ot_weekend_hours: r.ot_weekend_hours,
                    ot_holiday_hours: r.ot_holiday_hours,
                    night_hours: r.night_hours,
                    note: r.note || undefined,
                })),
            });
            toast({
                title: 'Thành công',
                description: `Đã chấm công ${result.success_count}/${result.total} nhân viên`
            });
        } catch (err: any) {
            toast({ title: 'Lỗi', description: err.message, variant: 'destructive' });
        }
    };

    const changeDate = (days: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const isWeekend = new Date(selectedDate).getDay() % 6 === 0;
    const checkedCount = Array.from(rows.values()).filter(r => r.checked).length;
    const totalWorkers = workers?.length || 0;

    return (
        <div className="container mx-auto p-4 md:p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard" className="p-2 hover:bg-muted rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold">Chấm công</h1>
                        <p className="text-muted-foreground">Ghi nhận giờ làm việc hàng ngày</p>
                    </div>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={bulkCreate.isPending || checkedCount === 0}
                    className="gap-2"
                >
                    <Save className="h-4 w-4" />
                    {bulkCreate.isPending ? 'Đang lưu...' : `Lưu chấm công (${checkedCount})`}
                </Button>
            </div>

            {/* Date Selector */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-muted-foreground" />
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-auto"
                            />
                            {isWeekend && (
                                <Badge variant="secondary" className="ml-2">Cuối tuần</Badge>
                            )}
                        </div>
                        <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDate(today.toISOString().split('T')[0])}
                        >
                            Hôm nay
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <Users className="h-8 w-8 text-primary" />
                        <div>
                            <div className="text-2xl font-bold">{checkedCount}/{totalWorkers}</div>
                            <div className="text-sm text-muted-foreground">Đã chọn</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <Clock className="h-8 w-8 text-blue-500" />
                        <div>
                            <div className="text-2xl font-bold">
                                {Array.from(rows.values()).filter(r => r.checked).reduce((sum, r) => sum + r.work_hours, 0)}h
                            </div>
                            <div className="text-sm text-muted-foreground">Giờ làm</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <Sun className="h-8 w-8 text-yellow-500" />
                        <div>
                            <div className="text-2xl font-bold">
                                {Array.from(rows.values()).filter(r => r.checked).reduce((sum, r) => sum + r.ot_normal_hours, 0)}h
                            </div>
                            <div className="text-sm text-muted-foreground">OT thường</div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <Moon className="h-8 w-8 text-emerald-500" />
                        <div>
                            <div className="text-2xl font-bold">
                                {Array.from(rows.values()).filter(r => r.checked).reduce((sum, r) => sum + r.night_hours, 0)}h
                            </div>
                            <div className="text-sm text-muted-foreground">Giờ đêm</div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Attendance Table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle>Danh sách nhân viên</CardTitle>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                checked={checkedCount === totalWorkers && totalWorkers > 0}
                                onCheckedChange={(v) => toggleAll(!!v)}
                            />
                            <span className="text-sm text-muted-foreground">Chọn tất cả</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loadingWorkers ? (
                        <div className="p-8 text-center text-muted-foreground">Đang tải...</div>
                    ) : !workers?.length ? (
                        <div className="p-8 text-center text-muted-foreground">
                            Chưa có nhân viên. Thêm nhân viên trước khi chấm công.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead>Nhân viên</TableHead>
                                        <TableHead className="w-[140px]">Loại</TableHead>
                                        <TableHead className="w-[80px] text-center">Giờ làm</TableHead>
                                        <TableHead className="w-[80px] text-center">OT thường</TableHead>
                                        <TableHead className="w-[80px] text-center hidden md:table-cell">OT T7/CN</TableHead>
                                        <TableHead className="w-[80px] text-center hidden md:table-cell">OT Lễ</TableHead>
                                        <TableHead className="w-[80px] text-center">Đêm</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {workers.map((worker: any) => {
                                        const row = rows.get(worker.id);
                                        if (!row) return null;

                                        return (
                                            <TableRow key={worker.id} className={row.checked ? 'bg-primary/5' : ''}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={row.checked}
                                                        onCheckedChange={(v) => updateRow(worker.id, 'checked', !!v)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{worker.name}</div>
                                                    <div className="text-sm text-muted-foreground">{worker.code}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Select
                                                        value={row.attendance_type}
                                                        onValueChange={(v) => updateRow(worker.id, 'attendance_type', v)}
                                                        disabled={!row.checked}
                                                    >
                                                        <SelectTrigger className="h-8">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {ATTENDANCE_TYPES.map(t => (
                                                                <SelectItem key={t.value} value={t.value}>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className={`w-2 h-2 rounded-full ${t.color}`} />
                                                                        {t.label}
                                                                    </div>
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="24"
                                                        step="0.5"
                                                        value={row.work_hours}
                                                        onChange={(e) => updateRow(worker.id, 'work_hours', parseFloat(e.target.value) || 0)}
                                                        disabled={!row.checked}
                                                        className="h-8 text-center"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="12"
                                                        step="0.5"
                                                        value={row.ot_normal_hours}
                                                        onChange={(e) => updateRow(worker.id, 'ot_normal_hours', parseFloat(e.target.value) || 0)}
                                                        disabled={!row.checked}
                                                        className="h-8 text-center"
                                                    />
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="12"
                                                        step="0.5"
                                                        value={row.ot_weekend_hours}
                                                        onChange={(e) => updateRow(worker.id, 'ot_weekend_hours', parseFloat(e.target.value) || 0)}
                                                        disabled={!row.checked}
                                                        className="h-8 text-center"
                                                    />
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="12"
                                                        step="0.5"
                                                        value={row.ot_holiday_hours}
                                                        onChange={(e) => updateRow(worker.id, 'ot_holiday_hours', parseFloat(e.target.value) || 0)}
                                                        disabled={!row.checked}
                                                        className="h-8 text-center"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max="8"
                                                        step="0.5"
                                                        value={row.night_hours}
                                                        onChange={(e) => updateRow(worker.id, 'night_hours', parseFloat(e.target.value) || 0)}
                                                        disabled={!row.checked}
                                                        className="h-8 text-center"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
