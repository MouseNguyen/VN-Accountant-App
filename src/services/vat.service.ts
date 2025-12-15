// src/services/vat.service.ts
// VAT Declaration Service (Task 8)

import prisma from '@/lib/prisma';
import { roundMoney } from '@/lib/decimal';
import { generateVATXML } from '@/lib/vat/xml-generator';
import type {
    VATDeclaration,
    VATDeclarationListParams,
    VATDeclarationListResponse,
    CreateVATDeclarationInput,
    CalculateVATResult,
    VATInvoiceDetail,
    TaxCodeValidation,
} from '@/types/vat';

// Helper to safely convert Prisma Decimal to number
const toNum = (val: any): number => {
    if (val === null || val === undefined) return 0;
    const n = Number(val);
    return isNaN(n) ? 0 : n;
};

// ==========================================
// GET VAT DECLARATIONS
// ==========================================

export async function getVATDeclarations(
    farmId: string,
    params: VATDeclarationListParams
): Promise<VATDeclarationListResponse> {
    const { page = 1, limit = 20, year, status } = params;
    const skip = (page - 1) * limit;

    const where: any = { farm_id: farmId };

    if (year) {
        where.period_code = { startsWith: String(year) };
    }
    if (status) {
        where.status = status;
    }

    const [items, total] = await Promise.all([
        prisma.vATDeclaration.findMany({
            where,
            orderBy: { period_code: 'desc' },
            skip,
            take: limit,
        }),
        prisma.vATDeclaration.count({ where }),
    ]);

    // Summary
    const summary = await prisma.vATDeclaration.aggregate({
        where: { farm_id: farmId },
        _sum: { payable_vat: true, carried_forward: true },
    });

    return {
        items: items.map(formatVATDeclaration),
        total,
        page,
        limit,
        summary: {
            total_payable: roundMoney(Number(summary._sum.payable_vat || 0)),
            total_carried: roundMoney(Number(summary._sum.carried_forward || 0)),
        },
    };
}

// ==========================================
// GET SINGLE DECLARATION
// ==========================================

export async function getVATDeclaration(
    farmId: string,
    id: string
): Promise<VATDeclaration | null> {
    const declaration = await prisma.vATDeclaration.findFirst({
        where: { id, farm_id: farmId },
    });

    return declaration ? formatVATDeclaration(declaration) : null;
}

// ==========================================
// CREATE VAT DECLARATION
// ==========================================

export async function createVATDeclaration(
    farmId: string,
    userId: string,
    input: CreateVATDeclarationInput
): Promise<VATDeclaration> {
    // Parse period
    const { from_date, to_date } = parsePeriod(input.period_type, input.period_code);

    // Check duplicate
    const existing = await prisma.vATDeclaration.findFirst({
        where: { farm_id: farmId, period_code: input.period_code },
    });

    if (existing) {
        throw new Error(`Đã có tờ khai cho kỳ ${input.period_code}`);
    }

    // Create declaration
    const declaration = await prisma.vATDeclaration.create({
        data: {
            farm_id: farmId,
            period_type: input.period_type,
            period_code: input.period_code,
            from_date,
            to_date,
            status: 'DRAFT',
            notes: input.notes,
            created_by: userId,
        },
    });

    return formatVATDeclaration(declaration);
}

// ==========================================
// CALCULATE VAT
// ==========================================

