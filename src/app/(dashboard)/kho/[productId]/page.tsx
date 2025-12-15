// src/app/(dashboard)/kho/[productId]/page.tsx
// Stock Detail Page - Chi tiết tồn kho theo sản phẩm

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    Package,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownRight,
    History,
    AlertTriangle,
    Edit,
    Plus,
    Minus,
} from 'lucide-react';
import { formatMoney } from '@/lib/utils';

interface StockDetail {
    id: string;
    product_id: string;
    product_name: string;
    product_code: string;
    product_unit: string;
    product_category: string;
    quantity: number;
    avg_cost: number;
    total_value: number;
    min_quantity: number | null;
    max_quantity: number | null;
    reorder_point: number | null;
    location_code: string;
    last_movement_at: string | null;
}

interface StockMovement {
    id: string;
    type: 'IN' | 'OUT' | 'ADJUST_IN' | 'ADJUST_OUT' | 'TRANSFER' | 'RETURN';
    code: string;
    date: string;
    quantity: number;
    unit_price: number;
    avg_cost_before: number;
    avg_cost_after: number;
    qty_before: number;
    qty_after: number;
    reason: string | null;
    notes: string | null;
    created_at: string;
}

async function fetchStockDetail(productId: string): Promise<StockDetail | null> {
    const res = await fetch(`/api/stocks?product_id=${productId}&limit=1`);
    if (!res.ok) throw new Error('Failed to fetch stock');
    const data = await res.json();
    return data.data?.items?.[0] || null;
}

async function fetchMovements(productId: string): Promise<StockMovement[]> {
    const res = await fetch(`/api/stock-movements?product_id=${productId}&limit=20`);
    if (!res.ok) throw new Error('Failed to fetch movements');
    const data = await res.json();
    return data.data?.items || [];
}

