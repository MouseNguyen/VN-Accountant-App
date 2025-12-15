// src/lib/constants/index.ts
// Export tất cả constants

export * from './regex';

// ==========================================
// BUSINESS TYPES
// ==========================================
export const BUSINESS_TYPES = {
    FARM: {
        value: 'FARM',
        label: 'Nông trại',
        icon: '🌾',
        description: 'Trồng trọt, chăn nuôi, mua bán nông sản',
    },
    RETAIL_FNB: {
        value: 'RETAIL_FNB',
        label: 'Cafe / Bán lẻ',
        icon: '☕',
        description: 'Quán cafe, nhà hàng, cửa hàng',
    },
} as const;

export type BusinessTypeValue = keyof typeof BUSINESS_TYPES;

// ==========================================
// USER ROLES
// ==========================================
export const USER_ROLES = {
    OWNER: {
        value: 'OWNER',
        label: 'Chủ sở hữu',
        description: 'Toàn quyền quản lý',
    },
    ACCOUNTANT: {
        value: 'ACCOUNTANT',
        label: 'Kế toán',
        description: 'Xem và tạo giao dịch',
    },
    STAFF: {
        value: 'STAFF',
        label: 'Nhân viên',
        description: 'Chỉ xem và tạo giao dịch cơ bản',
    },
} as const;

export type UserRoleValue = keyof typeof USER_ROLES;

// ==========================================
// AVATAR OPTIONS
// ==========================================
export const AVATAR_OPTIONS = [
    { id: 'farmer', icon: '👨‍🌾', label: 'Nông dân' },
    { id: 'chef', icon: '👨‍🍳', label: 'Đầu bếp' },
    { id: 'business', icon: '👔', label: 'Doanh nhân' },
    { id: 'woman', icon: '👩', label: 'Phụ nữ' },
    { id: 'man', icon: '👨', label: 'Nam giới' },
    { id: 'elder', icon: '👴', label: 'Người cao tuổi' },
    { id: 'elder_woman', icon: '👵', label: 'Bà' },
    { id: 'worker', icon: '👷', label: 'Công nhân' },
    { id: 'cow', icon: '🐄', label: 'Bò' },
    { id: 'pig', icon: '🐷', label: 'Heo' },
    { id: 'chicken', icon: '🐔', label: 'Gà' },
    { id: 'rice', icon: '🌾', label: 'Lúa' },
    { id: 'coffee', icon: '☕', label: 'Cà phê' },
    { id: 'tree', icon: '🌳', label: 'Cây' },
    { id: 'sun', icon: '🌞', label: 'Mặt trời' },
    { id: 'star', icon: '⭐', label: 'Ngôi sao' },
] as const;

export type AvatarOption = (typeof AVATAR_OPTIONS)[number];
export type AvatarId = AvatarOption['id'];

/**
 * Lấy avatar by ID
 */
export function getAvatarById(id: string): AvatarOption | undefined {
    return AVATAR_OPTIONS.find((a) => a.id === id);
}

/**
 * Lấy icon avatar by ID
 */
export function getAvatarIcon(id?: string | null): string {
    if (!id) return '👤';
    const avatar = AVATAR_OPTIONS.find((a) => a.id === id);
    return avatar?.icon || '👤';
}

// ==========================================
// COMMON UNITS (theo business type)
// ==========================================
export const COMMON_UNITS = {
    FARM: ['kg', 'tấn', 'con', 'bó', 'cây', 'bao', 'thùng', 'lít', 'chai', 'quả', 'tá', 'vỉ', 'chục', 'hộp'],
    RETAIL_FNB: ['ly', 'phần', 'đĩa', 'chai', 'lon', 'gói', 'hộp', 'kg', 'lít', 'quả', 'tá', 'chục'],
} as const;

// All available units (for form selects)
export const ALL_UNITS = [
    { value: 'kg', label: 'kg (kilogram)' },
    { value: 'g', label: 'g (gram)' },
    { value: 'tấn', label: 'Tấn' },
    { value: 'lít', label: 'Lít' },
    { value: 'ml', label: 'ml (millilít)' },
    { value: 'con', label: 'Con' },
    { value: 'quả', label: 'Quả' },
    { value: 'tá', label: 'Tá (12 cái)' },
    { value: 'chục', label: 'Chục (10 cái)' },
    { value: 'vỉ', label: 'Vỉ (30 trứng)' },
    { value: 'hộp', label: 'Hộp' },
    { value: 'chai', label: 'Chai' },
    { value: 'lon', label: 'Lon' },
    { value: 'gói', label: 'Gói' },
    { value: 'bao', label: 'Bao' },
    { value: 'bó', label: 'Bó' },
    { value: 'cây', label: 'Cây' },
    { value: 'thùng', label: 'Thùng' },
    { value: 'ly', label: 'Ly' },
    { value: 'phần', label: 'Phần' },
    { value: 'đĩa', label: 'Đĩa' },
    { value: 'cái', label: 'Cái' },
    { value: 'chiếc', label: 'Chiếc' },
] as const;

// ==========================================
// QUICK AMOUNTS (Số tiền nhanh)
// ==========================================
export const QUICK_AMOUNTS = [
    { value: 50000, label: '50K' },
    { value: 100000, label: '100K' },
    { value: 200000, label: '200K' },
    { value: 500000, label: '500K' },
    { value: 1000000, label: '1M' },
    { value: 2000000, label: '2M' },
    { value: 5000000, label: '5M' },
    { value: 10000000, label: '10M' },
] as const;

// ==========================================
// PAGINATION
// ==========================================
export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
} as const;

// ==========================================
// DATE & TIME
// ==========================================
export const TIMEZONE = 'Asia/Ho_Chi_Minh';
export const DATE_FORMAT = 'dd/MM/yyyy';
export const DATETIME_FORMAT = 'dd/MM/yyyy HH:mm';
