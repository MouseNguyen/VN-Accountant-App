// src/app/api/dashboard/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { getDashboardData } from '@/services/dashboard.service';
import { dashboardQuerySchema } from '@/lib/validations/dashboard';
import { ZodError } from 'zod';

export const GET = withAuth(async (req: NextRequest) => {
    try {
        const url = new URL(req.url);
        const query = Object.fromEntries(url.searchParams);

        const validated = dashboardQuerySchema.parse(query);

        const data = await getDashboardData(
            validated.widgets,
            validated.chart_period,
            validated.refresh
        );

        const quickActions = [
            {
                id: 'sale',
                label: 'Bán hàng',
                icon: '🛒',
                href: '/giao-dich/tao?type=INCOME',
                color: 'green',
            },
            {
                id: 'purchase',
                label: 'Mua hàng',
                icon: '📦',
                href: '/giao-dich/tao?type=EXPENSE',
                color: 'blue',
            },
            {
                id: 'receipt',
                label: 'Thu tiền',
                icon: '💵',
                href: '/giao-dich/tao?type=INCOME&quick=receipt',
                color: 'emerald',
            },
            {
                id: 'payment',
                label: 'Chi tiền',
                icon: '💸',
                href: '/giao-dich/tao?type=EXPENSE&quick=payment',
                color: 'red',
            },
            {
                id: 'ocr',
                label: 'Chụp hóa đơn',
                icon: '📸',
                href: '/hoa-don/upload',
                color: 'purple',
            },
        ];

        return NextResponse.json({
            success: true,
            data,
            quick_actions: quickActions,
            last_updated: new Date().toISOString(),
        });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json(
                { success: false, error: 'Dữ liệu không hợp lệ', details: error.issues },
                { status: 400 }
            );
        }
        console.error('Dashboard error:', error);
        return NextResponse.json(
            { success: false, error: 'Lỗi tải dashboard' },
            { status: 500 }
        );
    }
});