export async function calculateVATDeclaration(
    farmId: string,
    declarationId: string
): Promise<CalculateVATResult> {
    const declaration = await prisma.vATDeclaration.findFirst({
        where: { id: declarationId, farm_id: farmId },
    });

    if (!declaration) throw new Error('Tờ khai không tồn tại');
    if (declaration.status !== 'DRAFT' && declaration.status !== 'CALCULATED') {
        throw new Error('Chỉ có thể tính lại tờ khai nháp hoặc đã tính');
    }

    const fromDate = declaration.from_date;
    const toDate = declaration.to_date;

    // 1. Lấy hóa đơn mua vào (Input VAT) - PURCHASE or EXPENSE transactions
    const purchaseTransactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            trans_type: { in: ['PURCHASE', 'EXPENSE'] },
            trans_date: { gte: fromDate, lte: toDate },
            payment_status: { not: 'CANCELLED' },
            deleted_at: null,
        },
        include: {
            partner: { select: { id: true, name: true, tax_code: true, address: true } },
            items: true,
        },
    }) as any[];  // Cast to any[] to avoid TS strict checking on optional fields

    const inputInvoices: VATInvoiceDetail[] = [];
    const inputByRate: Record<number, { amount: number; tax: number }> = {};
    let totalInputAmount = 0;
    let totalInputTax = 0;
    const issues: CalculateVATResult['issues'] = [];

    for (const trans of purchaseTransactions) {
        // Try items first, then fallback to header-level tax
        // Use toNum() to safely convert Prisma Decimal to number
        let goodsValue = (trans.items || []).reduce((sum: number, i: any) => sum + toNum(i.sub_total) + toNum(i.line_total), 0);
        let vatAmount = (trans.items || []).reduce((sum: number, i: any) => sum + toNum(i.vat_amount) + toNum(i.tax_amount), 0);
        let vatRate = trans.items?.[0] ? toNum(trans.items[0].vat_rate) || toNum(trans.items[0].tax_rate) : 0;

        // Fallback to header-level if items have no data
        if (vatAmount === 0) {
            vatAmount = toNum(trans.vat_amount) || toNum(trans.tax_amount);
        }
        if (goodsValue === 0) {
            goodsValue = toNum(trans.subtotal) || toNum(trans.amount);
        }
        if (vatRate === 0 && goodsValue > 0 && vatAmount > 0) {
            vatRate = Math.round((vatAmount / goodsValue) * 100);
        }

        // Skip if no VAT
        if (vatAmount === 0) continue;

        let hasIssues = false;
        let issueReason = '';

        // Validate
        if (!trans.partner?.tax_code) {
            hasIssues = true;
            issueReason = 'Thiếu MST nhà cung cấp';
            issues.push({
                invoice_id: trans.id,
                invoice_number: trans.invoice_number || trans.code || trans.trans_number,
                type: 'MISSING_TAX_CODE',
                message: `HĐ ${trans.code || trans.trans_number}: Thiếu MST nhà cung cấp`,
            });
        }

        if (!trans.invoice_number) {
            issues.push({
                invoice_id: trans.id,
                invoice_number: trans.code || trans.trans_number,
                type: 'MISSING_INVOICE_NUMBER',
                message: `HĐ ${trans.code || trans.trans_number}: Thiếu số hóa đơn`,
            });
        }

        inputInvoices.push({
            id: trans.id,
            invoice_number: trans.invoice_number || trans.code || trans.trans_number,
            invoice_date: trans.trans_date.toISOString().split('T')[0],
            invoice_serial: trans.invoice_serial || undefined,
            partner_tax_code: trans.partner?.tax_code || '',
            partner_name: trans.partner?.name || trans.partner_name || '',
            partner_address: trans.partner?.address || undefined,
            goods_value: goodsValue,
            vat_rate: vatRate,
            vat_amount: vatAmount,
            total_amount: Number(trans.total_amount),
            type: 'INPUT',
            is_deductible: !hasIssues && vatAmount > 0,
            has_issues: hasIssues,
            issue_reason: issueReason || undefined,
        });

        // Aggregate (only deductible)
        if (!hasIssues) {
            totalInputAmount += goodsValue;
            totalInputTax += vatAmount;

            if (!inputByRate[vatRate]) inputByRate[vatRate] = { amount: 0, tax: 0 };
            inputByRate[vatRate].amount += goodsValue;
            inputByRate[vatRate].tax += vatAmount;
        }
    }

    // 2. Lấy hóa đơn bán ra (Output VAT) - SALE or INCOME transactions
    const saleTransactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            trans_type: { in: ['SALE', 'INCOME'] },
            trans_date: { gte: fromDate, lte: toDate },
            payment_status: { not: 'CANCELLED' },
            deleted_at: null,
        },
        include: {
            partner: { select: { id: true, name: true, tax_code: true, address: true } },
            items: true,
        },
    }) as any[];  // Cast to any[] to avoid TS strict checking on optional fields

    const outputInvoices: VATInvoiceDetail[] = [];
    const outputByRate: Record<number, { amount: number; tax: number }> = {};
    let totalOutputAmount = 0;
    let totalOutputTax = 0;

    for (const trans of saleTransactions) {
        // Try items first, then fallback to header-level tax
        // Use toNum() to safely convert Prisma Decimal to number
        let goodsValue = (trans.items || []).reduce((sum: number, i: any) => sum + toNum(i.sub_total) + toNum(i.line_total), 0);
        let vatAmount = (trans.items || []).reduce((sum: number, i: any) => sum + toNum(i.vat_amount) + toNum(i.tax_amount), 0);
        let vatRate = trans.items?.[0] ? toNum(trans.items[0].vat_rate) || toNum(trans.items[0].tax_rate) : 0;

        // Fallback to header-level if items have no data
        if (vatAmount === 0) {
            vatAmount = toNum(trans.vat_amount) || toNum(trans.tax_amount);
        }
        if (goodsValue === 0) {
            goodsValue = toNum(trans.subtotal) || toNum(trans.amount);
        }
        if (vatRate === 0 && goodsValue > 0 && vatAmount > 0) {
            vatRate = Math.round((vatAmount / goodsValue) * 100);
        }

        // Skip if no VAT
        if (vatAmount === 0) continue;

        outputInvoices.push({
            id: trans.id,
            invoice_number: trans.invoice_number || trans.code || trans.trans_number,
            invoice_date: trans.trans_date.toISOString().split('T')[0],
            invoice_serial: trans.invoice_serial || undefined,
            partner_tax_code: trans.partner?.tax_code || '',
            partner_name: trans.partner?.name || trans.partner_name || '',
            partner_address: trans.partner?.address || undefined,
            goods_value: goodsValue,
            vat_rate: vatRate,
            vat_amount: vatAmount,
            total_amount: Number(trans.total_amount),
            type: 'OUTPUT',
            is_deductible: true,
            has_issues: false,
        });

        totalOutputAmount += goodsValue;
        totalOutputTax += vatAmount;

        if (!outputByRate[vatRate]) outputByRate[vatRate] = { amount: 0, tax: 0 };
        outputByRate[vatRate].amount += goodsValue;
        outputByRate[vatRate].tax += vatAmount;
    }

    // 3. Calculate payable/carried
    const payableVAT = totalOutputTax - totalInputTax;
    const carriedForward = payableVAT < 0 ? Math.abs(payableVAT) : 0;

    // 4. Update declaration
    await prisma.vATDeclaration.update({
        where: { id: declarationId },
        data: {
            input_vat_count: inputInvoices.length,
            input_vat_amount: totalInputAmount,
            input_vat_tax: totalInputTax,
            output_vat_count: outputInvoices.length,
            output_vat_amount: totalOutputAmount,
            output_vat_tax: totalOutputTax,
            payable_vat: Math.max(0, payableVAT),
            carried_forward: carriedForward,
            status: 'CALCULATED',
        },
    });

    return {
        period: {
            from_date: fromDate.toISOString().split('T')[0],
            to_date: toDate.toISOString().split('T')[0],
        },
        input_invoices: inputInvoices,
        output_invoices: outputInvoices,
        input_vat: {
            count: inputInvoices.length,
            amount: roundMoney(totalInputAmount),
            tax: roundMoney(totalInputTax),
            by_rate: Object.entries(inputByRate).map(([rate, data]) => ({
                rate: Number(rate),
                amount: roundMoney(data.amount),
                tax: roundMoney(data.tax),
            })),
        },
        output_vat: {
            count: outputInvoices.length,
            amount: roundMoney(totalOutputAmount),
            tax: roundMoney(totalOutputTax),
            by_rate: Object.entries(outputByRate).map(([rate, data]) => ({
                rate: Number(rate),
                amount: roundMoney(data.amount),
                tax: roundMoney(data.tax),
            })),
        },
        payable_vat: roundMoney(Math.max(0, payableVAT)),
        carried_forward: roundMoney(carriedForward),
        issues,
    };
}

