// src/services/asset.service.ts
// Fixed Assets Management Service

import { prisma } from '@/lib/prisma';
import { AssetCategory, AssetStatus, DepreciationMethod, Prisma } from '@prisma/client';
import {
    CreateAssetInput,
    UpdateAssetInput,
    DisposeAssetInput,
    AssetDetail,
    AssetSummary,
    DepreciationScheduleRow,
    DepreciationResult,
    AssetFilters,
    PaginatedAssets,
} from '@/types/asset';
import {
    getDefaultUsefulLife,
    validateUsefulLife,
    calculateMonthlyDepreciationAmount,
    getCategoryLabel,
    getStatusLabel,
    getMonthsDifference,
    getDeductibleValue,
    VEHICLE_DEPRECIATION_CAP,
} from '@/lib/assets/depreciation-constants';
import Decimal from 'decimal.js';

// ==========================================
// CREATE ASSET
// ==========================================

export async function createAsset(
    farmId: string,
    input: CreateAssetInput
): Promise<AssetDetail> {
    // Auto-generate code if not provided
    let code = input.code;
    if (!code) {
        const count = await prisma.asset.count({ where: { farm_id: farmId } });
        code = `TSCD-${String(count + 1).padStart(4, '0')}`;
    }

    // Check for duplicate code
    const existing = await prisma.asset.findUnique({
        where: { farm_id_code: { farm_id: farmId, code } },
    });
    if (existing) {
        throw new Error(`Mã tài sản "${code}" đã tồn tại`);
    }

    // Validate and get useful life
    const usefulLife = input.useful_life_months || getDefaultUsefulLife(input.category);
    const validation = validateUsefulLife(input.category, usefulLife);
    if (!validation.valid) {
        throw new Error(validation.message);
    }

    // Calculate values
    const originalCost = input.purchase_price;
    const residualValue = input.residual_value || 0;

    // Check for vehicle cap (TT96/2015) BEFORE calculating depreciation
    let maxDeductibleValue: number | null = null;
    let depreciableCost = originalCost; // Default: depreciate full value

    if (input.category === 'VEHICLE' && !input.is_transport_biz) {
        const deductible = getDeductibleValue(input.category, originalCost, input.is_transport_biz);
        if (deductible < originalCost) {
            maxDeductibleValue = deductible;
            // For CIT purposes, only depreciate up to 1.6B
            depreciableCost = deductible;
        }
    }

    // Calculate depreciation on capped value (for vehicles > 1.6B)
    const monthlyDepreciation = calculateMonthlyDepreciationAmount(
        depreciableCost,
        usefulLife,
        residualValue
    );

    const asset = await prisma.asset.create({
        data: {
            farm_id: farmId,
            code,
            name: input.name,
            category: input.category,
            purchase_date: new Date(input.purchase_date),
            purchase_price: originalCost,
            supplier: input.supplier,
            invoice_number: input.invoice_number,
            useful_life_months: usefulLife,
            depreciation_method: input.depreciation_method || DepreciationMethod.STRAIGHT_LINE,
            monthly_depreciation: monthlyDepreciation,
            residual_value: residualValue,
            original_cost: originalCost,
            accumulated_depreciation: 0,
            book_value: originalCost,
            location: input.location,
            serial_number: input.serial_number,
            image_url: input.image_url,
            max_deductible_value: maxDeductibleValue,
            is_transport_biz: input.is_transport_biz || false,
            status: AssetStatus.ACTIVE,
        },
    });

    return formatAssetDetail(asset);
}

// ==========================================
// UPDATE ASSET
// ==========================================

