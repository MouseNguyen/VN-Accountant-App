// src/app/(dashboard)/dashboard/page.tsx
// Trang Dashboard chính - với dữ liệu real-time

'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useDashboard } from '@/hooks/use-dashboard';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar } from '@/components/shared/avatar-selector';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { StockAlertsWidget } from '@/components/dashboard/StockAlertsWidget';
import { formatMoney } from '@/lib/utils';
import {
    LogOut,
    User,
    Building2,
    TrendingUp,
    TrendingDown,
    Wallet,
    FileText,
    Settings,
    RefreshCw,
    AlertCircle,
    Users,
    ArrowUp,
    ArrowDown,
    ChevronRight,
    Receipt,
    Camera,
} from 'lucide-react';
import { useState } from 'react';

export default function DashboardPage() {
    const { user, farm, logout } = useAuth();
    const [chartPeriod, setChartPeriod] = useState<'week' | 'month'>('week');
    const { data: dashboardData, isLoading, refetch, isRefetching } = useDashboard(chartPeriod);

    const handleLogout = async () => {
        await logout();
    };

    const businessIcon = farm?.business_type === 'FARM' ? '🌾' : '☕';
    const businessLabel = farm?.business_type === 'FARM' ? 'Nông trại' : 'Cafe / Bán lẻ';

    const data = dashboardData?.data;
    const quickActions = dashboardData?.quick_actions || [];

    return (
        <div className="min-h-screen pb-24">
            {/* Header */}
            <header className="border-b bg-background sticky top-0 z-10">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <div className="text-2xl">{businessIcon}</div>
                        <div>
                            <h1 className="text-lg font-bold text-foreground">{farm?.name}</h1>
                            <p className="text-xs text-muted-foreground">{businessLabel}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => refetch()}
                            disabled={isRefetching}
                            title="Làm mới"
                        >
                            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
                        </Button>
                        <Link href="/cai-dat">
                            <Button variant="ghost" size="icon" title="Cài đặt">
                                <Settings className="h-5 w-5" />
                            </Button>
                        </Link>
                        <ThemeToggle />
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleLogout}
                            title="Đăng xuất"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                            <LogOut className="h-5 w-5" />
                        </Button>
                        <Avatar avatarUrl={user?.avatar_url} size="sm" />
                    </div>
                </div>
            </header>

            {/* Main content */}
            <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
                {/* Balance Card */}
                {isLoading ? (
                    <Skeleton className="h-32 w-full rounded-xl" />
                ) : data?.cash_balance ? (
                    <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                        <CardContent className="p-6">
                            <div className="text-sm opacity-90 mb-1">Tổng số dư</div>
                            <div className="text-3xl font-bold mb-2">
                                {formatMoney(data.cash_balance.total)}
                            </div>
                            <div className="flex items-center gap-2 text-sm opacity-80">
                                {data.cash_balance.change_today >= 0 ? (
                                    <ArrowUp className="w-4 h-4" />
                                ) : (
                                    <ArrowDown className="w-4 h-4" />
                                )}
                                <span>
                                    {data.cash_balance.change_today >= 0 ? '+' : ''}
                                    {formatMoney(data.cash_balance.change_today)} hôm nay
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ) : null}

                {/* Quick Stats */}
                <div className="grid gap-3 grid-cols-2">
                    {isLoading ? (
                        <>
                            <Skeleton className="h-24 w-full rounded-xl" />
                            <Skeleton className="h-24 w-full rounded-xl" />
                        </>
                    ) : (
                        <>
                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="h-4 w-4 text-green-500" />
                                        <span className="text-xs text-muted-foreground">Thu hôm nay</span>
                                    </div>
                                    <p className="text-xl font-bold text-green-600">
                                        {formatMoney(data?.income_expense_today?.income || 0)}
                                    </p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingDown className="h-4 w-4 text-red-500" />
                                        <span className="text-xs text-muted-foreground">Chi hôm nay</span>
                                    </div>
                                    <p className="text-xl font-bold text-red-600">
                                        {formatMoney(data?.income_expense_today?.expense || 0)}
                                    </p>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>

                {/* Month Summary */}
                {isLoading ? (
                    <Skeleton className="h-20 w-full rounded-xl" />
                ) : data?.income_expense_month ? (
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium">Tháng này</span>
                                <span className="text-xs text-muted-foreground">
                                    {data.income_expense_month.transaction_count} giao dịch
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <div>
                                    <div className="text-xs text-muted-foreground mb-1">Thu</div>
                                    <div className="font-bold text-green-600">
                                        {formatMoney(data.income_expense_month.income)}
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="text-xs text-muted-foreground mb-1">Chi</div>
                                    <div className="font-bold text-red-600">
                                        {formatMoney(data.income_expense_month.expense)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs text-muted-foreground mb-1">Lãi/Lỗ</div>
                                    <div className={`font-bold ${data.income_expense_month.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {data.income_expense_month.net >= 0 ? '+' : ''}
                                        {formatMoney(data.income_expense_month.net)}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : null}

                {/* Quick Actions */}
                <div>
                    <h3 className="mb-3 font-semibold text-foreground">Thao tác nhanh</h3>
                    <div className="grid gap-3 grid-cols-4 sm:grid-cols-8">
                        <Link href="/giao-dich/tao?type=INCOME">
                            <Button variant="outline" className="h-auto w-full flex-col gap-2 py-4">
                                <TrendingUp className="h-6 w-6 text-green-500" />
                                <span className="text-sm">Bán hàng</span>
                            </Button>
                        </Link>
                        <Link href="/giao-dich/tao?type=EXPENSE">
                            <Button variant="outline" className="h-auto w-full flex-col gap-2 py-4">
                                <TrendingDown className="h-6 w-6 text-red-500" />
                                <span className="text-sm">Mua hàng</span>
                            </Button>
                        </Link>
                        <Link href="/kho">
                            <Button variant="outline" className="h-auto w-full flex-col gap-2 py-4">
                                <Wallet className="h-6 w-6 text-emerald-500" />
                                <span className="text-sm">Kho</span>
                            </Button>
                        </Link>
                        <Link href="/hoa-don/upload">
                            <Button variant="outline" className="h-auto w-full flex-col gap-2 py-4">
                                <Camera className="h-6 w-6 text-primary" />
                                <span className="text-sm">Chụp HĐ</span>
                            </Button>
                        </Link>
                        <Link href="/cham-cong">
                            <Button variant="outline" className="h-auto w-full flex-col gap-2 py-4">
                                <User className="h-6 w-6 text-orange-500" />
                                <span className="text-sm">Chấm công</span>
                            </Button>
                        </Link>
                        <Link href="/nhan-vien">
                            <Button variant="outline" className="h-auto w-full flex-col gap-2 py-4">
                                <Users className="h-6 w-6 text-teal-500" />
                                <span className="text-sm">Nhân công</span>
                            </Button>
                        </Link>
                        <Link href="/bao-cao/kho">
                            <Button variant="outline" className="h-auto w-full flex-col gap-2 py-4">
                                <FileText className="h-6 w-6 text-amber-500" />
                                <span className="text-sm">BC Kho</span>
                            </Button>
                        </Link>
                        <Link href="/bao-cao">
                            <Button variant="outline" className="h-auto w-full flex-col gap-2 py-4">
                                <Receipt className="h-6 w-6 text-blue-500" />
                                <span className="text-sm">Báo cáo</span>
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Payables */}
                {data?.payables && (data.payables.receivable.total > 0 || data.payables.payable.total > 0) && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Công nợ</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {data.payables.receivable.total > 0 && (
                                <Link href="/doi-tac?type=CUSTOMER" className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                    <div>
                                        <div className="text-sm text-muted-foreground">Phải thu (Khách nợ)</div>
                                        <div className="font-bold text-green-600">{formatMoney(data.payables.receivable.total)}</div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                </Link>
                            )}
                            {data.payables.payable.total > 0 && (
                                <Link href="/doi-tac?type=VENDOR" className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                                    <div>
                                        <div className="text-sm text-muted-foreground">Phải trả (Nợ NCC)</div>
                                        <div className="font-bold text-red-600">{formatMoney(data.payables.payable.total)}</div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                </Link>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Stock Alerts */}
                <StockAlertsWidget />

                {/* Workers */}
                {data?.workers && data.workers.total_active > 0 && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Users className="w-5 h-5" />
                                Nhân công
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex justify-between text-sm">
                                <div>
                                    <div className="text-muted-foreground">Đang làm</div>
                                    <div className="font-bold text-lg">{data.workers.total_active}</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-muted-foreground">Hôm nay</div>
                                    <div className="font-bold text-lg">{data.workers.total_working_today}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-muted-foreground">Lương chưa trả</div>
                                    <div className="font-bold text-lg text-orange-600">
                                        {formatMoney(data.workers.pending_payroll)}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Alerts */}
                {data?.alerts && data.alerts.total_count > 0 && (
                    <Card className="border-orange-500">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                                <AlertCircle className="w-5 h-5" />
                                Cảnh báo ({data.alerts.total_count})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {data.alerts.items.slice(0, 5).map((alert, idx) => (
                                <div
                                    key={idx}
                                    className={`p-3 rounded-lg text-sm ${alert.severity === 'error' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                                        }`}
                                >
                                    <div className="font-medium">{alert.title}</div>
                                    <div className="text-xs">{alert.message}</div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {/* Top Products */}
                {data?.top_products && data.top_products.items.length > 0 && (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base">Sản phẩm bán chạy</CardTitle>
                            <CardDescription>7 ngày qua</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {data.top_products.items.map((product, idx) => (
                                    <div key={product.product_id} className="flex items-center justify-between py-2 border-b last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{product.name}</div>
                                                <div className="text-xs text-muted-foreground">Bán: {product.quantity_sold}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-medium text-sm">{formatMoney(product.revenue)}</div>
                                            <div className="text-xs text-green-600">+{formatMoney(product.profit)}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
