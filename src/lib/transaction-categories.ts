// src/lib/transaction-categories.ts
// Transaction Category Constants for Tax Engine
// All categories include taxBadge for UI display

// ==========================================
// INCOME Categories (VAT Rate)
// ==========================================
export const INCOME_CATEGORIES = [
    { value: 'AGRI_RAW', label: 'Nông sản sơ chế', taxBadge: 'VAT 0%', taxBadgeColor: 'green' },
    { value: 'AGRI_PROD', label: 'Nông sản thương mại', taxBadge: 'VAT 5%', taxBadgeColor: 'blue' },
    { value: 'GENERAL', label: 'Hàng hóa/dịch vụ khác', taxBadge: 'VAT 10%', taxBadgeColor: 'orange' },
    { value: 'SERVICE', label: 'Dịch vụ', taxBadge: 'VAT 10%', taxBadgeColor: 'orange' },
    { value: 'ASSET_SALE', label: 'Thanh lý tài sản', taxBadge: 'VAT 10%', taxBadgeColor: 'orange' },
] as const;

// ==========================================
// EXPENSE Categories (VAT Deductible + CIT)
// ==========================================
export const EXPENSE_CATEGORIES = [
    { value: 'MATERIALS', label: 'Nguyên vật liệu', taxBadge: '✅ VAT khấu trừ', taxBadgeColor: 'green' },
    { value: 'EQUIPMENT', label: 'Thiết bị/Máy móc', taxBadge: '✅ VAT khấu trừ', taxBadgeColor: 'green' },
    { value: 'VEHICLE', label: 'Phương tiện', taxBadge: '⚠️ VAT giới hạn 1.6 tỷ', taxBadgeColor: 'yellow' },
    { value: 'NORMAL', label: 'Chi phí thường', taxBadge: '✅ CIT khấu trừ', taxBadgeColor: 'green' },
] as const;

// ==========================================
// CASH_IN Categories
// ==========================================
export const CASH_IN_CATEGORIES = [
    { value: 'RECEIVABLE_COLLECTION', label: 'Thu công nợ khách hàng', taxBadge: '─ Không ảnh hưởng thuế', taxBadgeColor: 'gray' },
    { value: 'BANK_LOAN', label: 'Vay ngân hàng', taxBadge: '─ Không ảnh hưởng thuế', taxBadgeColor: 'gray' },
    { value: 'OWNER_CAPITAL', label: 'Vốn góp chủ sở hữu', taxBadge: '─ Không ảnh hưởng thuế', taxBadgeColor: 'gray' },
    { value: 'INTEREST_INCOME', label: 'Thu lãi tiền gửi', taxBadge: '💰 Tính CIT 20%', taxBadgeColor: 'orange' },
    { value: 'TAX_REFUND', label: 'Hoàn thuế', taxBadge: '─ Không ảnh hưởng thuế', taxBadgeColor: 'gray' },
    { value: 'INSURANCE_CLAIM', label: 'Thu bảo hiểm', taxBadge: '💰 Có thể tính CIT', taxBadgeColor: 'yellow' },
    { value: 'OTHER_INCOME', label: 'Thu khác', taxBadge: '─', taxBadgeColor: 'gray' },
] as const;

// ==========================================
// CASH_OUT Categories (PIT + CIT + VAT)
// ==========================================
export const CASH_OUT_CATEGORIES = [
    { value: 'SALARY', label: 'Lương thưởng', taxBadge: '👤 PIT 5-35%', taxBadgeColor: 'purple' },
    { value: 'UTILITY', label: 'Điện/Nước/Internet', taxBadge: '✅ VAT 10%, CIT 100%', taxBadgeColor: 'green' },
    { value: 'RENT', label: 'Thuê mặt bằng', taxBadge: '✅ VAT 10%, CIT 100%', taxBadgeColor: 'green' },
    { value: 'ADMIN_PENALTY', label: 'Phạt hành chính', taxBadge: '❌ CIT không được trừ', taxBadgeColor: 'red' },
    { value: 'WELFARE', label: 'Chi phúc lợi', taxBadge: '⚠️ CIT giới hạn 1 tháng lương', taxBadgeColor: 'yellow' },
    { value: 'ENTERTAINMENT', label: 'Tiếp khách', taxBadge: '⚠️ CIT giới hạn', taxBadgeColor: 'yellow' },
    { value: 'LOAN_REPAYMENT', label: 'Trả nợ vay', taxBadge: '─ Không ảnh hưởng P&L', taxBadgeColor: 'gray' },
    { value: 'INSURANCE', label: 'Bảo hiểm', taxBadge: '✅ CIT 100%', taxBadgeColor: 'green' },
    { value: 'NORMAL', label: 'Chi khác', taxBadge: '✅ CIT khấu trừ', taxBadgeColor: 'green' },
] as const;

