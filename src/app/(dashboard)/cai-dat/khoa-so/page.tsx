// src/app/(dashboard)/cai-dat/khoa-so/page.tsx
// Trang quản lý khóa sổ kế toán (Period Lock)

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    usePeriodLocks,
    usePeriodLockStatus,
    useLockPeriod,
    useUnlockPeriod
} from '@/hooks/use-security';
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import {
    Lock,
    Unlock,
    Calendar,
    Shield,
    AlertTriangle,
    CheckCircle,
    Plus,
    X,
    ArrowLeft,
} from 'lucide-react';
import type { LockStatus } from '@/types/security';

const STATUS_CONFIG: Record<LockStatus, { label: string; color: string; icon: React.ReactNode }> = {
    OPEN: { label: 'Đang mở', color: 'text-green-500', icon: <Unlock className="w-4 h-4" /> },
    LOCKED: { label: 'Đã khóa', color: 'text-amber-500', icon: <Lock className="w-4 h-4" /> },
    PERMANENTLY_LOCKED: { label: 'Khóa vĩnh viễn', color: 'text-red-500', icon: <Shield className="w-4 h-4" /> },
};

export default function PeriodLockPage() {
    const [showLockModal, setShowLockModal] = useState(false);
    const [unlockingId, setUnlockingId] = useState<string | null>(null);
    const [unlockReason, setUnlockReason] = useState('');

    const { data: locks, isLoading } = usePeriodLocks();
    const { data: status } = usePeriodLockStatus();
    const lockMutation = useLockPeriod();
    const unlockMutation = useUnlockPeriod();

    const handleUnlock = async () => {
        if (!unlockingId || !unlockReason.trim()) {
            toast.error('Vui lòng nhập lý do mở khóa');
            return;
        }

        try {
            await unlockMutation.mutateAsync({ lockId: unlockingId, reason: unlockReason });
            toast.success('Đã mở khóa sổ!');
            setUnlockingId(null);
            setUnlockReason('');
        } catch (err) {
            toast.error((err as Error).message || 'Lỗi mở khóa');
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white p-4 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/cai-dat" className="p-2 hover:bg-gray-800 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">🔒 Khóa sổ kế toán</h1>
                        <p className="text-gray-400 text-sm">
                            Quản lý khóa sổ theo kỳ
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => setShowLockModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg text-sm font-medium hover:from-blue-500 hover:to-blue-400 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    Khóa sổ mới
                </button>
            </div>

            {/* Current Status */}
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 rounded-xl p-5 border border-gray-700/50 mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Lock className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                        <div className="text-sm text-gray-400">Trạng thái hiện tại</div>
                        <div className="text-lg font-semibold">
                            {status?.current_lock_date ? (
                                <>Khóa đến: {format(new Date(status.current_lock_date), 'dd/MM/yyyy')}</>
                            ) : (
                                'Chưa khóa sổ'
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-gray-800/50 rounded-lg">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-400">
                        Có thể chỉnh sửa từ ngày:{' '}
                        <span className="text-white font-medium">
                            {status?.earliest_editable_date
                                ? format(new Date(status.earliest_editable_date), 'dd/MM/yyyy')
                                : '01/01/2000'
                            }
                        </span>
                    </span>
                </div>
            </div>

            {/* Warning */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="text-amber-200 font-medium mb-1">Lưu ý quan trọng</p>
                        <p className="text-gray-400">
                            Sau khi khóa sổ, bạn sẽ không thể tạo, sửa, xóa giao dịch trong khoảng thời gian đã khóa.
                            Việc mở khóa cần có lý do và được ghi nhật ký.
                        </p>
                    </div>
                </div>
            </div>

            {/* Locks List */}
            <h2 className="text-lg font-semibold mb-3">Lịch sử khóa sổ</h2>

            <div className="space-y-3">
                {isLoading ? (
                    <div className="text-center py-10 text-gray-500">Đang tải...</div>
                ) : !locks?.length ? (
                    <div className="text-center py-10 text-gray-500">
                        Chưa có khóa sổ nào
                    </div>
                ) : (
                    locks.map((lock) => (
                        <div
                            key={lock.id}
                            className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50"
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${lock.status === 'LOCKED' ? 'bg-amber-500/20' :
                                        lock.status === 'PERMANENTLY_LOCKED' ? 'bg-red-500/20' :
                                            'bg-green-500/20'
                                        }`}>
                                        {STATUS_CONFIG[lock.status].icon}
                                    </div>
                                    <div>
                                        <div className="font-medium">Kỳ {lock.period_code}</div>
                                        <div className="text-sm text-gray-400">
                                            {format(new Date(lock.from_date), 'dd/MM/yyyy')} - {format(new Date(lock.to_date), 'dd/MM/yyyy')}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className={`text-sm ${STATUS_CONFIG[lock.status].color}`}>
                                        {STATUS_CONFIG[lock.status].label}
                                    </span>

                                    {lock.status === 'LOCKED' && (
                                        <button
                                            onClick={() => setUnlockingId(lock.id)}
                                            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
                                            title="Mở khóa"
                                        >
                                            <Unlock className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Lock details */}
                            <div className="mt-3 pt-3 border-t border-gray-700/50 text-sm text-gray-500">
                                <div className="flex items-center gap-4">
                                    <span>Khóa bởi: {lock.locked_by_name || 'N/A'}</span>
                                    {lock.locked_at && (
                                        <span>Lúc: {format(new Date(lock.locked_at), 'dd/MM/yyyy HH:mm')}</span>
                                    )}
                                </div>
                                {lock.lock_reason && (
                                    <div className="mt-1">Lý do: {lock.lock_reason}</div>
                                )}
                                {lock.unlocked_at && (
                                    <div className="mt-2 p-2 bg-green-500/10 rounded text-green-400">
                                        ✅ Đã mở khóa bởi {lock.unlocked_by_name} lúc {format(new Date(lock.unlocked_at), 'dd/MM/yyyy HH:mm')}
                                        {lock.unlock_reason && <div>Lý do: {lock.unlock_reason}</div>}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Lock Modal */}
            {showLockModal && (
                <LockModal
                    onClose={() => setShowLockModal(false)}
                    onLock={async (data) => {
                        try {
                            await lockMutation.mutateAsync(data);
                            toast.success('Đã khóa sổ thành công!');
                            setShowLockModal(false);
                        } catch (err) {
                            toast.error((err as Error).message || 'Lỗi khóa sổ');
                        }
                    }}
                    isLoading={lockMutation.isPending}
                />
            )}

            {/* Unlock Modal */}
            {unlockingId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Mở khóa sổ</h3>

                        <label className="block text-sm text-gray-400 mb-2">
                            Lý do mở khóa <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={unlockReason}
                            onChange={(e) => setUnlockReason(e.target.value)}
                            placeholder="Nhập lý do mở khóa..."
                            className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-sm resize-none focus:outline-none focus:border-blue-500"
                            rows={3}
                        />

                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => { setUnlockingId(null); setUnlockReason(''); }}
                                className="flex-1 py-3 bg-gray-700 rounded-lg font-medium"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleUnlock}
                                disabled={unlockMutation.isPending}
                                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg font-medium disabled:opacity-50"
                            >
                                {unlockMutation.isPending ? 'Đang xử lý...' : 'Xác nhận'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Lock Modal Component
function LockModal({
    onClose,
    onLock,
    isLoading
}: {
    onClose: () => void;
    onLock: (data: any) => void;
    isLoading: boolean;
}) {
    const [periodType, setPeriodType] = useState<'MONTH' | 'QUARTER'>('MONTH');
    const [selectedDate, setSelectedDate] = useState(() => {
        const now = new Date();
        now.setMonth(now.getMonth() - 1);
        return format(now, 'yyyy-MM');
    });
    const [reason, setReason] = useState('');

    const handleSubmit = () => {
        const date = new Date(selectedDate + '-01');
        let fromDate: Date, toDate: Date, periodCode: string;

        if (periodType === 'MONTH') {
            fromDate = startOfMonth(date);
            toDate = endOfMonth(date);
            periodCode = format(date, 'yyyy-MM');
        } else {
            fromDate = startOfQuarter(date);
            toDate = endOfQuarter(date);
            const Q = Math.ceil((date.getMonth() + 1) / 3);
            periodCode = `${date.getFullYear()}-Q${Q}`;
        }

        onLock({
            period_type: periodType,
            period_code: periodCode,
            from_date: format(fromDate, 'yyyy-MM-dd'),
            to_date: format(toDate, 'yyyy-MM-dd'),
            reason: reason || undefined,
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Khóa sổ kế toán</h3>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Period Type */}
                <label className="block text-sm text-gray-400 mb-2">Loại kỳ</label>
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setPeriodType('MONTH')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${periodType === 'MONTH'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300'
                            }`}
                    >
                        Tháng
                    </button>
                    <button
                        onClick={() => setPeriodType('QUARTER')}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${periodType === 'QUARTER'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300'
                            }`}
                    >
                        Quý
                    </button>
                </div>

                {/* Period Select */}
                <label className="block text-sm text-gray-400 mb-2">Kỳ khóa</label>
                <input
                    type="month"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-sm mb-4 focus:outline-none focus:border-blue-500"
                />

                {/* Reason */}
                <label className="block text-sm text-gray-400 mb-2">Lý do (tùy chọn)</label>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Nhập lý do khóa sổ..."
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-sm resize-none focus:outline-none focus:border-blue-500"
                    rows={2}
                />

                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-gray-700 rounded-lg font-medium"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="flex-1 py-3 bg-gradient-to-r from-amber-600 to-amber-500 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Lock className="w-4 h-4" />
                        {isLoading ? 'Đang xử lý...' : 'Khóa sổ'}
                    </button>
                </div>
            </div>
        </div>
    );
}
