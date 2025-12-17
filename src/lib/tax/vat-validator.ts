// src/lib/tax/vat-validator.ts
// VAT Validation Service - Task 3
// Validates invoices against VAT rules and saves results to Transaction

import { prisma } from '@/lib/prisma';
import { SupplierStatus } from '@prisma/client';
import {
    VATValidationInput,
    VATValidationResult,
    VATValidationError,
    VATValidationWarning,
    VATIssuesReport,
    VATIssueItem,
} from '@/types/vat-validation';
import { evaluateRules, getRuleValue } from './engine';
import { EvaluationContext } from '@/types/tax-engine';
import { lookupTaxCode, matchCompanyName } from './mst-lookup';

// ==========================================
// MAIN VALIDATION FUNCTION
// ==========================================

export async function validateVATDeduction(
    farmId: string,
    input: VATValidationInput
): Promise<VATValidationResult> {
    const errors: VATValidationError[] = [];
    const warnings: VATValidationWarning[] = [];
    const appliedRules: string[] = [];

    let isDeductible = true;
    let deductibleAmount = input.vat_amount;
    let nonDeductibleAmount = 0;
    let rejectionCode: string | undefined;
    let rejectionReason: string | undefined;
    let isPartial = false;
    let deductionRatio = 1;

    // MST lookup result
    let mstLookup: VATValidationResult['mst_lookup'] | undefined;

    // ==========================================
    // 1. BASIC INVOICE INFO CHECK
    // ==========================================

    if (!input.invoice_number) {
        errors.push({
            code: 'MISSING_INVOICE_NUMBER',
            rule_code: 'VAT_INVOICE_INFO',
            message: 'Thiếu số hóa đơn',
            fix_suggestion: 'Nhập số hóa đơn',
        });
        isDeductible = false;
        rejectionCode = 'VAT_INVOICE_INFO';
        rejectionReason = 'Thiếu số hóa đơn';
    }

    // ==========================================
    // 2. MST VALIDATION (VAT_MISSING_MST, VAT_INFO_CHECK)
    // ==========================================

    if (!input.supplier_tax_code) {
        errors.push({
            code: 'MISSING_SUPPLIER_MST',
            rule_code: 'VAT_MISSING_MST',
            message: 'Thiếu MST nhà cung cấp - Không được khấu trừ VAT',
            reference: 'TT219/2013/TT-BTC',
            fix_suggestion: 'Cập nhật MST cho nhà cung cấp',
        });
        isDeductible = false;
        rejectionCode = 'VAT_MISSING_MST';
        rejectionReason = 'Thiếu MST nhà cung cấp';
        appliedRules.push('VAT_MISSING_MST');
    } else if (!input.skip_mst_lookup) {
        // Try MST lookup via VietQR
        const lookupResult = await lookupTaxCode(input.supplier_tax_code);

        if (lookupResult.success && lookupResult.data) {
            mstLookup = {
                found: true,
                registered_name: lookupResult.data.name,
            };

            // Check name match if supplier_name provided
            if (input.supplier_name) {
                const nameMatch = matchCompanyName(input.supplier_name, lookupResult.data.name);
                mstLookup.name_match = nameMatch.match;
                mstLookup.name_match_score = nameMatch.score;

                if (!nameMatch.match && nameMatch.score < 50) {
                    errors.push({
                        code: 'NAME_MISMATCH',
                        rule_code: 'VAT_INFO_CHECK',
                        message: `Tên NCC không khớp với đăng ký (${nameMatch.score}%). Tên đăng ký: ${lookupResult.data.name}`,
                        reference: 'TT219/2013/TT-BTC',
                        fix_suggestion: 'Kiểm tra lại tên nhà cung cấp',
                    });
                    isDeductible = false;
                    rejectionCode = 'VAT_INFO_CHECK';
                    rejectionReason = 'Tên NCC không khớp MST';
                    appliedRules.push('VAT_INFO_CHECK');
                } else if (!nameMatch.match) {
                    warnings.push({
                        code: 'NAME_PARTIAL_MATCH',
                        rule_code: 'VAT_INFO_CHECK',
                        message: `Tên NCC khớp ${nameMatch.score}% với đăng ký`,
                    });
                }
            }
        } else {
            // MST not found in VietQR - allow manual (70% coverage)
            mstLookup = { found: false };
            warnings.push({
                code: 'MST_NOT_IN_DATABASE',
                rule_code: 'VAT_INFO_CHECK',
                message: 'Không tra cứu được MST. Vui lòng kiểm tra thủ công.',
            });
        }
    }

    // ==========================================
    // 3. SUPPLIER STATUS CHECK (VAT_SUPPLIER_STATUS)
    // ==========================================

    if (input.supplier_status) {
        const badStatuses: SupplierStatus[] = ['SUSPENDED', 'CLOSED', 'BANKRUPT'];
        if (badStatuses.includes(input.supplier_status)) {
            errors.push({
                code: 'SUPPLIER_INACTIVE',
                rule_code: 'VAT_SUPPLIER_STATUS',
                message: `NCC đã ${input.supplier_status === 'SUSPENDED' ? 'đình chỉ' : input.supplier_status === 'CLOSED' ? 'đóng MST' : 'phá sản'} - Không được khấu trừ VAT`,
                reference: 'TT219/2013/TT-BTC',
            });
            isDeductible = false;
            rejectionCode = 'VAT_SUPPLIER_STATUS';
            rejectionReason = `NCC ${input.supplier_status}`;
            appliedRules.push('VAT_SUPPLIER_STATUS');
        }
    }

    // ==========================================
    // 4. CASH PAYMENT LIMIT (VAT_NON_CASH)
    // ==========================================

    try {
        const cashLimit = await getRuleValue(farmId, 'VAT_NON_CASH');

        if (input.total_amount >= cashLimit) {
            const isCash = input.payment_method === 'CASH' && !input.has_bank_payment;
            if (isCash) {
                errors.push({
                    code: 'CASH_OVER_LIMIT',
                    rule_code: 'VAT_NON_CASH',
                    message: `HĐ >= ${(cashLimit / 1000000).toFixed(0)} triệu thanh toán tiền mặt - Không được khấu trừ VAT`,
                    reference: 'TT219/2013/TT-BTC Điều 15',
                    fix_suggestion: 'Thanh toán qua ngân hàng',
                });
                isDeductible = false;
                rejectionCode = 'VAT_NON_CASH';
                rejectionReason = 'Thanh toán tiền mặt >= 20 triệu';
                appliedRules.push('VAT_NON_CASH');
            }
        }
    } catch {
        // Rule not found - skip
    }

    // ==========================================
    // 5. NON-BUSINESS EXPENSE (VAT_NON_BIZ)
    // ==========================================

    if (input.usage_purpose === 'PERSONAL' || input.usage_purpose === 'WELFARE_FUND') {
        errors.push({
            code: 'NON_BUSINESS_EXPENSE',
            rule_code: 'VAT_NON_BIZ',
            message: 'Chi phí cá nhân/phúc lợi - Không được khấu trừ VAT',
            reference: 'TT219/2013/TT-BTC',
        });
        isDeductible = false;
        rejectionCode = 'VAT_NON_BIZ';
        rejectionReason = 'Chi phí không phục vụ SXKD';
        appliedRules.push('VAT_NON_BIZ');
    }

    // ==========================================
    // 6. VEHICLE UNDER 9 SEATS (VAT_VEHICLE_9SEATS)
    // ==========================================

    if (input.is_vehicle && input.vehicle_type === 'CAR') {
        if (input.vehicle_seats && input.vehicle_seats < 9 && !input.is_transport_biz) {
            errors.push({
                code: 'VEHICLE_UNDER_9_SEATS',
                rule_code: 'VAT_VEHICLE_9SEATS',
                message: 'Xe ô tô < 9 chỗ không được khấu trừ VAT (trừ DN vận tải)',
                reference: 'TT96/2015/TT-BTC',
            });
            isDeductible = false;
            rejectionCode = 'VAT_VEHICLE_9SEATS';
            rejectionReason = 'Xe < 9 chỗ không phục vụ vận tải';
            appliedRules.push('VAT_VEHICLE_9SEATS');
        }
    }

    // ==========================================
    // 7. CAR LUXURY CAP (VAT_CAR_LUXURY) - PARTIAL
    // ==========================================

    if (input.asset_type === 'CAR_UNDER_9_SEATS' && !input.is_transport_biz && isDeductible) {
        try {
            const carCap = await getRuleValue(farmId, 'VAT_CAR_LUXURY');

            if (input.goods_value > carCap) {
                // Apply PARTIAL deduction
                deductionRatio = carCap / input.goods_value;
                deductibleAmount = Math.round(input.vat_amount * deductionRatio);
                nonDeductibleAmount = input.vat_amount - deductibleAmount;
                isPartial = true;

                warnings.push({
                    code: 'CAR_LUXURY_CAP',
                    rule_code: 'VAT_CAR_LUXURY',
                    message: `Xe > ${(carCap / 1000000000).toFixed(1)} tỷ - Chỉ khấu trừ ${Math.round(deductionRatio * 100)}% VAT`,
                    exceeded_amount: nonDeductibleAmount,
                });
                appliedRules.push('VAT_CAR_LUXURY');
            }
        } catch {
            // Rule not found
        }
    }

    // ==========================================
    // 8. INVOICE AGE (VAT_INVOICE_AGE)
    // ==========================================

    const invoiceDate = new Date(input.invoice_date);
    const now = new Date();
    const yearsDiff = (now.getTime() - invoiceDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

    try {
        const maxAge = await getRuleValue(farmId, 'VAT_INVOICE_AGE');
        if (yearsDiff > maxAge) {
            errors.push({
                code: 'INVOICE_EXPIRED',
                rule_code: 'VAT_INVOICE_AGE',
                message: `Hóa đơn quá ${maxAge} năm - Không được khấu trừ`,
                reference: 'Luật thuế GTGT',
            });
            isDeductible = false;
            rejectionCode = 'VAT_INVOICE_AGE';
            rejectionReason = `Hóa đôn quá ${maxAge} năm`;
            appliedRules.push('VAT_INVOICE_AGE');
        }
    } catch {
        // Default 5 years check
        if (yearsDiff > 5) {
            errors.push({
                code: 'INVOICE_EXPIRED',
                rule_code: 'VAT_INVOICE_AGE',
                message: 'Hóa đơn quá 5 năm - Không được khấu trừ',
                reference: 'Luật thuế GTGT',
            });
            isDeductible = false;
            rejectionCode = 'VAT_INVOICE_AGE';
            rejectionReason = 'Hóa đơn quá 5 năm';
            appliedRules.push('VAT_INVOICE_AGE');
        }
    }

    // ==========================================
    // CALCULATE FINAL AMOUNTS
    // ==========================================

    if (!isDeductible && !isPartial) {
        nonDeductibleAmount = input.vat_amount;
        deductibleAmount = 0;
    }

    // ==========================================
    // BUILD SUMMARY
    // ==========================================

    let summary = '';
    if (isDeductible && !isPartial && warnings.length === 0) {
        summary = `✅ Được khấu trừ ${deductibleAmount.toLocaleString('vi-VN')}đ`;
    } else if (isDeductible && !isPartial && warnings.length > 0) {
        summary = `✅ Được khấu trừ ${deductibleAmount.toLocaleString('vi-VN')}đ (${warnings.length} cảnh báo)`;
    } else if (isPartial) {
        summary = `⚠️ Khấu trừ một phần: ${deductibleAmount.toLocaleString('vi-VN')}đ (${Math.round(deductionRatio * 100)}%)`;
    } else {
        summary = `❌ Không khấu trừ: ${errors[0]?.message || 'Vi phạm quy định'}`;
    }

    // ==========================================
    // SAVE TO TRANSACTION (if requested)
    // ==========================================

    if (input.save_result && input.transaction_id) {
        await prisma.transaction.update({
            where: { id: input.transaction_id },
            data: {
                vat_deductible: isDeductible || isPartial,
                vat_rejection_code: rejectionCode,
                vat_rejection_reason: rejectionReason,
                vat_deductible_amount: isPartial ? deductibleAmount : (isDeductible ? input.vat_amount : 0),
            },
        });
    }

    return {
        is_deductible: isDeductible || isPartial,
        original_vat_amount: input.vat_amount,
        deductible_amount: deductibleAmount,
        non_deductible_amount: nonDeductibleAmount,
        rejection_code: rejectionCode,
        rejection_reason: rejectionReason,
        is_partial: isPartial,
        deduction_ratio: isPartial ? deductionRatio : undefined,
        errors,
        warnings,
        applied_rules: appliedRules,
        mst_lookup: mstLookup,
        summary,
    };
}

// ==========================================
// BATCH VALIDATION
// ==========================================

export async function validateVATBatch(
    farmId: string,
    inputs: VATValidationInput[]
): Promise<VATValidationResult[]> {
    const results: VATValidationResult[] = [];

    for (const input of inputs) {
        const result = await validateVATDeduction(farmId, input);
        results.push(result);
    }

    return results;
}

// ==========================================
// VAT ISSUES REPORT
// ==========================================

export async function getVATIssuesReport(
    farmId: string,
    fromDate: string,
    toDate: string
): Promise<VATIssuesReport> {
    // Get purchase transactions for the period
    const transactions = await prisma.transaction.findMany({
        where: {
            farm_id: farmId,
            trans_type: 'PURCHASE',
            trans_date: {
                gte: new Date(fromDate),
                lte: new Date(toDate),
            },
            deleted_at: null,
        },
        include: {
            partner: true,
        },
        orderBy: { trans_date: 'desc' },
    });

    const issues: VATIssueItem[] = [];
    let totalVAT = 0;
    let deductibleVAT = 0;
    let nonDeductibleVAT = 0;
    let deductibleCount = 0;
    let nonDeductibleCount = 0;
    let partialCount = 0;
    let warningCount = 0;

    for (const trans of transactions) {
        const vatAmount = Number(trans.vat_amount || 0);
        totalVAT += vatAmount;

        // Build validation input from transaction
        const validationInput: VATValidationInput = {
            transaction_id: trans.id,
            invoice_number: (trans as any).invoice_number ?? undefined,
            invoice_date: trans.trans_date,
            supplier_tax_code: trans.partner?.tax_code ?? undefined,
            supplier_name: trans.partner?.name ?? trans.partner_name ?? undefined,
            supplier_status: (trans.partner?.supplier_status ?? undefined) as any,
            goods_value: Number(trans.subtotal || trans.amount),
            vat_rate: vatAmount > 0 ? (vatAmount / Number(trans.subtotal || trans.amount)) * 100 : 0,
            vat_amount: vatAmount,
            total_amount: Number(trans.total_amount),
            payment_method: trans.payment_method,
            usage_purpose: (trans.usage_purpose ?? undefined) as any,
            skip_mst_lookup: true, // Skip for report performance
        };

        const result = await validateVATDeduction(farmId, validationInput);

        if (result.is_deductible && !result.is_partial && result.warnings.length === 0) {
            deductibleCount++;
            deductibleVAT += vatAmount;
        } else if (result.is_partial) {
            partialCount++;
            deductibleVAT += result.deductible_amount;
            nonDeductibleVAT += result.non_deductible_amount;

            issues.push({
                transaction_id: trans.id,
                invoice_number: (trans as any).invoice_number || trans.code,
                invoice_date: trans.trans_date.toISOString().split('T')[0],
                supplier_name: trans.partner?.name || trans.partner_name || 'N/A',
                supplier_tax_code: trans.partner?.tax_code || undefined,
                total_amount: Number(trans.total_amount),
                vat_amount: vatAmount,
                deductible_amount: result.deductible_amount,
                is_deductible: true,
                is_partial: true,
                rejection_code: result.rejection_code,
                errors: [],
                warnings: result.warnings.map(w => w.message),
                fix_link: `/mua-hang/${trans.id}`,
            });
        } else if (result.is_deductible && result.warnings.length > 0) {
            deductibleCount++;
            deductibleVAT += vatAmount;
            warningCount++;

            issues.push({
                transaction_id: trans.id,
                invoice_number: (trans as any).invoice_number || trans.code,
                invoice_date: trans.trans_date.toISOString().split('T')[0],
                supplier_name: trans.partner?.name || trans.partner_name || 'N/A',
                supplier_tax_code: trans.partner?.tax_code || undefined,
                total_amount: Number(trans.total_amount),
                vat_amount: vatAmount,
                deductible_amount: vatAmount,
                is_deductible: true,
                is_partial: false,
                errors: [],
                warnings: result.warnings.map(w => w.message),
                fix_link: `/mua-hang/${trans.id}`,
            });
        } else {
            nonDeductibleCount++;
            nonDeductibleVAT += vatAmount;

            issues.push({
                transaction_id: trans.id,
                invoice_number: (trans as any).invoice_number || trans.code,
                invoice_date: trans.trans_date.toISOString().split('T')[0],
                supplier_name: trans.partner?.name || trans.partner_name || 'N/A',
                supplier_tax_code: trans.partner?.tax_code || undefined,
                total_amount: Number(trans.total_amount),
                vat_amount: vatAmount,
                deductible_amount: 0,
                is_deductible: false,
                is_partial: false,
                rejection_code: result.rejection_code,
                errors: result.errors.map(e => e.message),
                warnings: result.warnings.map(w => w.message),
                fix_link: `/mua-hang/${trans.id}`,
            });
        }
    }

    return {
        period: {
            from_date: fromDate,
            to_date: toDate,
        },
        summary: {
            total_invoices: transactions.length,
            deductible_count: deductibleCount,
            non_deductible_count: nonDeductibleCount,
            partial_count: partialCount,
            warning_count: warningCount,
            total_vat: totalVAT,
            deductible_vat: deductibleVAT,
            non_deductible_vat: nonDeductibleVAT,
        },
        issues,
    };
}

// ==========================================
// VALIDATE AND SAVE (for use when creating/updating transaction)
// ==========================================

export async function validateAndSaveVAT(
    farmId: string,
    transactionId: string,
    input: Omit<VATValidationInput, 'transaction_id' | 'save_result'>
): Promise<VATValidationResult> {
    return validateVATDeduction(farmId, {
        ...input,
        transaction_id: transactionId,
        save_result: true,
    });
}
