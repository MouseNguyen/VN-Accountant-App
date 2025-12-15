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

const moreNavItems = [
    { href: '/nhan-vien', label: 'Nhân công' },
    { href: '/cham-cong', label: 'Chấm công' },
    { href: '/bang-luong', label: 'Bảng lương' },
    { href: '/cong-no', label: 'Công nợ' },
    { href: '/hoa-don', label: 'Hóa đơn' },
    { href: '/bao-cao', label: 'Báo cáo' },
    { href: '/thue', label: '📊 Tuân thủ thuế' },
    { href: '/thue/to-khai', label: 'Tờ khai VAT' },
    { href: '/thue/tndn', label: 'Thuế TNDN (CIT)' },
    { href: '/thue/tncn', label: 'Thuế TNCN (PIT)' },
    { href: '/thue/vat-issues', label: 'Kiểm tra VAT' },
    { href: '/thue/xuat-ho-so', label: 'Xuất hồ sơ thuế' },
    { href: '/cai-dat', label: 'Cài đặt' },
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
                        <DropdownMenuContent align="end" className="w-40">
                            {moreNavItems.map((item) => (
                                <DropdownMenuItem key={item.href} asChild>
                                    <Link href={item.href} className="cursor-pointer">
                                        {item.label}
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </nav>
    );
}
