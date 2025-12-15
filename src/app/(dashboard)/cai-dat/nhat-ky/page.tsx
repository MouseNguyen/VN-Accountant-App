// src/app/(dashboard)/cai-dat/nhat-ky/page.tsx
// Trang xem nhật ký hoạt động (Audit Logs)

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuditLogs, useVerifyAuditLogs } from '@/hooks/use-security';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
    ChevronLeft,
    ChevronRight,
    Search,
    Shield,
    ShieldCheck,
    ShieldAlert,
    Filter,
    User,
    Clock,
    FileText,
    LogIn,
    LogOut,
    Plus,
    Edit,
    Trash2,
    Download,
    Upload,
    Lock,
    Unlock,
    Key,
    ArrowLeft,
} from 'lucide-react';
import type { AuditAction } from '@/types/security';

const ACTION_ICONS: Record<AuditAction, React.ReactNode> = {
    CREATE: <Plus className="w-4 h-4 text-green-500" />,
    UPDATE: <Edit className="w-4 h-4 text-blue-500" />,
    DELETE: <Trash2 className="w-4 h-4 text-red-500" />,
    RESTORE: <Upload className="w-4 h-4 text-purple-500" />,
    LOGIN: <LogIn className="w-4 h-4 text-emerald-500" />,
    LOGOUT: <LogOut className="w-4 h-4 text-gray-500" />,
    EXPORT: <Download className="w-4 h-4 text-indigo-500" />,
    IMPORT: <Upload className="w-4 h-4 text-orange-500" />,
    PERIOD_LOCK: <Lock className="w-4 h-4 text-amber-500" />,
    PERIOD_UNLOCK: <Unlock className="w-4 h-4 text-teal-500" />,
    VAT_SUBMIT: <FileText className="w-4 h-4 text-cyan-500" />,
    PASSWORD_CHANGE: <Key className="w-4 h-4 text-pink-500" />,
};

const ACTION_LABELS: Record<AuditAction, string> = {
    CREATE: 'Tạo mới',
    UPDATE: 'Cập nhật',
    DELETE: 'Xóa',
    RESTORE: 'Khôi phục',
    LOGIN: 'Đăng nhập',
    LOGOUT: 'Đăng xuất',
    EXPORT: 'Xuất dữ liệu',
    IMPORT: 'Nhập dữ liệu',
    PERIOD_LOCK: 'Khóa sổ',
    PERIOD_UNLOCK: 'Mở khóa sổ',
    VAT_SUBMIT: 'Nộp tờ khai',
    PASSWORD_CHANGE: 'Đổi mật khẩu',
};

export default function AuditLogsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState<AuditAction | ''>('');

    const { data, isLoading } = useAuditLogs({
        page,
        limit: 20,
        search: search || undefined,
        action: actionFilter || undefined,
    });

    const { data: verifyResult, isLoading: verifying } = useVerifyAuditLogs();

    const totalPages = data ? Math.ceil(data.total / (data.limit || 20)) : 0;

    return (
        <div className="min-h-screen bg-gray-950 text-white p-4 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/cai-dat" className="p-2 hover:bg-gray-800 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">📋 Nhật ký hoạt động</h1>
                        <p className="text-gray-400 text-sm">
                            Theo dõi các thao tác trong hệ thống
                        </p>
                    </div>
                </div>

                {/* Verification Status */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800/50">
                    {verifying ? (
                        <Shield className="w-5 h-5 text-gray-400 animate-pulse" />
                    ) : verifyResult?.is_valid ? (
                        <>
                            <ShieldCheck className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-green-400">Toàn vẹn</span>
                        </>
                    ) : (
                        <>
                            <ShieldAlert className="w-5 h-5 text-red-500" />
                            <span className="text-sm text-red-400">Có vấn đề</span>
                        </>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                </div>

                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <select
                        value={actionFilter}
                        onChange={(e) => { setActionFilter(e.target.value as AuditAction | ''); setPage(1); }}
                        className="pl-10 pr-8 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-sm appearance-none focus:outline-none focus:border-blue-500"
                    >
                        <option value="">Tất cả</option>
                        {Object.entries(ACTION_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Stats */}
            <div className="bg-gray-800/30 rounded-lg p-3 mb-4 flex items-center justify-between text-sm">
                <span className="text-gray-400">
                    Tổng: <span className="text-white font-medium">{data?.total || 0}</span> bản ghi
                </span>
                <span className="text-gray-400">
                    Đã kiểm tra: <span className="text-white font-medium">{verifyResult?.checked_count || 0}</span>
                </span>
            </div>

            {/* Logs List */}
            <div className="space-y-2">
                {isLoading ? (
                    <div className="text-center py-10 text-gray-500">Đang tải...</div>
                ) : !data?.items?.length ? (
                    <div className="text-center py-10 text-gray-500">Không có dữ liệu</div>
                ) : (
                    data.items.map((log) => (
                        <div
                            key={log.id}
                            className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-gray-600 transition-colors"
                        >
                            <div className="flex items-start gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                                    {ACTION_ICONS[log.action as AuditAction] || <FileText className="w-4 h-4" />}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-sm">
                                            {ACTION_LABELS[log.action as AuditAction] || log.action}
                                        </span>
                                        <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                                            {log.entity_type}
                                        </span>
                                    </div>

                                    <p className="text-sm text-gray-300 mb-2">
                                        {log.description || log.entity_name || log.entity_id}
                                    </p>

                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {log.user_name || 'Hệ thống'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: vi })}
                                        </span>
                                        {log.ip_address && (
                                            <span className="text-gray-600">{log.ip_address}</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Changed fields or values */}
                            {log.changed_fields && log.changed_fields.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-700/50">
                                    <span className="text-xs text-gray-500">
                                        Thay đổi: {log.changed_fields.join(', ')}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-lg bg-gray-800 disabled:opacity-50"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <span className="px-4 py-2 text-sm">
                        Trang {page} / {totalPages}
                    </span>

                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-2 rounded-lg bg-gray-800 disabled:opacity-50"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
}
