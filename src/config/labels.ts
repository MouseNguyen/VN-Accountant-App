// src/config/labels.ts
// Dynamic labels theo loại hình kinh doanh (FARM vs RETAIL_FNB)

export const LABELS = {
    FARM: {
        // Products
        product: 'Nông sản',
        products: 'Nông sản & Vật tư',
        addProduct: 'Thêm nông sản',
        productList: 'Danh sách nông sản',

        // Partners
        customer: 'Thương lái',
        customers: 'Thương lái',
        vendor: 'Nhà cung cấp',
        vendors: 'Nhà cung cấp',

        // Workers
        worker: 'Nhân công',
        workers: 'Nhân công',
        addWorker: 'Thêm nhân công',

        // Categories
        category_1: 'Nông sản',
        category_2: 'Vật tư',

        // Icons
        icon_product: '🌾',
        icon_customer: '🧑‍🌾',
        icon_vendor: '🏪',
        icon_worker: '👷',

        // Business specific
        revenue_label: 'Tiền bán hàng',
        expense_label: 'Chi phí sản xuất',

        // Placeholder texts
        product_placeholder: 'VD: Rau cải, Cà chua, Phân bón...',
        customer_placeholder: 'VD: Thương lái A, Chợ đầu mối...',
    },

    RETAIL_FNB: {
        // Products
        product: 'Món/Menu',
        products: 'Menu & Nguyên liệu',
        addProduct: 'Thêm món',
        productList: 'Danh sách menu',

        // Partners
        customer: 'Khách hàng',
        customers: 'Khách hàng',
        vendor: 'Nhà cung cấp',
        vendors: 'Nhà cung cấp',

        // Workers
        worker: 'Nhân viên',
        workers: 'Nhân viên',
        addWorker: 'Thêm nhân viên',

        // Categories
        category_1: 'Menu',
        category_2: 'Nguyên liệu',

        // Icons
        icon_product: '☕',
        icon_customer: '👤',
        icon_vendor: '📦',
        icon_worker: '👨‍🍳',

        // Business specific
        revenue_label: 'Doanh thu bán hàng',
        expense_label: 'Chi phí hoạt động',

        // Placeholder texts
        product_placeholder: 'VD: Cà phê sữa, Bánh mì, Bơ...',
        customer_placeholder: 'VD: Khách lẻ, Công ty ABC...',
    },
} as const;

export type BusinessType = keyof typeof LABELS;
export type LabelKey = keyof typeof LABELS.FARM;

/**
 * Lấy labels theo loại hình kinh doanh
 */
export function getLabels(businessType: BusinessType) {
    return LABELS[businessType] || LABELS.FARM;
}

/**
 * Lấy một label cụ thể
 */
export function getLabel(businessType: BusinessType, key: LabelKey): string {
    const labels = getLabels(businessType);
    return labels[key] || key;
}

export default LABELS;