export async function updateAsset(
    farmId: string,
    assetId: string,
    input: UpdateAssetInput
): Promise<AssetDetail> {
    const asset = await prisma.asset.findFirst({
        where: { id: assetId, farm_id: farmId },
    });

    if (!asset) {
        throw new Error('Tài sản không tồn tại');
    }

    if (asset.status !== AssetStatus.ACTIVE) {
        throw new Error('Không thể chỉnh sửa tài sản đã thanh lý');
    }

    // Recalculate if useful_life changes
    const updateData: Prisma.AssetUpdateInput = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.location !== undefined) updateData.location = input.location;
    if (input.serial_number !== undefined) updateData.serial_number = input.serial_number;
    if (input.image_url !== undefined) updateData.image_url = input.image_url;
    if (input.status !== undefined) updateData.status = input.status;

    // Handle useful_life change - recalculate depreciation
    if (input.useful_life_months !== undefined && input.useful_life_months !== asset.useful_life_months) {
        const category = input.category || asset.category;
        const validation = validateUsefulLife(category, input.useful_life_months);
        if (!validation.valid) {
            throw new Error(validation.message);
        }

        const originalCost = Number(asset.original_cost);
        const residualValue = input.residual_value ?? Number(asset.residual_value);
        const newMonthly = calculateMonthlyDepreciationAmount(
            originalCost,
            input.useful_life_months,
            residualValue
        );

        updateData.useful_life_months = input.useful_life_months;
        updateData.monthly_depreciation = newMonthly;
    }

    if (input.residual_value !== undefined) {
        updateData.residual_value = input.residual_value;
    }

    if (input.category !== undefined) {
        updateData.category = input.category;
    }

    const updated = await prisma.asset.update({
        where: { id: assetId },
        data: updateData,
    });

    return formatAssetDetail(updated);
}

// ==========================================
// GET ASSETS
// ==========================================

