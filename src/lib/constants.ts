// src/lib/constants.ts
// Application constants và enums

// ==================== TRANSACTION TYPES ====================

export const TRANSACTION_TYPES = {
    CASH_IN: {
        value: 'CASH_IN',
        label: 'Thu tiền',
        prefix: 'PT',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        icon: '💰'
    },
    CASH_OUT: {
        value: 'CASH_OUT',
        label: 'Chi tiền',
        prefix: 'PC',
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        icon: '💸'
    },
    SALE: {
        value: 'SALE',
        label: 'Bán hàng',
        prefix: 'BH',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        icon: '🛒'
    },
    PURCHASE: {
        value: 'PURCHASE',
        label: 'Mua hàng',
        prefix: 'MH',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        icon: '📦'
    },
    TRANSFER: {
        value: 'TRANSFER',
        label: 'Chuyển khoản',
        prefix: 'CK',
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        icon: '🔄'
    },
} as const;

export type TransactionTypeKey = keyof typeof TRANSACTION_TYPES;

// ==================== PAYMENT METHODS ====================

export const PAYMENT_METHODS = {
    CASH: {
        value: 'CASH',
        label: 'Tiền mặt',
        icon: '💵'
    },
    BANK_TRANSFER: {
        value: 'BANK_TRANSFER',
        label: 'Chuyển khoản',
        icon: '🏦'
    },
    CREDIT: {
        value: 'CREDIT',
        label: 'Ghi nợ',
        icon: '📝'
    },
} as const;

export type PaymentMethodKey = keyof typeof PAYMENT_METHODS;

// ==================== PAYMENT STATUS ====================

export const PAYMENT_STATUS = {
    PAID: {
        value: 'PAID',
        label: 'Đã thanh toán',
        color: 'text-green-600',
        bgColor: 'bg-green-100'
    },
    UNPAID: {
        value: 'UNPAID',
        label: 'Chưa thanh toán',
        color: 'text-red-600',
        bgColor: 'bg-red-100'
    },
    PARTIAL: {
        value: 'PARTIAL',
        label: 'Thanh toán một phần',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100'
    },
} as const;

// ==================== BUSINESS TYPES ====================

export const BUSINESS_TYPES = {
    FARM: {
        value: 'FARM',
        label: 'Nông trại',
        icon: '🌾',
        description: 'Trồng trọt, chăn nuôi, thủy sản'
    },
    RETAIL_FNB: {
        value: 'RETAIL_FNB',
        label: 'Cafe / Bán lẻ',
        icon: '☕',
        description: 'Cafe, nhà hàng, cửa hàng nhỏ'
    },
} as const;

export type BusinessTypeKey = keyof typeof BUSINESS_TYPES;

// ==================== WORK TYPES ====================

export const WORK_TYPES = {
    FULL_DAY: {
        value: 'FULL_DAY',
        label: 'Cả ngày',
        multiplier: 1.0
    },
    HALF_DAY: {
        value: 'HALF_DAY',
        label: 'Nửa ngày',
        multiplier: 0.5
    },
    OVERTIME: {
        value: 'OVERTIME',
        label: 'Tăng ca',
        multiplier: 1.5
    },
    HOURLY: {
        value: 'HOURLY',
        label: 'Theo giờ',
        multiplier: null  // Tính theo giờ thực tế
    },
} as const;

// ==================== PRODUCT CATEGORIES ====================

export const PRODUCT_CATEGORIES = {
    NONG_SAN: {
        value: 'NONG_SAN',
        label: 'Nông sản',
        icon: '🥬',
        businessType: 'FARM'
    },
    VAT_TU: {
        value: 'VAT_TU',
        label: 'Vật tư',
        icon: '🧪',
        businessType: 'FARM'
    },
    MENU: {
        value: 'MENU',
        label: 'Menu',
        icon: '☕',
        businessType: 'RETAIL_FNB'
    },
    NGUYEN_LIEU: {
        value: 'NGUYEN_LIEU',
        label: 'Nguyên liệu',
        icon: '📦',
        businessType: 'RETAIL_FNB'
    },
    OTHER: {
        value: 'OTHER',
        label: 'Khác',
        icon: '📋',
        businessType: null
    },
} as const;

// ==================== TAX THRESHOLDS ====================

export const TAX_THRESHOLDS = {
    // PIT - Thuế TNCN
    PIT_CASUAL_LIMIT: 2000000,        // Ngưỡng khấu trừ thuế TNCN thời vụ
    PIT_CASUAL_RATE: 0.1,             // 10% thuế TNCN thời vụ
    PIT_DEDUCTION_SELF: 11000000,     // Giảm trừ bản thân
    PIT_DEDUCTION_DEPENDENT: 4400000, // Giảm trừ người phụ thuộc

    // VAT
    VAT_BANK_LIMIT: 20000000,         // >= 20 triệu phải TT qua NH

    // CIT
    CIT_RATE: 0.20,                   // 20% thuế TNDN
} as const;

// ==================== COMMON UNITS ====================

export const COMMON_UNITS = [
    // Khối lượng
    { value: 'kg', label: 'kg (kilogram)' },
    { value: 'g', label: 'g (gram)' },
    { value: 'tấn', label: 'Tấn' },

    // Đếm được
    { value: 'cái', label: 'Cái' },
    { value: 'chiếc', label: 'Chiếc' },
    { value: 'con', label: 'Con' },
    { value: 'quả', label: 'Quả' },
    { value: 'cây', label: 'Cây' },
    { value: 'tá', label: 'Tá (12 cái)' },
    { value: 'chục', label: 'Chục (10 cái)' },
    { value: 'vỉ', label: 'Vỉ (30 trứng)' },

    // Đóng gói
    { value: 'hộp', label: 'Hộp' },
    { value: 'bó', label: 'Bó' },
    { value: 'bịch', label: 'Bịch' },
    { value: 'gói', label: 'Gói' },
    { value: 'bao', label: 'Bao' },
    { value: 'thùng', label: 'Thùng' },

    // Thể tích
    { value: 'lít', label: 'Lít' },
    { value: 'ml', label: 'ml (millilít)' },
    { value: 'chai', label: 'Chai' },
    { value: 'lon', label: 'Lon' },

    // F&B
    { value: 'ly', label: 'Ly' },
    { value: 'phần', label: 'Phần' },
    { value: 'suất', label: 'Suất' },
    { value: 'đĩa', label: 'Đĩa' },

    // Khác
    { value: 'lần', label: 'Lần' },
    { value: 'giờ', label: 'Giờ' },
    { value: 'ngày', label: 'Ngày' },
    { value: 'm', label: 'm (mét)' },
    { value: 'm²', label: 'm² (mét vuông)' },
    { value: 'm³', label: 'm³ (mét khối)' },
] as const;

// Alias for COMMON_UNITS (for better naming in some contexts)
export const ALL_UNITS = COMMON_UNITS;

// ==================== ACCOUNTING ACCOUNTS ====================

export const DEFAULT_ACCOUNTS = {
    CASH: '111',
    BANK: '112',
    RECEIVABLE: '131',
    PAYABLE: '331',
    REVENUE: '511',
    COGS: '632',
    EXPENSE: '642',
    LABOR_COST: '622',
} as const;

// ==================== PAGINATION ====================

export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
} as const;
