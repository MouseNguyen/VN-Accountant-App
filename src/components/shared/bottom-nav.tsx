// src/components/shared/bottom-nav.tsx
// Mobile-first bottom navigation bar

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Home,
    FileText,
    Package,
    Users,
    Warehouse,
    MoreHorizontal,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const mainNavItems = [
    { href: '/dashboard', label: 'Trang chủ', icon: Home },
    { href: '/giao-dich', label: 'Giao dịch', icon: FileText },
    { href: '/san-pham', label: 'Sản phẩm', icon: Package },
    { href: '/doi-tac', label: 'Đối tác', icon: Users },
    { href: '/kho', label: 'Kho', icon: Warehouse },
];

// Grouped navigation items for "More" menu
const moreNavGroups = [
    {
        label: '💰 Bán hàng',
        items: [
            { href: '/ar-invoices', label: 'Hóa đơn bán hàng' },
            { href: '/cong-no/phai-thu', label: 'Công nợ phải thu' },
        ],
    },
    {
        label: '🛒 Mua hàng',
        items: [
            { href: '/hoa-don', label: 'Hóa đơn mua (OCR)' },
            { href: '/cong-no/phai-tra', label: 'Công nợ phải trả' },
        ],
    },
    {
        label: '👷 Nhân sự',
        items: [
            { href: '/nhan-vien', label: 'Nhân viên' },
            { href: '/cham-cong', label: 'Chấm công' },
            { href: '/bang-luong', label: 'Bảng lương' },
        ],
    },
    {
        label: '📊 Báo cáo',
        items: [
            { href: '/bao-cao', label: 'Tổng quan' },
            { href: '/bao-cao/tai-chinh', label: 'Báo cáo tài chính' },
            { href: '/cong-no', label: 'Công nợ' },
        ],
    },
    {
        label: '📋 Thuế',
        items: [
            { href: '/thue', label: 'Tuân thủ thuế' },
            { href: '/thue/to-khai', label: 'Tờ khai VAT' },
            { href: '/thue/tndn', label: 'Thuế TNDN (CIT)' },
            { href: '/thue/tncn', label: 'Thuế TNCN (PIT)' },
            { href: '/thue/xuat-ho-so', label: 'Xuất hồ sơ thuế' },
        ],
    },
    {
        label: '⚙️ Cài đặt',
        items: [
            { href: '/tai-san', label: 'Tài sản cố định' },
            { href: '/tai-san/bang-khau-hao', label: 'Bảng khấu hao' },
            { href: '/cai-dat', label: 'Cài đặt hệ thống' },
        ],
    },
];

export function BottomNav() {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === '/dashboard') {
            return pathname === '/dashboard';
        }
        return pathname.startsWith(href);
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <div className="mx-auto max-w-7xl">
                <div className="flex items-center justify-around">
                    {mainNavItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    'flex flex-col items-center gap-1 px-3 py-3 text-xs transition-colors',
                                    active
                                        ? 'text-primary'
                                        : 'text-muted-foreground hover:text-gray-900'
                                )}
                            >
                                <Icon className={cn('h-5 w-5', active && 'text-primary')} />
                                <span className={cn(active && 'font-medium')}>{item.label}</span>
                            </Link>
                        );
                    })}

                    {/* More Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="flex flex-col items-center gap-1 px-3 py-3 text-xs text-muted-foreground hover:text-gray-900">
                                <MoreHorizontal className="h-5 w-5" />
                                <span>Thêm</span>
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 max-h-80 overflow-y-auto">
                            {moreNavGroups.map((group, groupIndex) => (
                                <div key={group.label}>
                                    {groupIndex > 0 && <div className="h-px bg-border my-1" />}
                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                        {group.label}
                                    </div>
                                    {group.items.map((item) => (
                                        <DropdownMenuItem key={item.href} asChild>
                                            <Link href={item.href} className="cursor-pointer pl-4">
                                                {item.label}
                                            </Link>
                                        </DropdownMenuItem>
                                    ))}
                                </div>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </nav>
    );
}
