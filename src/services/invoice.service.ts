// src/services/invoice.service.ts

import { prismaBase } from '@/lib/prisma';
import { getCurrentFarmId, getContext } from '@/lib/context';
import { processWithGoogleVision, parseInvoiceText, preValidateImage, sanitizeOCRText } from '@/lib/ocr';
import { uploadToR2 } from '@/lib/storage';
import { Invoice, OCRResult, UploadInvoiceResponse, InvoiceListParams } from '@/types/invoice';
import { ConfirmInvoiceInput } from '@/lib/validations/invoice';
import { InvoiceStatus, TransactionType, PaymentMethod } from '@prisma/client';
import Fuse from 'fuse.js';

// ==========================================
// UPLOAD & OCR INVOICE
// ==========================================

export async function uploadAndOCRInvoice(input: {
    image: string;
    auto_create_transaction?: boolean;
}): Promise<UploadInvoiceResponse> {
    const farmId = getCurrentFarmId();
    const context = getContext();

    // 1. Pre-validate image
    const validation = preValidateImage(input.image);
    if (!validation.valid) {
        throw new Error(validation.reason || 'Ảnh không hợp lệ');
    }

    // Convert base64 to buffer for upload
    const base64Data = input.image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload to R2
    let imageUrl = '';
    try {
        if (process.env.R2_ACCOUNT_ID) {
            imageUrl = await uploadToR2(buffer, `invoice-${validation.hash?.substring(0, 8)}.jpg`);
        } else {
            // Fallback if R2 not configured
            imageUrl = 'https://placehold.co/600x800?text=No+R2+Storage';
            console.warn('R2 not configured, skipping upload');
        }
    } catch (e) {
        console.error('Upload failed:', e);
        // Continue flow even if upload fails? No, better to fail or use placeholder
        imageUrl = 'https://placehold.co/600x800?text=Upload+Failed';
    }

    // 2. Check for duplicate (by hash)
    if (validation.hash) {
        const existing = await prismaBase.invoice.findFirst({
            where: {
                farm_id: farmId,
                image_hash: validation.hash,
                status: { in: ['PROCESSED', 'CONFIRMED'] },
            },
        });

        if (existing) {
            throw new Error('Hóa đơn này đã được upload trước đó');
        }
    }

    // 3. Create invoice record (PENDING)
    const invoice = await prismaBase.invoice.create({
        data: {
            farm_id: farmId,
            image_url: imageUrl,
            image_hash: validation.hash,
            file_size: validation.size,
            status: 'PENDING',
            created_by: context?.userId,
            // Set expiry for cleanup (24 hours) - or keep longer if stored in R2
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
    });

    try {
        // 4. Call Google Vision OCR
        console.log('[OCR] Starting OCR process for invoice:', invoice.id);
        console.log('[OCR] Image size:', Math.round(input.image.length / 1024), 'KB');

        const ocrResult = await processWithGoogleVision(input.image);
        console.log('[OCR] Result:', ocrResult.success ? 'Success' : 'Failed', ocrResult.error || '');

        if (!ocrResult.success) {
            // Update invoice as FAILED
            await prismaBase.invoice.update({
                where: { id: invoice.id },
                data: {
                    status: 'FAILED',
                    error_message: ocrResult.error,
                },
            });

            throw new Error(ocrResult.error || 'OCR thất bại');
        }

        // 5. Parse invoice text
        const sanitizedText = sanitizeOCRText(ocrResult.rawText!);
        console.log('[OCR] Raw text (first 500 chars):', sanitizedText.substring(0, 500));
        const parsedResult = parseInvoiceText(sanitizedText);
        console.log('[OCR] Parsed result:', JSON.stringify(parsedResult, null, 2));

        // 6. Try to match partner
        let matchedPartner = null;
        if (parsedResult.supplier_tax_code || parsedResult.supplier_name) {
            matchedPartner = await matchPartner(
                farmId,
                parsedResult.supplier_name,
                parsedResult.supplier_tax_code
            );
        }

        // 7. Update invoice with OCR results
        const updatedInvoice = await prismaBase.invoice.update({
            where: { id: invoice.id },
            data: {
                status: 'PROCESSED',
                ocr_raw: { text: sanitizedText },
                ocr_parsed: parsedResult as any,
                ocr_confidence: parsedResult.confidence,
                ocr_provider: 'google',
                invoice_number: parsedResult.invoice_number,
                invoice_date: parsedResult.invoice_date ? new Date(parsedResult.invoice_date) : null,
                supplier_name: parsedResult.supplier_name,
                supplier_tax_code: parsedResult.supplier_tax_code,
                subtotal: parsedResult.subtotal,
                tax_amount: parsedResult.tax_amount,
                total_amount: parsedResult.total_amount,
                matched_partner_id: matchedPartner?.partner_id,
                match_confidence: matchedPartner?.confidence,
                expires_at: null, // Remove expiry after successful processing
            },
        });

        return {
            id: updatedInvoice.id,
            status: 'PROCESSED',
            ocr_result: parsedResult,
            message: 'OCR thành công',
        };
    } catch (error) {
        // Update retry count
        await prismaBase.invoice.update({
            where: { id: invoice.id },
            data: {
                retry_count: { increment: 1 },
                error_message: error instanceof Error ? error.message : 'Unknown error',
            },
        });

        throw error;
    }
}

// ==========================================
// PARTNER MATCHING
// ==========================================

interface MatchResult {
    partner_id: string;
    name: string;
    tax_code?: string;
    confidence: number;
    match_type: 'tax_code' | 'name' | 'none';
}

async function matchPartner(
    farmId: string,
    supplierName?: string | null,
    supplierTaxCode?: string | null
): Promise<MatchResult | null> {
    // 1. Exact tax code match (highest priority)
    if (supplierTaxCode) {
        const partner = await prismaBase.partner.findFirst({
            where: {
                farm_id: farmId,
                tax_code: supplierTaxCode,
                deleted_at: null,
            },
        });

        if (partner) {
            return {
                partner_id: partner.id,
                name: partner.name,
                tax_code: partner.tax_code || undefined,
                confidence: 100,
                match_type: 'tax_code',
            };
        }
    }

    // 2. Fuzzy name match
    if (supplierName) {
        const partners = await prismaBase.partner.findMany({
            where: {
                farm_id: farmId,
                partner_type: 'VENDOR',
                deleted_at: null,
            },
            select: { id: true, name: true, tax_code: true },
        });

        if (partners.length > 0) {
            const fuse = new Fuse(partners, {
                keys: ['name'],
                threshold: 0.4,
                includeScore: true,
            });

            const results = fuse.search(supplierName);

            if (results.length > 0 && results[0].score !== undefined) {
                const confidence = Math.round((1 - results[0].score) * 100);

                if (confidence >= 60) {
                    return {
                        partner_id: results[0].item.id,
                        name: results[0].item.name,
                        tax_code: results[0].item.tax_code || undefined,
                        confidence,
                        match_type: 'name',
                    };
                }
            }
        }
    }

    return null;
}

// ==========================================
// CONFIRM INVOICE
// ==========================================

export async function confirmInvoice(input: ConfirmInvoiceInput): Promise<{
    invoice: Invoice;
    transaction?: { id: string; code: string };
    partner?: { id: string; code: string; name: string; is_new: boolean };
}> {
    const farmId = getCurrentFarmId();
    const context = getContext();

    // 1. Get invoice
    const invoice = await prismaBase.invoice.findFirst({
        where: {
            id: input.invoice_id,
            farm_id: farmId,
        },
    });

    if (!invoice) {
        throw new Error('Không tìm thấy hóa đơn');
    }

    if (invoice.status === 'CONFIRMED') {
        throw new Error('Hóa đơn đã được xác nhận');
    }

    return prismaBase.$transaction(async (tx) => {
        let partnerId = input.partner_id || invoice.matched_partner_id;
        let partnerInfo: { id: string; code: string; name: string; is_new: boolean } | undefined;

        // 2. Create partner if needed
        if (!partnerId && input.create_partner && input.supplier_name) {
            // Generate code
            const count = await tx.partner.count({
                where: { farm_id: farmId },
            });
            const code = `NCC${String(count + 1).padStart(4, '0')}`;

            const newPartner = await tx.partner.create({
                data: {
                    farm_id: farmId,
                    code,
                    name: input.supplier_name,
                    partner_type: 'VENDOR',
                    tax_code: input.supplier_tax_code || null,
                },
            });

            partnerId = newPartner.id;
            partnerInfo = {
                id: newPartner.id,
                code: newPartner.code,
                name: newPartner.name,
                is_new: true,
            };
        }

        // 3. Generate transaction code
        const today = new Date();
        const codeResult = await tx.$queryRaw<[{ code: string }]>`
      SELECT generate_transaction_code('EXPENSE', ${today}::timestamptz) as code
    `;
        const transactionCode = codeResult[0].code;

        // 4. Create transaction
        const totalAmount = input.total_amount || Number(invoice.total_amount) || 0;
        const taxAmount = input.tax_amount || Number(invoice.tax_amount) || 0;

        const transaction = await tx.transaction.create({
            data: {
                farm_id: farmId,
                trans_number: transactionCode,
                code: transactionCode,
                trans_type: 'EXPENSE',
                trans_date: input.invoice_date ? new Date(input.invoice_date) : today,
                partner_id: partnerId,
                amount: totalAmount - taxAmount,
                subtotal: totalAmount - taxAmount,
                tax_amount: taxAmount,
                discount_amount: 0,
                total_amount: totalAmount,
                paid_amount: input.paid_amount ?? 0,
                payment_status: (input.paid_amount ?? 0) >= totalAmount ? 'PAID' : 'PENDING',
                payment_method: (input.payment_method as PaymentMethod) || 'CASH',
                description: input.note || `Hóa đơn ${input.invoice_number || invoice.invoice_number || ''}`,
                created_by: context?.userId,
                items: {
                    create: [
                        {
                            description: `Hóa đơn ${input.invoice_number || invoice.invoice_number || 'OCR'}`,
                            quantity: 1,
                            unit: 'HĐ',
                            unit_price: totalAmount,
                            tax_rate: taxAmount > 0 ? (taxAmount / (totalAmount - taxAmount)) * 100 : 0,
                            tax_amount: taxAmount,
                            line_total: totalAmount,
                        },
                    ],
                },
            },
        });

        // 5. Update invoice
        const updatedInvoice = await tx.invoice.update({
            where: { id: invoice.id },
            data: {
                status: 'CONFIRMED',
                invoice_number: input.invoice_number || invoice.invoice_number,
                invoice_date: input.invoice_date ? new Date(input.invoice_date) : invoice.invoice_date,
                supplier_name: input.supplier_name || invoice.supplier_name,
                supplier_tax_code: input.supplier_tax_code || invoice.supplier_tax_code,
                total_amount: totalAmount,
                tax_amount: taxAmount,
                matched_partner_id: partnerId,
                transaction_id: transaction.id,
                confirmed_at: new Date(),
                confirmed_by: context?.userId,
            },
        });

        return {
            invoice: updatedInvoice as unknown as Invoice,
            transaction: {
                id: transaction.id,
                code: transaction.code || transactionCode,
            },
            partner: partnerInfo,
        };
    });
}

// ==========================================
// GET INVOICES
// ==========================================

export async function getInvoices(params: InvoiceListParams): Promise<{
    items: Invoice[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    summary: {
        total_pending: number;
        total_processed: number;
        total_confirmed: number;
        total_failed: number;
    };
}> {
    const farmId = getCurrentFarmId();
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
        farm_id: farmId,
    };

    if (params.status) {
        where.status = params.status;
    }

    if (params.date_from || params.date_to) {
        where.created_at = {};
        if (params.date_from) {
            where.created_at.gte = new Date(params.date_from);
        }
        if (params.date_to) {
            where.created_at.lte = new Date(params.date_to);
        }
    }

    if (params.search) {
        where.OR = [
            { invoice_number: { contains: params.search, mode: 'insensitive' } },
            { supplier_name: { contains: params.search, mode: 'insensitive' } },
        ];
    }

    const [items, total, statusCounts] = await Promise.all([
        prismaBase.invoice.findMany({
            where,
            orderBy: { [params.sort_by || 'created_at']: params.sort_order || 'desc' },
            skip,
            take: limit,
        }),
        prismaBase.invoice.count({ where }),
        prismaBase.invoice.groupBy({
            by: ['status'],
            where: { farm_id: farmId },
            _count: true,
        }),
    ]);

    const summary = {
        total_pending: 0,
        total_processed: 0,
        total_confirmed: 0,
        total_failed: 0,
    };

    for (const count of statusCounts) {
        switch (count.status) {
            case 'PENDING':
                summary.total_pending = count._count;
                break;
            case 'PROCESSED':
                summary.total_processed = count._count;
                break;
            case 'CONFIRMED':
                summary.total_confirmed = count._count;
                break;
            case 'FAILED':
                summary.total_failed = count._count;
                break;
        }
    }

    return {
        items: items as unknown as Invoice[],
        total,
        page,
        limit,
        hasMore: skip + items.length < total,
        summary,
    };
}

// ==========================================
// DELETE INVOICE
// ==========================================

export async function deleteInvoice(id: string): Promise<void> {
    const farmId = getCurrentFarmId();

    const invoice = await prismaBase.invoice.findFirst({
        where: { id, farm_id: farmId },
    });

    if (!invoice) {
        throw new Error('Không tìm thấy hóa đơn');
    }

    if (invoice.status === 'CONFIRMED') {
        throw new Error('Không thể xóa hóa đơn đã xác nhận');
    }

    // TODO: Delete image from R2 storage

    await prismaBase.invoice.delete({
        where: { id },
    });
}

// ==========================================
// RETRY OCR
// ==========================================

export async function retryOCR(id: string): Promise<UploadInvoiceResponse> {
    const farmId = getCurrentFarmId();

    const invoice = await prismaBase.invoice.findFirst({
        where: { id, farm_id: farmId },
    });

    if (!invoice) {
        throw new Error('Không tìm thấy hóa đơn');
    }

    if (invoice.status === 'CONFIRMED') {
        throw new Error('Không thể xử lý lại hóa đơn đã xác nhận');
    }

    if (invoice.retry_count >= 3) {
        throw new Error('Đã vượt quá số lần thử lại cho phép');
    }

    // Re-process with stored image
    // In production, get image from R2 storage
    if (!invoice.image_url) {
        throw new Error('Không có ảnh để xử lý lại');
    }

    // Update invoice status
    await prismaBase.invoice.update({
        where: { id },
        data: {
            status: 'PENDING',
            error_message: null,
            retry_count: { increment: 1 },
        },
    });

    // This is simplified - in production, you'd fetch the actual image from storage
    return {
        id: invoice.id,
        status: 'PENDING',
        message: 'Đang xử lý lại OCR',
    };
}
