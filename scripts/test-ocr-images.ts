// scripts/test-ocr-images.ts
// Test OCR với ảnh thực từ file

import * as fs from 'fs';
import * as path from 'path';

// Load .env manually
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
            process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
        }
    });
}

import { processWithGoogleVision } from '../src/lib/ocr/google-vision';
import { parseInvoiceText } from '../src/lib/ocr/invoice-parser';
import { sanitizeOCRText } from '../src/lib/ocr/pre-validator';

async function testOCRWithImage(imagePath: string) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${path.basename(imagePath)}`);
    console.log('='.repeat(60));

    // Read file and convert to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
    console.log(`Image size: ${Math.round(base64.length / 1024)} KB`);

    // Call Google Vision
    console.log('\nCalling Google Vision API...');
    const ocrResult = await processWithGoogleVision(base64);

    if (!ocrResult.success) {
        console.error('❌ OCR Failed:', ocrResult.error);
        return;
    }

    console.log('✅ OCR Success!');
    console.log('\n--- Raw Text (first 800 chars) ---');
    console.log(ocrResult.rawText?.substring(0, 800));
    console.log('...\n');

    // Parse the text
    const sanitized = sanitizeOCRText(ocrResult.rawText || '');
    const parsed = parseInvoiceText(sanitized);

    console.log('--- Parsed Results ---');
    console.log('Supplier Name:', parsed.supplier_name || '(not found)');
    console.log('Tax Code:', parsed.supplier_tax_code || '(not found)');
    console.log('Invoice Number:', parsed.invoice_number || '(not found)');
    console.log('Invoice Date:', parsed.invoice_date || '(not found)');
    console.log('Subtotal:', parsed.subtotal?.toLocaleString() || '(not found)');
    console.log('Tax Amount:', parsed.tax_amount?.toLocaleString() || '(not found)');
    console.log('Total Amount:', parsed.total_amount?.toLocaleString() || '(not found)');
    console.log('Confidence:', parsed.confidence + '%');
    console.log('Warnings:', parsed.warnings?.join(', ') || 'None');
}

async function main() {
    const testImages = [
        'F:/VN Accountant App/Docs/mau-hoa-don-ban-hang-dien-tu-dep.jpg',
        'F:/VN Accountant App/Docs/hoa-don-dien-tu-la-gi.jpg',
    ];

    for (const imagePath of testImages) {
        if (fs.existsSync(imagePath)) {
            await testOCRWithImage(imagePath);
        } else {
            console.log(`File not found: ${imagePath}`);
        }
    }
}

main().catch(console.error);
