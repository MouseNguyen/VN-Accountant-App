# 📋 PHASE 1 - TASK 9: OCR INTEGRATION

## Thông Tin Task

| Mục | Chi tiết |
|-----|----------|
| **Task ID** | P1-T9 |
| **Tên** | OCR Integration |
| **Thời gian** | 4-5 giờ |
| **Phụ thuộc** | Task 5 (Transactions) |
| **Task tiếp theo** | Phase 2 |

---

## 📋 MỤC TIÊU

- Upload ảnh hóa đơn
- OCR với Google Cloud Vision
- Extract: Tên NCC, MST, Số HĐ, Ngày, Tiền
- Auto-fill form tạo giao dịch

---

## PHẦN 1: API ENDPOINTS

### POST /api/invoices/upload

```typescript
// Upload image, save to storage, create Invoice record
// Response: { invoice_id, image_url }
```

### POST /api/invoices/[id]/ocr

```typescript
// Call Google Cloud Vision API
// Extract text, parse Vietnamese invoice format
// Update Invoice record with extracted data
```

### GET /api/invoices/[id]

```typescript
// Get invoice with OCR result
```

---

## PHẦN 2: OCR SERVICE

### Google Cloud Vision Setup

```typescript
// src/lib/ocr-service.ts

import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_CLOUD_CREDENTIALS,
});

export async function extractTextFromImage(imageUrl: string) {
  const [result] = await client.textDetection(imageUrl);
  return result.fullTextAnnotation?.text || '';
}
```

### Invoice Parser

```typescript
// src/lib/invoice-parser.ts

interface ParsedInvoice {
  vendor_name?: string;
  vendor_tax_code?: string;
  invoice_number?: string;
  invoice_date?: string;
  total_amount?: number;
  vat_amount?: number;
}

export function parseVietnameseInvoice(text: string): ParsedInvoice {
  const result: ParsedInvoice = {};
  
  // MST pattern: 10 or 13 digits
  const mstMatch = text.match(/MST[:\s]*(\d{10}(?:-\d{3})?)/i);
  if (mstMatch) result.vendor_tax_code = mstMatch[1];
  
  // Invoice number
  const invoiceMatch = text.match(/(?:Số|No)[:\s]*([A-Z0-9\/]+)/i);
  if (invoiceMatch) result.invoice_number = invoiceMatch[1];
  
  // Date pattern: dd/mm/yyyy
  const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (dateMatch) result.invoice_date = dateMatch[1];
  
  // Amount patterns
  const amountMatch = text.match(/(?:Tổng|Total)[:\s]*([\d.,]+)/i);
  if (amountMatch) {
    result.total_amount = parseVietnameseNumber(amountMatch[1]);
  }
  
  return result;
}

function parseVietnameseNumber(str: string): number {
  return parseInt(str.replace(/[.,]/g, ''));
}
```

---

## PHẦN 3: UI COMPONENTS

### Invoice Scanner Page

```tsx
// Camera/file upload
// Preview image
// Show OCR results
// Confirm and create transaction
```

### Key Features

1. **Upload Options:**
   - Camera capture (mobile)
   - File select
   - Drag & drop

2. **OCR Result Display:**
   - Editable fields
   - Confidence indicators
   - Manual correction

3. **Auto-fill Transaction:**
   - Pre-fill form với OCR data
   - User confirms/edits
   - Create PURCHASE transaction

---

## ✅ CHECKLIST

- [ ] POST /api/invoices/upload
- [ ] POST /api/invoices/[id]/ocr
- [ ] Google Cloud Vision integration
- [ ] Vietnamese invoice parser
- [ ] Scanner UI with camera
- [ ] OCR result editor
- [ ] Auto-fill purchase form

---

## 🔗 KẾT NỐI VỚI PHASE 2

### Output → Phase 2 Task 8 (VAT Declaration)
- Extracted MST → VAT validation
- Invoice data → Input VAT calculation

---

**Timeline:** 4-5 giờ  
**Phase 1 Complete after this task!**