export default function StockDetailPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.productId as string;

    const { data: stock, isLoading: stockLoading } = useQuery({
        queryKey: ['stock-detail', productId],
        queryFn: () => fetchStockDetail(productId),
    });

    const { data: movements = [], isLoading: movementsLoading } = useQuery({
        queryKey: ['stock-movements', productId],
        queryFn: () => fetchMovements(productId),
    });

    const isLoading = stockLoading || movementsLoading;

    const getMovementTypeInfo = (type: string) => {
        switch (type) {
            case 'IN':
                return { label: 'Nhập kho', color: 'bg-green-100 text-green-800', icon: TrendingUp };
            case 'OUT':
                return { label: 'Xuất kho', color: 'bg-red-100 text-red-800', icon: TrendingDown };
            case 'ADJUST_IN':
                return { label: 'Điều chỉnh tăng', color: 'bg-blue-100 text-blue-800', icon: ArrowUpRight };
            case 'ADJUST_OUT':
                return { label: 'Điều chỉnh giảm', color: 'bg-orange-100 text-orange-800', icon: ArrowDownRight };
            case 'TRANSFER':
                return { label: 'Chuyển kho', color: 'bg-purple-100 text-purple-800', icon: History };
            case 'RETURN':
                return { label: 'Trả hàng', color: 'bg-gray-100 text-gray-800', icon: History };
            default:
                return { label: type, color: 'bg-gray-100 text-gray-800', icon: History };
        }
    };

    const isLowStock = stock && stock.min_quantity && stock.quantity <= stock.min_quantity;
    const isOverStock = stock && stock.max_quantity && stock.quantity >= stock.max_quantity;

    return (
        <div className="min-h-screen pb-24">
            {/* Header */}
            <header className="sticky top-0 z-10 border-b bg-background">
                <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-lg font-semibold">Chi tiết tồn kho</h1>
                        {stock && (
                            <p className="text-sm text-muted-foreground">{stock.product_code}</p>
                        )}
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
                {isLoading ? (
                    <>
                        <Skeleton className="h-48 w-full rounded-xl" />
                        <Skeleton className="h-32 w-full rounded-xl" />
                        <Skeleton className="h-64 w-full rounded-xl" />
                    </>
                ) : !stock ? (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">Không tìm thấy thông tin tồn kho</p>
                            <Button variant="outline" className="mt-4" onClick={() => router.push('/kho')}>
                                Quay lại danh sách
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Product Info Card */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-xl">{stock.product_name}</CardTitle>
                                        <CardDescription>
                                            {stock.product_code} • {stock.product_category}
                                        </CardDescription>
                                    </div>
                                    {isLowStock && (
                                        <Badge variant="destructive" className="flex items-center gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            Tồn kho thấp
                                        </Badge>
                                    )}
                                    {isOverStock && (
                                        <Badge variant="outline" className="flex items-center gap-1 border-orange-500 text-orange-600">
                                            <AlertTriangle className="h-3 w-3" />
                                            Tồn kho cao
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                                        <p className="text-sm text-muted-foreground mb-1">Tồn kho</p>
                                        <p className="text-2xl font-bold text-blue-600">
                                            {stock.quantity.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{stock.product_unit}</p>
                                    </div>
                                    <div className="text-center p-4 bg-green-50 rounded-lg">
                                        <p className="text-sm text-muted-foreground mb-1">Giá vốn TB</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            {formatMoney(stock.avg_cost)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">đ/{stock.product_unit}</p>
                                    </div>
                                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                                        <p className="text-sm text-muted-foreground mb-1">Tổng giá trị</p>
                                        <p className="text-2xl font-bold text-purple-600">
                                            {formatMoney(stock.total_value)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">VNĐ</p>
                                    </div>
                                    <div className="text-center p-4 bg-muted rounded-lg">
                                        <p className="text-sm text-muted-foreground mb-1">Vị trí</p>
                                        <p className="text-2xl font-bold text-gray-600">
                                            {stock.location_code || 'DEFAULT'}
                                        </p>
                                    </div>
                                </div>

                                {/* Stock Limits */}
                                {(stock.min_quantity || stock.max_quantity || stock.reorder_point) && (
                                    <div className="mt-4 pt-4 border-t">
                                        <p className="text-sm font-medium mb-2">Ngưỡng cảnh báo</p>
                                        <div className="flex flex-wrap gap-4 text-sm">
                                            {stock.min_quantity && (
                                                <span className="text-muted-foreground">
                                                    Tồn tối thiểu: <strong>{stock.min_quantity}</strong>
                                                </span>
                                            )}
                                            {stock.max_quantity && (
                                                <span className="text-muted-foreground">
                                                    Tồn tối đa: <strong>{stock.max_quantity}</strong>
                                                </span>
                                            )}
                                            {stock.reorder_point && (
                                                <span className="text-muted-foreground">
                                                    Điểm đặt hàng: <strong>{stock.reorder_point}</strong>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-3 gap-3">
                            <Link href={`/kho/nhap?product=${productId}`}>
                                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                                    <Plus className="h-5 w-5 text-green-500" />
                                    <span>Nhập kho</span>
                                </Button>
                            </Link>
                            <Link href={`/kho/xuat?product=${productId}`}>
                                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                                    <Minus className="h-5 w-5 text-red-500" />
                                    <span>Xuất kho</span>
                                </Button>
                            </Link>
                            <Link href={`/kho/dieu-chinh?product=${productId}`}>
                                <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                                    <Edit className="h-5 w-5 text-blue-500" />
                                    <span>Điều chỉnh</span>
                                </Button>
                            </Link>
                        </div>

                        {/* Movement History */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <History className="h-5 w-5" />
                                    Lịch sử xuất nhập
                                </CardTitle>
                                <CardDescription>20 phiếu gần nhất</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {movements.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">
                                        Chưa có lịch sử xuất nhập
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {movements.map((m) => {
                                            const typeInfo = getMovementTypeInfo(m.type);
                                            const Icon = typeInfo.icon;
                                            const isInward = ['IN', 'ADJUST_IN', 'RETURN'].includes(m.type);

                                            return (
                                                <div
                                                    key={m.id}
                                                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted"
                                                >
                                                    <div className={`p-2 rounded-full ${typeInfo.color}`}>
                                                        <Icon className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium">{m.code}</span>
                                                            <Badge variant="outline" className={`text-xs ${typeInfo.color}`}>
                                                                {typeInfo.label}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-sm text-muted-foreground">
                                                            {new Date(m.date).toLocaleDateString('vi-VN')}
                                                            {m.reason && ` • ${m.reason}`}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`font-medium ${isInward ? 'text-green-600' : 'text-red-600'}`}>
                                                            {isInward ? '+' : '-'}{m.quantity.toLocaleString()}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {m.qty_before} → {m.qty_after}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {movements.length > 0 && (
                                    <div className="mt-4 pt-4 border-t text-center">
                                        <Link href={`/kho?filter=movements&product=${productId}`}>
                                            <Button variant="link">Xem tất cả lịch sử →</Button>
                                        </Link>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}
            </main>
        </div>
    );
}