// ==========================================
// SUBMIT DECLARATION
// ==========================================

export async function submitVATDeclaration(
    farmId: string,
    declarationId: string,
    userId: string
): Promise<VATDeclaration> {
    const declaration = await prisma.vATDeclaration.findFirst({
        where: { id: declarationId, farm_id: farmId },
    });

    if (!declaration) throw new Error('Tờ khai không tồn tại');
    if (declaration.status === 'SUBMITTED' || declaration.status === 'APPROVED') {
        throw new Error('Tờ khai đã được nộp');
    }
    if (declaration.status === 'DRAFT') {
        throw new Error('Vui lòng tính thuế trước khi nộp');
    }

    const updated = await prisma.vATDeclaration.update({
        where: { id: declarationId },
        data: {
            status: 'SUBMITTED',
            submitted_at: new Date(),
            submitted_by: userId,
        },
    });

    return formatVATDeclaration(updated);
}

// ==========================================
// GENERATE XML
// ==========================================

export async function generateVATDeclarationXML(
    farmId: string,
    declarationId: string
): Promise<string> {
    const declaration = await prisma.vATDeclaration.findFirst({
        where: { id: declarationId, farm_id: farmId },
    });

    if (!declaration) throw new Error('Tờ khai không tồn tại');

    const farm = await prisma.farm.findUnique({
        where: { id: farmId },
        select: { name: true, tax_code: true, address: true, phone: true },
    });

    // Get invoices for XML
    const result = await calculateVATDeclaration(farmId, declarationId);

    const xmlContent = generateVATXML({
        taxCode: farm?.tax_code || '',
        companyName: farm?.name || '',
        address: farm?.address || '',
        phone: farm?.phone || '',
        period: {
            type: declaration.period_type,
            code: declaration.period_code,
            from: declaration.from_date,
            to: declaration.to_date,
        },
        inputVAT: {
            amount: Number(declaration.input_vat_amount),
            tax: Number(declaration.input_vat_tax),
        },
        outputVAT: {
            amount: Number(declaration.output_vat_amount),
            tax: Number(declaration.output_vat_tax),
        },
        payableVAT: Number(declaration.payable_vat),
        carriedForward: Number(declaration.carried_forward),
        inputInvoices: result.input_invoices,
        outputInvoices: result.output_invoices,
    });

    // Save XML
    await prisma.vATDeclaration.update({
        where: { id: declarationId },
        data: {
            xml_content: xmlContent,
            xml_generated_at: new Date(),
        },
    });

    return xmlContent;
}