export async function getAssets(
    farmId: string,
    filters?: AssetFilters,
    page: number = 1,
    limit: number = 50
): Promise<PaginatedAssets> {
    const where: Prisma.AssetWhereInput = { farm_id: farmId };

    if (filters?.status) where.status = filters.status;
    if (filters?.category) where.category = filters.category;
    if (filters?.search) {
        where.OR = [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { code: { contains: filters.search, mode: 'insensitive' } },
        ];
    }
    if (filters?.from_date) {
        where.purchase_date = { gte: new Date(filters.from_date) };
    }
    if (filters?.to_date) {
        where.purchase_date = { ...where.purchase_date as any, lte: new Date(filters.to_date) };
    }

    const [assets, total] = await Promise.all([
        prisma.asset.findMany({
            where,
            orderBy: { created_at: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.asset.count({ where }),
    ]);

    return {
        data: assets.map(formatAssetDetail),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
}

export async function getAssetById(
    farmId: string,
    assetId: string
): Promise<AssetDetail | null> {
    const asset = await prisma.asset.findFirst({
        where: { id: assetId, farm_id: farmId },
    });

    return asset ? formatAssetDetail(asset) : null;
}

// ==========================================
// DELETE ASSET
// ==========================================

export async function deleteAsset(
    farmId: string,
    assetId: string
): Promise<void> {
    const asset = await prisma.asset.findFirst({
        where: { id: assetId, farm_id: farmId },
    });

    if (!asset) {
        throw new Error('Tài sản không tồn tại');
    }

    // Check if has depreciation records
    const depreciation = await prisma.depreciationSchedule.count({
        where: { asset_id: assetId },
    });

    if (depreciation > 0) {
        throw new Error('Không thể xóa tài sản đã có lịch sử khấu hao');
    }

    await prisma.asset.delete({
        where: { id: assetId },
    });
}

// ==========================================
// DISPOSE ASSET
// ==========================================

export async function disposeAsset(
    farmId: string,
    assetId: string,
    input: DisposeAssetInput
): Promise<AssetDetail> {
    const asset = await prisma.asset.findFirst({
        where: { id: assetId, farm_id: farmId, status: AssetStatus.ACTIVE },
    });

    if (!asset) {
        throw new Error('Tài sản không tồn tại hoặc đã thanh lý');
    }

    const disposedAt = input.disposed_at ? new Date(input.disposed_at) : new Date();
    const disposedValue = input.disposed_value || 0;
    const bookValue = Number(asset.book_value);
    const gainLoss = disposedValue - bookValue;

    const updated = await prisma.$transaction(async (tx) => {
        // Update asset
        const result = await tx.asset.update({
            where: { id: assetId },
            data: {
                status: disposedValue > 0 ? AssetStatus.SOLD : AssetStatus.DISPOSED,
                disposed_at: disposedAt,
                disposed_value: disposedValue,
                disposal_reason: input.disposal_reason,
            },
        });

        // Create transaction for gain/loss if sold
        if (disposedValue > 0) {
            const transType = gainLoss >= 0 ? 'INCOME' : 'EXPENSE';
            const transAmount = Math.abs(gainLoss);

            // Get transaction count for code
            const count = await tx.transaction.count({ where: { farm_id: farmId } });
            const transCode = gainLoss >= 0
                ? `TL-LN-${String(count + 1).padStart(4, '0')}`
                : `TL-LO-${String(count + 1).padStart(4, '0')}`;

            await tx.transaction.create({
                data: {
                    farm_id: farmId,
                    trans_number: transCode,
                    code: transCode,
                    trans_type: transType,
                    trans_date: disposedAt,
                    description: `${gainLoss >= 0 ? 'Lãi' : 'Lỗ'} thanh lý TSCĐ: ${asset.name} (${asset.code})`,
                    amount: transAmount,
                    total_amount: transAmount,
                    tax_amount: 0,
                    paid_amount: transAmount,
                    payment_status: 'PAID',
                    payment_method: 'BANK_TRANSFER',
                },
            });
        }

        return result;
    });

    return formatAssetDetail(updated);
}

// ==========================================
// ASSET SUMMARY
// ==========================================

export async function getAssetSummary(farmId: string): Promise<AssetSummary> {
    const assets = await prisma.asset.findMany({
        where: { farm_id: farmId },
    });

    const active = assets.filter(a => a.status === AssetStatus.ACTIVE);
    const disposed = assets.filter(a => a.status === AssetStatus.DISPOSED);
    const sold = assets.filter(a => a.status === AssetStatus.SOLD);

    const byCategory = Object.values(AssetCategory).map(cat => {
        const catAssets = active.filter(a => a.category === cat);
        return {
            category: cat,
            category_label: getCategoryLabel(cat),
            count: catAssets.length,
            total_value: catAssets.reduce((sum, a) => sum + Number(a.book_value), 0),
        };
    }).filter(c => c.count > 0);

    return {
        total_count: assets.length,
        active_count: active.length,
        disposed_count: disposed.length,
        sold_count: sold.length,
        total_original_cost: assets.reduce((sum, a) => sum + Number(a.original_cost), 0),
        total_accumulated_depreciation: assets.reduce((sum, a) => sum + Number(a.accumulated_depreciation), 0),
        total_book_value: active.reduce((sum, a) => sum + Number(a.book_value), 0),
        total_monthly_depreciation: active.reduce((sum, a) => sum + Number(a.monthly_depreciation), 0),
        by_category: byCategory,
    };
}

// ==========================================
// DEPRECIATION SCHEDULE
// ==========================================

export async function getDepreciationSchedule(
    farmId: string,
    assetId?: string,
    year?: number
): Promise<DepreciationScheduleRow[]> {
    const where: Prisma.DepreciationScheduleWhereInput = {};

    if (assetId) {
        where.asset_id = assetId;
    } else {
        where.asset = { farm_id: farmId };
    }

    if (year) {
        where.period = { startsWith: String(year) };
    }

    const schedules = await prisma.depreciationSchedule.findMany({
        where,
        include: { asset: { select: { code: true, name: true } } },
        orderBy: [{ asset_id: 'asc' }, { period: 'asc' }],
    });

    return schedules.map(s => ({
        id: s.id,
        asset_id: s.asset_id,
        asset_code: s.asset.code,
        asset_name: s.asset.name,
        period: s.period,
        depreciation_amount: Number(s.depreciation_amount),
        accumulated_amount: Number(s.accumulated_amount),
        remaining_value: Number(s.remaining_value),
        is_posted: s.is_posted,
        posted_at: s.posted_at?.toISOString(),
    }));
}

// ==========================================
// CALCULATE MONTHLY DEPRECIATION (Cron Job)
// ==========================================

export async function calculateMonthlyDepreciation(
    farmId?: string,
    period?: string // "YYYY-MM", defaults to current month
): Promise<DepreciationResult> {
    const now = new Date();
    const targetPeriod = period || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const where: Prisma.AssetWhereInput = { status: AssetStatus.ACTIVE };
    if (farmId) where.farm_id = farmId;

    const activeAssets = await prisma.asset.findMany({ where });

    const result: DepreciationResult = {
        processed: 0,
        skipped: 0,
        errors: 0,
        details: [],
    };

    for (const asset of activeAssets) {
        try {
            // Check if already processed this month
            const existing = await prisma.depreciationSchedule.findUnique({
                where: { asset_id_period: { asset_id: asset.id, period: targetPeriod } },
            });

            if (existing) {
                result.skipped++;
                result.details.push({
                    asset_code: asset.code,
                    asset_name: asset.name,
                    status: 'SKIPPED',
                    reason: 'Đã tính khấu hao kỳ này',
                });
                continue;
            }

            // Check if fully depreciated
            const monthsUsed = getMonthsDifference(asset.purchase_date, now);
            if (monthsUsed >= asset.useful_life_months) {
                result.skipped++;
                result.details.push({
                    asset_code: asset.code,
                    asset_name: asset.name,
                    status: 'SKIPPED',
                    reason: 'Đã khấu hao hết',
                });
                continue;
            }

            // Calculate
            const depreciation = Number(asset.monthly_depreciation);
            const currentAccumulated = Number(asset.accumulated_depreciation);
            const originalCost = Number(asset.original_cost);
            const residualValue = Number(asset.residual_value);

            // Don't depreciate below residual value
            const maxDepreciation = originalCost - residualValue - currentAccumulated;
            const actualDepreciation = Math.min(depreciation, Math.max(0, maxDepreciation));

            if (actualDepreciation <= 0) {
                result.skipped++;
                result.details.push({
                    asset_code: asset.code,
                    asset_name: asset.name,
                    status: 'SKIPPED',
                    reason: 'Đã đạt giá trị còn lại',
                });
                continue;
            }

            const newAccumulated = currentAccumulated + actualDepreciation;
            const newBookValue = originalCost - newAccumulated;

            // Create schedule record and update asset in transaction
            await prisma.$transaction([
                prisma.depreciationSchedule.create({
                    data: {
                        asset_id: asset.id,
                        period: targetPeriod,
                        depreciation_amount: actualDepreciation,
                        accumulated_amount: newAccumulated,
                        remaining_value: Math.max(0, newBookValue),
                        is_posted: false,
                    },
                }),
                prisma.asset.update({
                    where: { id: asset.id },
                    data: {
                        accumulated_depreciation: newAccumulated,
                        book_value: Math.max(0, newBookValue),
                    },
                }),
            ]);

            result.processed++;
            result.details.push({
                asset_code: asset.code,
                asset_name: asset.name,
                status: 'PROCESSED',
                amount: actualDepreciation,
            });
        } catch (error) {
            result.errors++;
            result.details.push({
                asset_code: asset.code,
                asset_name: asset.name,
                status: 'ERROR',
                reason: error instanceof Error ? error.message : 'Unknown error',
            });
        }
    }

    console.log(`Depreciation ${targetPeriod}: ${result.processed} processed, ${result.skipped} skipped, ${result.errors} errors`);
    return result;
}

// ==========================================
// HELPERS
// ==========================================

function formatAssetDetail(asset: any): AssetDetail {
    const accumulated = Number(asset.accumulated_depreciation);
    const original = Number(asset.original_cost);
    const bookValue = Number(asset.book_value);
    const progress = original > 0 ? (accumulated / original) * 100 : 0;

    const disposedValue = asset.disposed_value ? Number(asset.disposed_value) : undefined;
    const gainLoss = disposedValue !== undefined ? disposedValue - bookValue : undefined;

    return {
        id: asset.id,
        code: asset.code,
        name: asset.name,
        category: asset.category,
        category_label: getCategoryLabel(asset.category),
        purchase_date: asset.purchase_date.toISOString().split('T')[0],
        purchase_price: Number(asset.purchase_price),
        supplier: asset.supplier,
        invoice_number: asset.invoice_number,
        useful_life_months: asset.useful_life_months,
        useful_life_years: Math.round(asset.useful_life_months / 12 * 10) / 10,
        depreciation_method: asset.depreciation_method,
        monthly_depreciation: Number(asset.monthly_depreciation),
        residual_value: Number(asset.residual_value),
        original_cost: original,
        accumulated_depreciation: accumulated,
        book_value: bookValue,
        depreciation_progress: Math.min(100, Math.round(progress * 10) / 10),
        max_deductible_value: asset.max_deductible_value ? Number(asset.max_deductible_value) : undefined,
        is_transport_biz: asset.is_transport_biz,
        location: asset.location,
        serial_number: asset.serial_number,
        image_url: asset.image_url,
        status: asset.status,
        status_label: getStatusLabel(asset.status),
        disposed_at: asset.disposed_at?.toISOString().split('T')[0],
        disposed_value: disposedValue,
        disposal_reason: asset.disposal_reason,
        gain_loss: gainLoss,
        created_at: asset.created_at.toISOString(),
        updated_at: asset.updated_at.toISOString(),
    };
}
