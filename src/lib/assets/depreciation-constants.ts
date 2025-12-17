// src/lib/assets/depreciation-constants.ts
// Depreciation constants per TT45/2013/TT-BTC

export type AssetCategoryKey = 'MACHINERY' | 'VEHICLE' | 'BUILDING' | 'EQUIPMENT' | 'LIVESTOCK' | 'OTHER';

export interface DepreciationLimit {
    min_years: number;
    max_years: number;
    default_years: number;
    description: string;
}

/**
 * Thời gian khấu hao theo Thông tư 45/2013/TT-BTC
 */
export const DEPRECIATION_LIMITS: Record<AssetCategoryKey, DepreciationLimit> = {
    MACHINERY: {
        min_years: 5,
        max_years: 15,
        default_years: 10,
        description: 'Máy móc, thiết bị sản xuất',
    },
    VEHICLE: {
        min_years: 6,
        max_years: 10,
        default_years: 8,
        description: 'Phương tiện vận tải',
    },
    BUILDING: {
        min_years: 10,
        max_years: 50,
        default_years: 25,
        description: 'Nhà cửa, vật kiến trúc',
    },
    EQUIPMENT: {
        min_years: 3,
        max_years: 8,
        default_years: 5,
        description: 'Thiết bị, công cụ',
    },
    LIVESTOCK: {
        min_years: 3,
        max_years: 8,
        default_years: 5,
        description: 'Động vật làm việc',
    },
    OTHER: {
        min_years: 5,
        max_years: 10,
        default_years: 5,
        description: 'Tài sản khác',
    },
};

/**
 * Vehicle depreciation cap per TT96/2015
 * Xe dưới 9 chỗ > 1.6B chỉ được khấu trừ max 1.6B
 */
export const VEHICLE_DEPRECIATION_CAP = 1_600_000_000; // 1.6 tỷ

/**
 * Get default useful life in months for a category
 */
export function getDefaultUsefulLife(category: string): number {
    const limits = DEPRECIATION_LIMITS[category as AssetCategoryKey];
    return (limits?.default_years || 5) * 12; // Convert to months
}

/**
 * Validate useful life against TT45/2013 limits
 */
export function validateUsefulLife(
    category: string,
    months: number
): { valid: boolean; message?: string; warning?: boolean } {
    const limits = DEPRECIATION_LIMITS[category as AssetCategoryKey];
    if (!limits) return { valid: true };

    const years = months / 12;

    if (years < limits.min_years) {
        return {
            valid: false,
            message: `Thời gian khấu hao tối thiểu ${limits.min_years} năm cho ${limits.description} (TT45/2013)`,
        };
    }

    if (years > limits.max_years) {
        return {
            valid: false,
            message: `Thời gian khấu hao tối đa ${limits.max_years} năm cho ${limits.description} (TT45/2013)`,
        };
    }

    return { valid: true };
}

/**
 * Calculate monthly depreciation (straight-line method)
 */
export function calculateMonthlyDepreciationAmount(
    originalCost: number,
    usefulLifeMonths: number,
    residualValue: number = 0
): number {
    if (usefulLifeMonths <= 0) return 0;
    const depreciableAmount = originalCost - residualValue;
    return Math.round(depreciableAmount / usefulLifeMonths);
}

/**
 * Get category label in Vietnamese
 */
export function getCategoryLabel(category: string): string {
    const limits = DEPRECIATION_LIMITS[category as AssetCategoryKey];
    return limits?.description || category;
}

/**
 * Get status label in Vietnamese
 */
export function getStatusLabel(status: string): string {
    const map: Record<string, string> = {
        ACTIVE: 'Đang sử dụng',
        DISPOSED: 'Đã thanh lý',
        SOLD: 'Đã bán',
        UNDER_REPAIR: 'Đang sửa chữa',
    };
    return map[status] || status;
}

/**
 * Calculate months between two dates
 */
export function getMonthsDifference(from: Date, to: Date): number {
    return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

/**
 * Check if vehicle needs depreciation cap
 */
export function shouldApplyVehicleCap(
    category: string,
    purchasePrice: number,
    isTransportBusiness: boolean = false
): boolean {
    // Transport businesses (DN vận tải) are exempt from cap
    if (isTransportBusiness) return false;

    // Only applies to VEHICLE category
    if (category !== 'VEHICLE') return false;

    // Only applies if > 1.6B
    return purchasePrice > VEHICLE_DEPRECIATION_CAP;
}

/**
 * Get deductible value for tax purposes
 */
export function getDeductibleValue(
    category: string,
    purchasePrice: number,
    isTransportBusiness: boolean = false
): number {
    if (shouldApplyVehicleCap(category, purchasePrice, isTransportBusiness)) {
        return VEHICLE_DEPRECIATION_CAP;
    }
    return purchasePrice;
}
