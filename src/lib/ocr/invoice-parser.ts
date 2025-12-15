// src/lib/ocr/invoice-parser.ts
// Parse Vietnamese invoice text from OCR

import { OCRResult } from '@/types/invoice';

// ==========================================
// VN CURRENCY PARSER
// ==========================================

export function parseVNCurrency(text: string): number | null {
    if (!text) return null;

    // Remove all spaces
    let cleaned = text.replace(/\s/g, '');

    // Remove currency suffix
    cleaned = cleaned.replace(/đ|vnd|vnđ|dong|₫/gi, '');

    // Remove common prefixes
    cleaned = cleaned.replace(/^[:\s=]+/, '');

    // Handle VN format: 1.000.000 (dots as thousand separators)
    // vs US format: 1,000,000 (commas as thousand separators)

    if (cleaned.includes('.') && cleaned.includes(',')) {
        // Mixed format - determine which is decimal
        const lastDot = cleaned.lastIndexOf('.');
        const lastComma = cleaned.lastIndexOf(',');

        if (lastComma > lastDot) {
            // European format: 1.000.000,50
            cleaned = cleaned.replace(/\./g, '').replace(',', '.');
        } else {
            // US format: 1,000,000.50
            cleaned = cleaned.replace(/,/g, '');
        }
    } else if (cleaned.includes('.')) {
        // Only dots - check if VN thousand separator
        const dotCount = (cleaned.match(/\./g) || []).length;
        const lastDotPos = cleaned.lastIndexOf('.');
        const afterDot = cleaned.substring(lastDotPos + 1);

        // VN format: dots every 3 digits
        if (dotCount >= 2 || (dotCount === 1 && afterDot.length === 3)) {
            cleaned = cleaned.replace(/\./g, '');
        }
    } else if (cleaned.includes(',')) {
        // Only commas
        const commaCount = (cleaned.match(/,/g) || []).length;
        const lastCommaPos = cleaned.lastIndexOf(',');
        const afterComma = cleaned.substring(lastCommaPos + 1);

        if (commaCount >= 2 || (commaCount === 1 && afterComma.length === 3)) {
            cleaned = cleaned.replace(/,/g, '');
        } else {
            // Single comma is decimal separator
            cleaned = cleaned.replace(',', '.');
        }
    }

    // Reject numbers that are too long (likely barcodes) - VND max ~12 digits (999 billion)
    const digitsOnly = cleaned.replace(/[^0-9]/g, '');
    if (digitsOnly.length > 12) {
        return null;
    }

    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
}

// ==========================================
// DATE PARSER
// ==========================================

export function parseVNDate(text: string): string | null {
    if (!text) return null;

    // Common VN date formats
    const patterns = [
        // DD/MM/YYYY
        /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/,
        // DD-MM-YY
        /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})/,
        // Ngày DD tháng MM năm YYYY
        /ngày\s*(\d{1,2})\s*tháng\s*(\d{1,2})\s*năm\s*(\d{4})/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10);
            let year = parseInt(match[3], 10);

            // Handle 2-digit year
            if (year < 100) {
                year += year > 50 ? 1900 : 2000;
            }

            // Validate
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                return dateStr;
            }
        }
    }

    return null;
}

// ==========================================
// TAX CODE PARSER
// ==========================================

export function parseTaxCode(text: string): string | null {
    if (!text) return null;

    // VN tax code: 10 or 13 digits
    // Province codes: 01-99 (can start with 0, e.g., 01 = Hanoi)
    // Only match with explicit MST keyword to avoid phone numbers
    const patterns = [
        /mst[:\s]*(\d{10}(?:-?\d{3})?)/i,
        /mã số thuế[:\s]*(\d{10}(?:-?\d{3})?)/i,
        /tax\s*code[):\s]*(\d{10}(?:-?\d{3})?)/i, // Handle "Tax code):" format
        /m\.s\.t\.?[:\s]*(\d{10}(?:-?\d{3})?)/i,
        // Bilingual format: Mã số thuế (Tax code): 0123456789
        /mã số thuế\s*\([^)]+\)[:\s]*(\d{10}(?:-?\d{3})?)/i,
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            // Remove dash
            const code = match[1].replace(/-/g, '');

            if (code.length === 10 || code.length === 13) {
                // Validate: first 2 digits are province code (01-99)
                const provinceCode = parseInt(code.substring(0, 2), 10);
                if (provinceCode >= 1 && provinceCode <= 99) {
                    return code;
                }
            }
        }
    }

    return null;
}

// ==========================================
// MAIN PARSER
// ==========================================

