// src/config/labels.ts
// Type-safe Label System - Compile-time error nếu thiếu key

/**
 * Interface định nghĩa tất cả labels cần có
 * Nếu thêm key mới vào FARM phải thêm vào RETAIL_FNB và ngược lại
 */
interface LabelSchema {
    // Tên gọi chung
    product: string;
    products: string;
    addProduct: string;
    productList: string;
    customer: string;
    customers: string;
    vendor: string;
    vendors: string;
    worker: string;
    workers: string;
    addWorker: string;

    // Danh mục sản phẩm
    category_primary: string;
    category_secondary: string;

    // Đơn vị mặc định
    default_unit: string;

    // Icons
    icon_product: string;
    icon_customer: string;
    icon_vendor: string;
    icon_worker: string;
    icon_business: string;

    // Placeholders
    placeholder_product_name: string;
    placeholder_customer_name: string;
    placeholder_vendor_name: string;

    // Business specific
    revenue_label: string;
    expense_label: string;

    // Mô tả
    business_description: string;
}

/**
 * Labels cho từng loại hình kinh doanh
 * TypeScript sẽ báo lỗi nếu thiếu bất kỳ key nào
 */
const LABELS: Record<'FARM' | 'RETAIL_FNB', LabelSchema> = {
    FARM: {
        product: 'Nông sản',
        products: 'Nông sản & Vật tư',
        addProduct: 'Thêm nông sản',
        productList: 'Danh sách nông sản',
        customer: 'Thương lái',
        customers: 'Thương lái',
        vendor: 'Nhà cung cấp',
        vendors: 'Nhà cung cấp',
        worker: 'Nhân công',
        workers: 'Nhân công',
        addWorker: 'Thêm nhân công',

        category_primary: 'Nông sản',
        category_secondary: 'Vật tư',

        default_unit: 'kg',

        icon_product: '🌾',
        icon_customer: '🧑‍🌾',
        icon_vendor: '🚚',
        icon_worker: '👷',
        icon_business: '🌾',

        placeholder_product_name: 'VD: Lúa IR50404, Phân NPK...',
        placeholder_customer_name: 'VD: Anh Ba thương lái',
        placeholder_vendor_name: 'VD: Cửa hàng vật tư Hoàng Mai',

        revenue_label: 'Tiền bán hàng',
        expense_label: 'Chi phí sản xuất',

        business_description: 'Quản lý nông trại, mua bán nông sản, vật tư nông nghiệp',
    },

    RETAIL_FNB: {
        product: 'Sản phẩm',
        products: 'Menu & Nguyên liệu',
        addProduct: 'Thêm món',
        productList: 'Danh sách menu',
        customer: 'Khách hàng',
        customers: 'Khách hàng',
        vendor: 'Nhà cung cấp',
        vendors: 'Nhà cung cấp',
        worker: 'Nhân viên',
        workers: 'Nhân viên',
        addWorker: 'Thêm nhân viên',

        category_primary: 'Menu',
        category_secondary: 'Nguyên liệu',

        default_unit: 'phần',

        icon_product: '☕',
        icon_customer: '👤',
        icon_vendor: '🚚',
        icon_worker: '👨‍🍳',
        icon_business: '☕',

        placeholder_product_name: 'VD: Cà phê sữa, Bánh mì...',
        placeholder_customer_name: 'VD: Chị Lan - khách quen',
        placeholder_vendor_name: 'VD: Công ty cà phê Trung Nguyên',

        revenue_label: 'Doanh thu bán hàng',
        expense_label: 'Chi phí hoạt động',

        business_description: 'Quản lý quán cafe, nhà hàng, cửa hàng bán lẻ',
    },
};

export type BusinessType = keyof typeof LABELS;
export type LabelKey = keyof LabelSchema;

/**
 * Lấy labels theo business type
 * @param businessType - FARM hoặc RETAIL_FNB
 * @returns Object chứa tất cả labels
 */
export function getLabels(businessType: BusinessType): LabelSchema {
    return LABELS[businessType] || LABELS.FARM;
}

/**
 * Lấy một label cụ thể
 * @param businessType - FARM hoặc RETAIL_FNB
 * @param key - Key của label cần lấy
 * @returns Giá trị label
 */
export function getLabel(businessType: BusinessType, key: LabelKey): string {
    return LABELS[businessType]?.[key] || LABELS.FARM[key];
}

export { LABELS };
export default LABELS;