// ==========================================
// VALIDATE TAX CODE
// ==========================================

export async function validateTaxCode(taxCode: string): Promise<TaxCodeValidation> {
    // Algorithm to validate Vietnamese tax code
    // Format: 10 digits or 10 digits + "-" + 3 digits

    const cleanCode = taxCode.replace(/-/g, '');

    if (cleanCode.length !== 10 && cleanCode.length !== 13) {
        return { tax_code: taxCode, is_valid: false, error: 'Độ dài MST không hợp lệ' };
    }

    // Checksum validation (digit 10)
    const weights = [31, 29, 23, 19, 17, 13, 7, 5, 3];
    let sum = 0;

    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleanCode[i]) * weights[i];
    }

    const checkDigit = 10 - (sum % 10);
    const expectedCheckDigit = checkDigit === 10 ? 0 : checkDigit;

    if (parseInt(cleanCode[9]) !== expectedCheckDigit) {
        return { tax_code: taxCode, is_valid: false, error: 'Số kiểm tra MST không đúng' };
    }

    // TODO: Call external API to get company info
    // For now, just return valid
    return {
        tax_code: taxCode,
        is_valid: true,
        status: 'ACTIVE',
    };
}

// ==========================================
// DELETE DECLARATION
// ==========================================

export async function deleteVATDeclaration(
    farmId: string,
    declarationId: string
): Promise<void> {
    const declaration = await prisma.vATDeclaration.findFirst({
        where: { id: declarationId, farm_id: farmId },
    });

    if (!declaration) throw new Error('Tờ khai không tồn tại');
    if (declaration.status === 'SUBMITTED' || declaration.status === 'APPROVED') {
        throw new Error('Không thể xóa tờ khai đã nộp');
    }

    await prisma.vATDeclaration.delete({
        where: { id: declarationId },
    });
}

// ==========================================
// HELPERS
// ==========================================

function parsePeriod(type: string, code: string): { from_date: Date; to_date: Date } {
    if (type === 'MONTHLY') {
        // code = "2024-12"
        const [year, month] = code.split('-').map(Number);
        const from_date = new Date(year, month - 1, 1);
        const to_date = new Date(year, month, 0);  // Last day of month
        return { from_date, to_date };
    } else {
        // code = "2024-Q4"
        const year = parseInt(code.slice(0, 4));
        const quarter = parseInt(code.slice(-1));
        const startMonth = (quarter - 1) * 3;
        const from_date = new Date(year, startMonth, 1);
        const to_date = new Date(year, startMonth + 3, 0);
        return { from_date, to_date };
    }
}

function formatVATDeclaration(d: any): VATDeclaration {
    return {
        id: d.id,
        farm_id: d.farm_id,
        period_type: d.period_type,
        period_code: d.period_code,
        from_date: d.from_date.toISOString().split('T')[0],
        to_date: d.to_date.toISOString().split('T')[0],
        input_vat: {
            count: d.input_vat_count,
            amount: Number(d.input_vat_amount),
            tax: Number(d.input_vat_tax),
        },
        output_vat: {
            count: d.output_vat_count,
            amount: Number(d.output_vat_amount),
            tax: Number(d.output_vat_tax),
        },
        payable_vat: Number(d.payable_vat),
        carried_forward: Number(d.carried_forward),
        adjustment_amount: Number(d.adjustment_amount),
        adjustment_reason: d.adjustment_reason,
        xml_content: d.xml_content,
        xml_file_url: d.xml_file_url,
        xml_generated_at: d.xml_generated_at?.toISOString(),
        status: d.status,
        submitted_at: d.submitted_at?.toISOString(),
        submitted_by: d.submitted_by,
        submission_ref: d.submission_ref,
        notes: d.notes,
        created_at: d.created_at.toISOString(),
        updated_at: d.updated_at.toISOString(),
    };
}
