// src/config/navigation.ts
// Navigation configuration

import {
    Home,
    Wallet,
    ShoppingCart,
    Package,
    Users,
    BarChart3,
    Settings,
    type LucideIcon
} from 'lucide-react';

export interface NavItem {
    href: string;
    label: string;
    icon: LucideIcon;
    description?: string;
}

// ==================== MAIN NAVIGATION (Sidebar) ====================

export const navigationItems: NavItem[] = [
    {
        href: '/dashboard',
        label: 'Tổng quan',
        icon: Home,
        description: 'Xem tình hình thu chi'
    },
    {
        href: '/tien',
        label: 'Thu/Chi',
        icon: Wallet,
        description: 'Quản lý tiền mặt, ngân hàng'
    },
    {
        href: '/ban-hang',
        label: 'Bán hàng',
        icon: ShoppingCart,
        description: 'Ghi nhận bán hàng'
    },
    {
        href: '/mua-hang',
        label: 'Mua hàng',
        icon: Package,
        description: 'Mua vật tư, nhập hàng'
    },
    {
        href: '/nhan-cong',
        label: 'Nhân công',
        icon: Users,
        description: 'Chấm công, trả lương'
    },
    {
        href: '/bao-cao',
        label: 'Báo cáo',
        icon: BarChart3,
        description: 'Xem báo cáo, thống kê'
    },
    {
        href: '/cai-dat',
        label: 'Cài đặt',
        icon: Settings,
        description: 'Cấu hình ứng dụng'
    },
];

// ==================== BOTTOM NAVIGATION (Mobile) ====================

export const bottomNavItems: NavItem[] = [
    { href: '/dashboard', label: 'Tổng quan', icon: Home },
    { href: '/tien', label: 'Thu/Chi', icon: Wallet },
    { href: '/ban-hang', label: 'Bán', icon: ShoppingCart },
    { href: '/nhan-cong', label: 'Nhân công', icon: Users },
    { href: '/cai-dat', label: 'Cài đặt', icon: Settings },
];

// ==================== SETTINGS SUB-NAVIGATION ====================

export const settingsNavItems: NavItem[] = [
    { href: '/cai-dat', label: 'Tổng quan', icon: Settings },
    { href: '/cai-dat/ca-nhan', label: 'Thông tin cá nhân', icon: Users },
    { href: '/cai-dat/nong-trai', label: 'Thông tin doanh nghiệp', icon: Home },
    { href: '/cai-dat/san-pham', label: 'Sản phẩm', icon: Package },
    { href: '/cai-dat/doi-tac', label: 'Đối tác', icon: Users },
];

// ==================== QUICK ACTIONS ====================

export interface QuickAction {
    id: string;
    label: string;
    href: string;
    icon: string;
    color: string;
    bgColor: string;
}

export const quickActions: QuickAction[] = [
    {
        id: 'cash-in',
        label: 'Thu tiền',
        href: '/tien/thu-tien',
        icon: '💰',
        color: 'text-green-600',
        bgColor: 'bg-green-50 hover:bg-green-100',
    },
    {
        id: 'cash-out',
        label: 'Chi tiền',
        href: '/tien/chi-tien',
        icon: '💸',
        color: 'text-red-600',
        bgColor: 'bg-red-50 hover:bg-red-100',
    },
    {
        id: 'sale',
        label: 'Bán hàng',
        href: '/ban-hang/tao-moi',
        icon: '🛒',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50 hover:bg-blue-100',
    },
    {
        id: 'purchase',
        label: 'Mua hàng',
        href: '/mua-hang/tao-moi',
        icon: '📦',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50 hover:bg-orange-100',
    },
];

export default navigationItems;
