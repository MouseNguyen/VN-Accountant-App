// src/app/(dashboard)/cai-dat/phien-dang-nhap/page.tsx
// Trang quản lý phiên đăng nhập (Sessions)

'use client';

import Link from 'next/link';
import { useSessions, useRevokeSession, useRevokeAllSessions } from '@/hooks/use-security';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from 'sonner';
import {
    Smartphone,
    Monitor,
    Globe,
    LogOut,
    Trash2,
    Shield,
    Clock,
    MapPin,
    ArrowLeft,
} from 'lucide-react';

const DEVICE_ICONS: Record<string, React.ReactNode> = {
    WEB: <Monitor className="w-5 h-5" />,
    MOBILE: <Smartphone className="w-5 h-5" />,
    API: <Globe className="w-5 h-5" />,
};

export default function SessionsPage() {
    const { data, isLoading } = useSessions();
    const revokeMutation = useRevokeSession();
    const revokeAllMutation = useRevokeAllSessions();

    const handleRevoke = async (sessionId: string) => {
        if (!confirm('Bạn có chắc muốn đăng xuất phiên này?')) return;

        try {
            await revokeMutation.mutateAsync(sessionId);
            toast.success('Đã đăng xuất phiên!');
        } catch {
            toast.error('Lỗi đăng xuất');
        }
    };

    const handleRevokeAll = async () => {
        if (!confirm('Bạn có chắc muốn đăng xuất tất cả các phiên khác?')) return;

        try {
            const result = await revokeAllMutation.mutateAsync();
            toast.success(result.message || 'Đã đăng xuất!');
        } catch {
            toast.error('Lỗi đăng xuất');
        }
    };

    const sessions = data?.sessions || [];
    const currentSessionId = data?.current_session_id;

    return (
        <div className="min-h-screen bg-gray-950 text-white p-4 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/cai-dat" className="p-2 hover:bg-gray-800 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold">🔐 Phiên đăng nhập</h1>
                        <p className="text-gray-400 text-sm">
                            Quản lý các thiết bị đã đăng nhập
                        </p>
                    </div>
                </div>

                {sessions.length > 1 && (
                    <button
                        onClick={handleRevokeAll}
                        disabled={revokeAllMutation.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium hover:bg-red-600/30 transition-colors disabled:opacity-50"
                    >
                        <Trash2 className="w-4 h-4" />
                        Đăng xuất tất cả
                    </button>
                )}
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-xl p-5 border border-blue-500/30 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Shield className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <div className="font-semibold">Bảo mật tài khoản</div>
                        <div className="text-sm text-gray-400">
                            {sessions.length} phiên đang hoạt động
                        </div>
                    </div>
                </div>
                <p className="text-sm text-gray-400 mt-3">
                    Nếu bạn thấy phiên đăng nhập không quen thuộc, hãy đăng xuất và đổi mật khẩu ngay.
                </p>
            </div>

            {/* Sessions List */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="text-center py-10 text-gray-500">Đang tải...</div>
                ) : !sessions.length ? (
                    <div className="text-center py-10 text-gray-500">Không có phiên nào</div>
                ) : (
                    sessions.map((session) => {
                        const isCurrent = session.id === currentSessionId;

                        return (
                            <div
                                key={session.id}
                                className={`rounded-xl p-4 border transition-colors ${isCurrent
                                    ? 'bg-green-500/10 border-green-500/30'
                                    : 'bg-gray-800/50 border-gray-700/50'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isCurrent ? 'bg-green-500/20' : 'bg-gray-700'
                                            }`}>
                                            {DEVICE_ICONS[session.device_type] || <Monitor className="w-5 h-5" />}
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">
                                                    {session.device_name || session.device_type || 'Thiết bị không xác định'}
                                                </span>
                                                {isCurrent && (
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">
                                                        Phiên hiện tại
                                                    </span>
                                                )}
                                            </div>

                                            {/* User Agent / Browser Info */}
                                            <div className="text-sm text-gray-500 mt-1 max-w-sm truncate">
                                                {parseUserAgent(session.user_agent)}
                                            </div>

                                            {/* Meta info */}
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                {session.ip_address && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {session.ip_address}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDistanceToNow(new Date(session.last_active_at), {
                                                        addSuffix: true,
                                                        locale: vi
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {!isCurrent && (
                                        <button
                                            onClick={() => handleRevoke(session.id)}
                                            disabled={revokeMutation.isPending}
                                            className="p-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                            title="Đăng xuất phiên này"
                                        >
                                            <LogOut className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Session times */}
                                <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center gap-4 text-xs text-gray-500">
                                    <span>
                                        Đăng nhập: {format(new Date(session.created_at), 'dd/MM/yyyy HH:mm')}
                                    </span>
                                    <span>
                                        Hết hạn: {format(new Date(session.expires_at), 'dd/MM/yyyy HH:mm')}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

// Parse user agent to readable string
function parseUserAgent(ua?: string): string {
    if (!ua) return 'Không xác định';

    // Simple parsing
    if (ua.includes('Chrome')) {
        if (ua.includes('Mobile')) return 'Chrome trên điện thoại';
        return 'Chrome trên máy tính';
    }
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Edge')) return 'Microsoft Edge';

    return ua.slice(0, 50) + (ua.length > 50 ? '...' : '');
}
