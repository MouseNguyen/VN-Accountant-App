import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from "date-fns"
import { vi } from "date-fns/locale"

// ==================== CLASS UTILITY ====================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ==================== MONEY FORMATTING ====================

/**
 * Format số tiền theo định dạng Việt Nam
 * @example formatMoney(1500000) => "1.500.000đ"
 */
export function formatMoney(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined) return '0đ';

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0đ';

  return new Intl.NumberFormat('vi-VN').format(num) + 'đ';
}

/**
 * Format số tiền không có đơn vị
 * @example formatNumber(1500000) => "1.500.000"
 */
export function formatNumber(num: number | string | null | undefined): string {
  if (num === null || num === undefined) return '0';

  const value = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(value)) return '0';

  return new Intl.NumberFormat('vi-VN').format(value);
}

/**
 * Parse số từ chuỗi format VN
 * @example parseMoney("1.500.000") => 1500000
 */
export function parseMoney(value: string): number {
  if (!value) return 0;
  // Loại bỏ tất cả dấu chấm và đ
  const cleaned = value.replace(/\./g, '').replace(/đ/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// ==================== DATE FORMATTING ====================

/**
 * Format ngày theo định dạng Việt Nam
 * @example formatDate(new Date()) => "11/12/2024"
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd/MM/yyyy', { locale: vi });
  } catch {
    return '';
  }
}

/**
 * Format ngày giờ đầy đủ
 * @example formatDateTime(new Date()) => "11/12/2024 10:30"
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd/MM/yyyy HH:mm', { locale: vi });
  } catch {
    return '';
  }
}

/**
 * Format ngày tương đối (hôm nay, hôm qua, ...)
 */
export function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays === -1) return 'Ngày mai';
    if (diffDays > 1 && diffDays <= 7) return `${diffDays} ngày trước`;

    return formatDate(d);
  } catch {
    return '';
  }
}

// ==================== CODE GENERATION ====================

/**
 * Sinh số chứng từ theo format: PREFIX-YYYYMM-SEQ
 * @example generateTransNumber('PT', new Date(), 1) => "PT-202412-001"
 */
export function generateTransNumber(prefix: string, date: Date, seq: number): string {
  const yearMonth = format(date, 'yyyyMM');
  const seqStr = seq.toString().padStart(3, '0');
  return `${prefix}-${yearMonth}-${seqStr}`;
}

/**
 * Sinh mã code: PREFIX + SEQ
 * @example generateCode('SP', 1) => "SP001"
 */
export function generateCode(prefix: string, seq: number): string {
  return `${prefix}${seq.toString().padStart(3, '0')}`;
}

// ==================== VALIDATION HELPERS ====================

/**
 * Kiểm tra email hợp lệ
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Kiểm tra số điện thoại VN
 */
export function isValidPhone(phone: string): boolean {
  // Chấp nhận: 0901234567, 84901234567, +84901234567
  const phoneRegex = /^(\+?84|0)[1-9]\d{8}$/;
  return phoneRegex.test(phone.replace(/\s|-/g, ''));
}

/**
 * Kiểm tra mã số thuế VN (10 hoặc 13 số)
 */
export function isValidTaxCode(taxCode: string): boolean {
  const cleaned = taxCode.replace(/-/g, '');
  return /^\d{10}$/.test(cleaned) || /^\d{13}$/.test(cleaned);
}

// ==================== STRING HELPERS ====================

/**
 * Truncate text với ellipsis
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ==================== CALCULATION HELPERS ====================

/**
 * Tính thuế TNCN cho lao động thời vụ
 * >= 2 triệu: khấu trừ 10%
 */
export function calculateCasualPIT(grossAmount: number): { taxAmount: number; netAmount: number } {
  const PIT_THRESHOLD = 2000000;
  const PIT_RATE = 0.1;

  if (grossAmount >= PIT_THRESHOLD) {
    const taxAmount = Math.round(grossAmount * PIT_RATE);
    return {
      taxAmount,
      netAmount: grossAmount - taxAmount,
    };
  }

  return {
    taxAmount: 0,
    netAmount: grossAmount,
  };
}

/**
 * Tính VAT
 */
export function calculateVAT(amount: number, vatRate: number): { vatAmount: number; totalAmount: number } {
  const vatAmount = Math.round(amount * (vatRate / 100));
  return {
    vatAmount,
    totalAmount: amount + vatAmount,
  };
}
