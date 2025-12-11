// prisma/seed/accounts.ts
// Hệ thống tài khoản kế toán Việt Nam

export const ACCOUNTS_SEED = [
  // ==================== TÀI SẢN (1xx) ====================
  { code: "111", name: "Tiền mặt", name_en: "Cash on hand", type: "ASSET", level: 1 },
  { code: "1111", name: "Tiền Việt Nam", name_en: "VND Cash", type: "ASSET", level: 2, parent_code: "111" },
  
  { code: "112", name: "Tiền gửi ngân hàng", name_en: "Bank deposits", type: "ASSET", level: 1 },
  { code: "1121", name: "Tiền Việt Nam", name_en: "VND Deposits", type: "ASSET", level: 2, parent_code: "112" },
  
  { code: "131", name: "Phải thu của khách hàng", name_en: "Accounts receivable", type: "ASSET", level: 1 },
  { code: "141", name: "Tạm ứng", name_en: "Advances", type: "ASSET", level: 1 },
  { code: "152", name: "Nguyên liệu, vật liệu", name_en: "Raw materials", type: "ASSET", level: 1 },
  { code: "153", name: "Công cụ, dụng cụ", name_en: "Tools and supplies", type: "ASSET", level: 1 },
  { code: "154", name: "Chi phí sản xuất dở dang", name_en: "Work in progress", type: "ASSET", level: 1 },
  { code: "155", name: "Thành phẩm", name_en: "Finished goods", type: "ASSET", level: 1 },
  { code: "156", name: "Hàng hóa", name_en: "Merchandise", type: "ASSET", level: 1 },
  
  // Tài sản cố định
  { code: "211", name: "Tài sản cố định hữu hình", name_en: "Tangible fixed assets", type: "ASSET", level: 1 },
  { code: "214", name: "Hao mòn TSCĐ", name_en: "Accumulated depreciation", type: "ASSET", level: 1 },
  
  // ==================== NỢ PHẢI TRẢ (3xx) ====================
  { code: "331", name: "Phải trả cho người bán", name_en: "Accounts payable", type: "LIABILITY", level: 1 },
  { code: "333", name: "Thuế và các khoản phải nộp", name_en: "Taxes payable", type: "LIABILITY", level: 1 },
  { code: "3331", name: "Thuế GTGT phải nộp", name_en: "VAT payable", type: "LIABILITY", level: 2, parent_code: "333" },
  { code: "3334", name: "Thuế TNDN phải nộp", name_en: "CIT payable", type: "LIABILITY", level: 2, parent_code: "333" },
  { code: "3335", name: "Thuế TNCN phải nộp", name_en: "PIT payable", type: "LIABILITY", level: 2, parent_code: "333" },
  
  { code: "334", name: "Phải trả người lao động", name_en: "Payroll payable", type: "LIABILITY", level: 1 },
  { code: "338", name: "Phải trả, phải nộp khác", name_en: "Other payables", type: "LIABILITY", level: 1 },
  
  // ==================== VỐN CHỦ SỞ HỮU (4xx) ====================
  { code: "411", name: "Vốn đầu tư của chủ sở hữu", name_en: "Owner's capital", type: "EQUITY", level: 1 },
  { code: "421", name: "Lợi nhuận sau thuế chưa phân phối", name_en: "Retained earnings", type: "EQUITY", level: 1 },
  { code: "4211", name: "LNST chưa phân phối năm trước", name_en: "Prior year retained earnings", type: "EQUITY", level: 2, parent_code: "421" },
  { code: "4212", name: "LNST chưa phân phối năm nay", name_en: "Current year retained earnings", type: "EQUITY", level: 2, parent_code: "421" },
  
  // ==================== DOANH THU (5xx) ====================
  { code: "511", name: "Doanh thu bán hàng và cung cấp dịch vụ", name_en: "Revenue from sales", type: "REVENUE", level: 1 },
  { code: "5111", name: "Doanh thu bán hàng hóa", name_en: "Revenue from goods", type: "REVENUE", level: 2, parent_code: "511" },
  { code: "5112", name: "Doanh thu bán thành phẩm", name_en: "Revenue from products", type: "REVENUE", level: 2, parent_code: "511" },
  { code: "5113", name: "Doanh thu cung cấp dịch vụ", name_en: "Revenue from services", type: "REVENUE", level: 2, parent_code: "511" },
  
  { code: "515", name: "Doanh thu hoạt động tài chính", name_en: "Financial income", type: "REVENUE", level: 1 },
  { code: "711", name: "Thu nhập khác", name_en: "Other income", type: "REVENUE", level: 1 },
  
  // ==================== CHI PHÍ (6xx, 8xx) ====================
  { code: "621", name: "Chi phí nguyên liệu, vật liệu trực tiếp", name_en: "Direct material costs", type: "EXPENSE", level: 1 },
  { code: "622", name: "Chi phí nhân công trực tiếp", name_en: "Direct labor costs", type: "EXPENSE", level: 1 },
  { code: "627", name: "Chi phí sản xuất chung", name_en: "Manufacturing overhead", type: "EXPENSE", level: 1 },
  
  { code: "632", name: "Giá vốn hàng bán", name_en: "Cost of goods sold", type: "EXPENSE", level: 1 },
  { code: "635", name: "Chi phí tài chính", name_en: "Financial expenses", type: "EXPENSE", level: 1 },
  { code: "641", name: "Chi phí bán hàng", name_en: "Selling expenses", type: "EXPENSE", level: 1 },
  { code: "642", name: "Chi phí quản lý doanh nghiệp", name_en: "General & admin expenses", type: "EXPENSE", level: 1 },
  
  { code: "811", name: "Chi phí khác", name_en: "Other expenses", type: "EXPENSE", level: 1 },
  { code: "821", name: "Chi phí thuế TNDN", name_en: "Income tax expense", type: "EXPENSE", level: 1 },
];

export default ACCOUNTS_SEED;