// ==========================================
// Helper to get category by type
// ==========================================
export function getCategoriesForType(transType: string) {
    switch (transType) {
        case 'INCOME':
            return INCOME_CATEGORIES;
        case 'EXPENSE':
            return EXPENSE_CATEGORIES;
        case 'CASH_IN':
            return CASH_IN_CATEGORIES;
        case 'CASH_OUT':
            return CASH_OUT_CATEGORIES;
        default:
            return [];
    }
}

// ==========================================
// Get tax badge color class
// ==========================================
export function getTaxBadgeColorClass(color: string): string {
    switch (color) {
        case 'green':
            return 'bg-green-500/20 text-green-600 dark:text-green-400';
        case 'blue':
            return 'bg-blue-500/20 text-blue-600 dark:text-blue-400';
        case 'orange':
            return 'bg-orange-500/20 text-orange-600 dark:text-orange-400';
        case 'yellow':
            return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400';
        case 'red':
            return 'bg-red-500/20 text-red-600 dark:text-red-400';
        case 'purple':
            return 'bg-purple-500/20 text-purple-600 dark:text-purple-400';
        case 'gray':
        default:
            return 'bg-gray-500/20 text-gray-600 dark:text-gray-400';
    }
}

// ==========================================
// Category Labels for display
// ==========================================
export const INCOME_CATEGORY_LABELS: Record<string, string> = {
    AGRI_RAW: 'Nông sản sơ chế (VAT 0%)',
    AGRI_PROD: 'Nông sản thương mại (VAT 5%)',
    GENERAL: 'Hàng hóa/dịch vụ (VAT 10%)',
    SERVICE: 'Dịch vụ (VAT 10%)',
    ASSET_SALE: 'Thanh lý tài sản (VAT 10%)',
};

export const EXPENSE_TYPE_LABELS: Record<string, string> = {
    NORMAL: 'Chi phí thường',
    ADMIN_PENALTY: 'Phạt hành chính (CIT không trừ)',
    WELFARE: 'Chi phúc lợi (CIT giới hạn)',
    MATERIALS: 'Nguyên vật liệu (VAT khấu trừ)',
    SALARY: 'Lương thưởng (PIT 5-35%)',
    UTILITY: 'Điện/Nước/Internet (VAT 10%)',
    RENT: 'Thuê mặt bằng (VAT 10%)',
    LOAN_REPAYMENT: 'Trả nợ vay',
    ENTERTAINMENT: 'Tiếp khách (CIT giới hạn)',
    EQUIPMENT: 'Thiết bị/Máy móc',
    VEHICLE: 'Phương tiện (VAT giới hạn)',
    INSURANCE: 'Bảo hiểm',
};

export const CASH_IN_CATEGORY_LABELS: Record<string, string> = {
    RECEIVABLE_COLLECTION: 'Thu công nợ khách hàng',
    BANK_LOAN: 'Vay ngân hàng',
    OWNER_CAPITAL: 'Vốn góp chủ sở hữu',
    INTEREST_INCOME: 'Thu lãi tiền gửi (CIT 20%)',
    TAX_REFUND: 'Hoàn thuế',
    INSURANCE_CLAIM: 'Thu bảo hiểm',
    OTHER_INCOME: 'Thu khác',
};

// Types for TypeScript
export type IncomeCategory = typeof INCOME_CATEGORIES[number]['value'];
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]['value'];
export type CashInCategory = typeof CASH_IN_CATEGORIES[number]['value'];
export type CashOutCategory = typeof CASH_OUT_CATEGORIES[number]['value'];