export function parseInvoiceText(rawText: string): OCRResult {
    const text = rawText.toLowerCase();
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

    const result: OCRResult = {
        raw_text: rawText,
        confidence: 0,
        warnings: [],
    };

    // 1. Find invoice number
    const invoiceNumberPatterns = [
        /số[:\s]*(\d+)/i,
        /số hóa đơn[:\s]*(\d+)/i,
        /invoice\s*(?:no|number)?[:\s#]*(\d+)/i,
        /hđ[:\s]*(\d+)/i,
        /no[:\.\s]*(\d+)/i,
    ];

    for (const pattern of invoiceNumberPatterns) {
        const match = rawText.match(pattern);
        if (match) {
            result.invoice_number = match[1];
            break;
        }
    }

    // 2. Find date
    const dateResult = parseVNDate(rawText);
    if (dateResult) result.invoice_date = dateResult;

    // 3. Find supplier name (usually at the top)
    const supplierPatterns = [
        /(?:công ty|cty|company)[:\s]*(.*?)(?:\n|$)/i,
        /(?:nhà cung cấp|ncc|supplier)[:\s]*(.*?)(?:\n|$)/i,
    ];

    for (const pattern of supplierPatterns) {
        const match = rawText.match(pattern);
        if (match && match[1].length > 3) {
            result.supplier_name = match[1].trim();
            break;
        }
    }

    // Fallback: First line that looks like a company name
    if (!result.supplier_name) {
        for (const line of lines.slice(0, 5)) {
            if ((line.toLowerCase().includes('công ty') ||
                line.toLowerCase().includes('cty') ||
                line.toLowerCase().includes('dntn') ||
                line.toLowerCase().includes('tnhh')) && line.length > 10) {
                result.supplier_name = line;
                break;
            }
        }
    }

    // 4. Find tax code
    const taxCodeResult = parseTaxCode(rawText);
    if (taxCodeResult) result.supplier_tax_code = taxCodeResult;

    // 5. Find amounts - more patterns for VN receipts
    const amountPatterns = [
        {
            key: 'total_amount',
            patterns: [
                /phải (?:tt|thanh toán)[:\s]*([0-9.,]+)/i,
                /thanh toán[:\s]*([0-9.,]+)/i,
                /tổng[:\s]*([0-9.,]+)/i,
                /tổng (?:cộng|tiền)[:\s]*([0-9.,]+)/i,
                /total[:\s]*([0-9.,]+)/i,
                /thành tiền[:\s]*([0-9.,]+)/i,
                /grand total[:\s]*([0-9.,]+)/i,
            ]
        },
        {
            key: 'tax_amount',
            patterns: [
                /thuế gtgt[:\s]*([0-9.,]+)/i,
                /thuế vat[:\s]*([0-9.,]+)/i,
                /tiền thuế[:\s]*([0-9.,]+)/i,
                /vat\s*\d+%?[:\s]*([0-9.,]+)/i,
                /gtgt\s*\d+%?[:\s]*([0-9.,]+)/i,
                // More specific: "Thuế GTGT:" or "VAT:" but NOT "Mã số thuế"
                /(?<!mã số |m\.s\.|số )thuế[:\s]+([0-9.,]+)/i,
            ]
        },
        {
            key: 'subtotal',
            patterns: [
                /(?:tiền hàng|cộng tiền)[:\s]*([0-9.,]+)/i,
                /subtotal[:\s]*([0-9.,]+)/i,
                /tạm tính[:\s]*([0-9.,]+)/i,
            ]
        },
        {
            key: 'discount',
            patterns: [
                /giảm giá[:\s]*([0-9.,]+)/i,
                /chiết khấu[:\s]*([0-9.,]+)/i,
                /discount[:\s]*([0-9.,]+)/i,
            ]
        }
    ];

    for (const { key, patterns } of amountPatterns) {
        for (const pattern of patterns) {
            const match = rawText.match(pattern);
            if (match) {
                const value = parseVNCurrency(match[1]);
                if (value !== null && value > 0) {
                    (result as any)[key] = value;
                    break;
                }
            }
        }
    }

    // 6. Try to find amounts from large numbers in text (improved regex)
    if (!result.total_amount) {
        // Look for numbers with comma/dot separators that look like VN currency
        // Exclude phone numbers (10 digits starting with 0)
        const numberPattern = /\b(\d{1,3}(?:[.,]\d{3})+|\d{4,})\b/g;
        const matches = rawText.match(numberPattern);

        if (matches) {
            const MAX_REASONABLE_AMOUNT = 10_000_000_000; // 10 billion VND max
            const amounts = matches
                .filter(n => {
                    // Exclude phone numbers: 10 digits starting with 0
                    const cleaned = n.replace(/[.,]/g, '');
                    if (cleaned.length === 10 && cleaned.startsWith('0')) {
                        return false;
                    }
                    return true;
                })
                .map(n => parseVNCurrency(n))
                .filter((n): n is number => n !== null && n > 1000 && n < MAX_REASONABLE_AMOUNT)
                .sort((a, b) => b - a);

            if (amounts.length > 0) {
                // Take the largest reasonable number as total
                result.total_amount = amounts[0];
                result.warnings?.push('Tổng tiền được trích xuất tự động, vui lòng kiểm tra');
            }
        }
    }

    // 7. Calculate confidence
    let confidenceScore = 30; // Base score

    if (result.invoice_number) confidenceScore += 15;
    if (result.invoice_date) confidenceScore += 15;
    if (result.supplier_name) confidenceScore += 15;
    if (result.supplier_tax_code) confidenceScore += 10;
    if (result.total_amount) confidenceScore += 15;

    result.confidence = Math.min(confidenceScore, 100);

    // 8. Validation warnings
    if (result.subtotal && result.tax_amount && result.total_amount) {
        const expectedTotal = result.subtotal + result.tax_amount;
        const diff = Math.abs(expectedTotal - result.total_amount);

        if (diff > result.total_amount * 0.01) {
            result.warnings?.push(`Tổng tiền không khớp: ${result.subtotal} + ${result.tax_amount} ≠ ${result.total_amount}`);
        }
    }

    return result;
}
