// src/services/tax-package.service.ts
// Tax Package Export Service (Task 9)

import prismaClient from '@/lib/prisma';
// Cast to any to access new model before TS server refreshes
const prisma = prismaClient as any;
import JSZip from 'jszip';
import {
    TaxPackageConfig,
    TaxPackageChecklist,
    TaxPackageExportResult,
    TaxPackageMetadata,
    ChecklistItem,
    TaxPackageHistoryResponse,
} from '@/types/tax-package';
import { generateVATDeclarationXML } from './vat.service';
import { uploadToR2, downloadFromR2 } from '@/lib/storage';
import * as reportService from './reports.service';
import {
    exportCashBook,
    exportBankBook,
    exportPurchaseInvoices,
    exportSalesInvoices,
    exportAR131,
    exportAP331,
    exportTrialBalance,
    exportProfitLoss,
} from '@/lib/export/excel';

// ==========================================
// HELPERS
// ==========================================

function parsePeriod(type: string, code: string): { from_date: Date; to_date: Date } {
    if (type === 'MONTHLY') {
        const [year, month] = code.split('-').map(Number);
        const from_date = new Date(year, month - 1, 1);
        const to_date = new Date(year, month, 0);  // Last day of month
        return { from_date, to_date };
    } else {
        // QUARTERLY: "2024-Q4"
        const year = parseInt(code.slice(0, 4));
        const quarter = parseInt(code.slice(-1));
        const startMonth = (quarter - 1) * 3;
        const from_date = new Date(year, startMonth, 1);
        const to_date = new Date(year, startMonth + 3, 0);
        return { from_date, to_date };
    }
}

// ==========================================
// PRE-EXPORT CHECKLIST
// ==========================================

export async function getExportChecklist(
    farmId: string,
    periodType: string,
    periodCode: string
): Promise<TaxPackageChecklist> {
    const { from_date, to_date } = parsePeriod(periodType, periodCode);

    const items: ChecklistItem[] = [];

    // 1. Check VAT declaration exists
    const vatDeclaration = await prisma.vATDeclaration.findFirst({
        where: { farm_id: farmId, period_code: periodCode },
    });

    if (!vatDeclaration) {
        items.push({
            id: 'vat-1',
            category: 'vat',
            title: 'Tờ khai GTGT',
            description: 'Chưa có tờ khai thuế GTGT cho kỳ này',
            status: 'failed',
            link: '/thue/to-khai/tao-moi',
            fix_action: 'Tạo tờ khai',
        });
    } else if (vatDeclaration.status === 'DRAFT') {
        items.push({
            id: 'vat-2',
            category: 'vat',
            title: 'Tờ khai GTGT chưa tính',
            description: 'Tờ khai thuế chưa được tính toán',
            status: 'warning',
            link: `/thue/to-khai/${vatDeclaration.id}`,
            fix_action: 'Tính lại',
        });
    } else {
        items.push({
            id: 'vat-3',
            category: 'vat',
            title: 'Tờ khai GTGT',
            description: `Đã tính: Phải nộp ${Number(vatDeclaration.payable_vat).toLocaleString('vi-VN')}đ`,
            status: 'passed',
        });
    }

    // 2. Check purchase invoices have MST
    const purchasesMissingMST = await prisma.transaction.count({
        where: {
            farm_id: farmId,
            trans_type: { in: ['PURCHASE', 'EXPENSE'] },
            trans_date: { gte: from_date, lte: to_date },
            deleted_at: null,
            OR: [
                { partner: { tax_code: null } },
                { partner: { tax_code: '' } },
            ],
        },
    });

    if (purchasesMissingMST > 0) {
        items.push({
            id: 'invoice-1',
            category: 'invoice',
            title: 'Thiếu MST nhà cung cấp',
            description: `${purchasesMissingMST} hóa đơn mua vào thiếu MST`,
            status: 'warning',
            details: 'Các HĐ này sẽ không được khấu trừ thuế',
            link: '/giao-dich?type=EXPENSE',
            fix_action: 'Xem danh sách',
        });
    } else {
        items.push({
            id: 'invoice-2',
            category: 'invoice',
            title: 'MST nhà cung cấp',
            description: 'Tất cả HĐ mua vào đều có MST',
            status: 'passed',
        });
    }

    // 3. Check transactions have codes (invoice numbers)
    const missingCode = await prisma.transaction.count({
        where: {
            farm_id: farmId,
            trans_type: { in: ['PURCHASE', 'EXPENSE', 'SALE', 'INCOME'] },
            trans_date: { gte: from_date, lte: to_date },
            deleted_at: null,
            OR: [
                { code: null },
                { code: '' },
            ],
        },
    });

    if (missingCode > 0) {
        items.push({
            id: 'invoice-3',
            category: 'invoice',
            title: 'Thiếu mã chứng từ',
            description: `${missingCode} giao dịch chưa có mã chứng từ`,
            status: 'warning',
        });
    } else {
        items.push({
            id: 'invoice-4',
            category: 'invoice',
            title: 'Mã chứng từ',
            description: 'Tất cả giao dịch đều có mã chứng từ',
            status: 'passed',
        });
    }

    // 4. Check period lock status
    const periodLock = await prisma.periodLock.findFirst({
        where: {
            farm_id: farmId,
            period_code: periodCode,
        },
    });

    if (!periodLock || periodLock.status === 'OPEN') {
        items.push({
            id: 'period-1',
            category: 'period',
            title: 'Kỳ chưa khóa sổ',
            description: 'Nên khóa sổ kỳ trước khi xuất hồ sơ thuế',
            status: 'warning',
            link: '/cai-dat',
            fix_action: 'Khóa sổ',
        });
    } else {
        items.push({
            id: 'period-2',
            category: 'period',
            title: 'Đã khóa sổ',
            description: 'Kỳ này đã được khóa sổ',
            status: 'passed',
        });
    }

    // 5. Check transaction count
    const transactionCount = await prisma.transaction.count({
        where: {
            farm_id: farmId,
            trans_date: { gte: from_date, lte: to_date },
            deleted_at: null,
        },
    });

    if (transactionCount === 0) {
        items.push({
            id: 'data-1',
            category: 'data',
            title: 'Không có dữ liệu',
            description: 'Không có giao dịch nào trong kỳ này',
            status: 'warning',
        });
    } else {
        items.push({
            id: 'data-2',
            category: 'data',
            title: 'Dữ liệu giao dịch',
            description: `${transactionCount} giao dịch trong kỳ`,
            status: 'passed',
        });
    }

    // Summary
    const passed = items.filter((i) => i.status === 'passed').length;
    const warnings = items.filter((i) => i.status === 'warning').length;
    const failed = items.filter((i) => i.status === 'failed').length;

    return {
        period: {
            from_date: from_date.toISOString().split('T')[0],
            to_date: to_date.toISOString().split('T')[0],
        },
        items,
        summary: {
            total: items.length,
            passed,
            warnings,
            failed,
        },
        can_export: failed === 0,
        generated_at: new Date().toISOString(),
    };
}

// ==========================================
// EXPORT TAX PACKAGE
// ==========================================

export async function exportTaxPackage(
    farmId: string,
    userId: string,
    config: TaxPackageConfig
): Promise<TaxPackageExportResult> {
    const { from_date, to_date } = parsePeriod(config.period_type, config.period_code);

    const farm = await prisma.farm.findUnique({
        where: { id: farmId },
        select: { name: true, tax_code: true, address: true, phone: true },
    });

    const zip = new JSZip();
    const filesAdded: TaxPackageMetadata['contents']['files'] = [];
    let totalSize = 0;

    // Get VAT declaration data
    let vatSummary = {
        input_count: 0, input_amount: 0, input_tax: 0,
        output_count: 0, output_amount: 0, output_tax: 0,
        payable: 0, carried: 0,
    };

    // 1. Add VAT XML
    if (config.include_xml) {
        const vatDeclaration = await prisma.vATDeclaration.findFirst({
            where: { farm_id: farmId, period_code: config.period_code },
        });

        if (vatDeclaration) {
            let xmlContent = vatDeclaration.xml_content;

            if (!xmlContent) {
                xmlContent = await generateVATDeclarationXML(farmId, vatDeclaration.id);
            }

            zip.file('01_ToKhai_GTGT.xml', xmlContent);
            const xmlSize = new TextEncoder().encode(xmlContent).length;
            filesAdded.push({
                name: '01_ToKhai_GTGT.xml',
                type: 'xml',
                size: xmlSize,
                description: 'Tờ khai thuế GTGT',
            });
            totalSize += xmlSize;

            vatSummary = {
                input_count: vatDeclaration.input_vat_count,
                input_amount: Number(vatDeclaration.input_vat_amount),
                input_tax: Number(vatDeclaration.input_vat_tax),
                output_count: vatDeclaration.output_vat_count,
                output_amount: Number(vatDeclaration.output_vat_amount),
                output_tax: Number(vatDeclaration.output_vat_tax),
                payable: Number(vatDeclaration.payable_vat),
                carried: Number(vatDeclaration.carried_forward),
            };
        }
    }

    // 2. Add Excel reports
    if (config.include_reports) {
        const reportParams = {
            from: from_date.toISOString().split('T')[0],
            to: to_date.toISOString().split('T')[0],
        };

        const reportConfigs = [
            { key: 'cash-book', num: '02', name: 'SoQuyTienMat', desc: 'Sổ quỹ tiền mặt', fn: reportService.getCashBookReport, export: exportCashBook },
            { key: 'bank-book', num: '03', name: 'SoTienGuiNH', desc: 'Sổ tiền gửi ngân hàng', fn: reportService.getBankBookReport, export: exportBankBook },
            { key: 'purchase-invoices', num: '04', name: 'BangKeHDMuaVao', desc: 'Bảng kê HĐ mua vào', fn: reportService.getPurchaseInvoiceReport, export: exportPurchaseInvoices },
            { key: 'sales-invoices', num: '05', name: 'BangKeHDBanRa', desc: 'Bảng kê HĐ bán ra', fn: reportService.getSalesInvoiceReport, export: exportSalesInvoices },
            { key: 'ar-131', num: '06', name: 'SoChiTietCongNo131', desc: 'Sổ chi tiết công nợ 131', fn: reportService.getAR131Report, export: exportAR131 },
            { key: 'ap-331', num: '07', name: 'SoChiTietCongNo331', desc: 'Sổ chi tiết công nợ 331', fn: reportService.getAP331Report, export: exportAP331 },
            { key: 'trial-balance', num: '08', name: 'BangCanDoiSPS', desc: 'Bảng cân đối SPS', fn: reportService.getTrialBalanceReport, export: exportTrialBalance },
            { key: 'profit-loss', num: '09', name: 'BaoCaoLaiLo', desc: 'Báo cáo lãi lỗ', fn: reportService.getProfitLossReport, export: exportProfitLoss },
        ];

        for (const rc of reportConfigs) {
            if (!config.reports.includes(rc.key as any)) continue;

            try {
                const reportData = await rc.fn(farmId, reportParams);
                const excelBuffer = await (rc.export as (data: any) => Promise<Buffer>)(reportData);

                const fileName = `${rc.num}_${rc.name}.xlsx`;
                zip.file(fileName, excelBuffer);

                filesAdded.push({
                    name: fileName,
                    type: 'xlsx',
                    size: excelBuffer.length,
                    description: rc.desc,
                });
                totalSize += excelBuffer.length;
            } catch (error) {
                console.error(`Error exporting ${rc.key}:`, error);
            }
        }
    }

    // 3. Add invoice images
    let imagesCount = 0;

    if (config.include_images) {
        // Get invoices with images from Invoice model
        const invoices = await prisma.invoice.findMany({
            where: {
                farm_id: farmId,
                invoice_date: { gte: from_date, lte: to_date },
                image_url: { not: null },
                status: { in: ['CONFIRMED', 'COMPLETED'] },
            },
            select: {
                id: true,
                invoice_number: true,
                invoice_date: true,
                invoice_type: true,
                image_url: true,
            },
        });

        const inputFolder = zip.folder('HoaDon/MuaVao');
        const outputFolder = zip.folder('HoaDon/BanRa');

        for (const invoice of invoices) {
            if (!invoice.image_url) continue;

            try {
                const imageBuffer = await downloadFromR2(invoice.image_url);
                const ext = invoice.image_url.split('.').pop() || 'jpg';
                const dateStr = invoice.invoice_date?.toISOString().split('T')[0] || 'unknown';
                const imageName = `${invoice.invoice_number || invoice.id}_${dateStr}.${ext}`;

                const folder = invoice.invoice_type === 'OUTPUT' ? outputFolder : inputFolder;
                folder?.file(imageName, imageBuffer);

                const folderPath = invoice.invoice_type === 'OUTPUT' ? 'HoaDon/BanRa' : 'HoaDon/MuaVao';
                filesAdded.push({
                    name: `${folderPath}/${imageName}`,
                    type: ext as 'jpg' | 'png',
                    size: imageBuffer.length,
                    description: `HĐ ${invoice.invoice_number || invoice.id}`,
                });
                totalSize += imageBuffer.length;
                imagesCount++;
            } catch (error) {
                console.error(`Error downloading image for invoice ${invoice.id}:`, error);
            }
        }

        // Also check Transaction.attachment_url
        const transactions = await prisma.transaction.findMany({
            where: {
                farm_id: farmId,
                trans_date: { gte: from_date, lte: to_date },
                attachment_url: { not: null },
                deleted_at: null,
            },
            select: {
                id: true,
                code: true,
                trans_date: true,
                trans_type: true,
                attachment_url: true,
            },
        });

        for (const trans of transactions) {
            if (!trans.attachment_url) continue;

            try {
                const imageBuffer = await downloadFromR2(trans.attachment_url);
                const ext = trans.attachment_url.split('.').pop() || 'jpg';
                const dateStr = trans.trans_date.toISOString().split('T')[0];
                const imageName = `${trans.code || trans.id}_${dateStr}.${ext}`;

                const isOutput = trans.trans_type === 'SALE' || trans.trans_type === 'INCOME';
                const folder = isOutput ? outputFolder : inputFolder;
                folder?.file(imageName, imageBuffer);

                const folderPath = isOutput ? 'HoaDon/BanRa' : 'HoaDon/MuaVao';
                filesAdded.push({
                    name: `${folderPath}/${imageName}`,
                    type: ext as 'jpg' | 'png',
                    size: imageBuffer.length,
                    description: `Chứng từ ${trans.code || trans.id}`,
                });
                totalSize += imageBuffer.length;
                imagesCount++;
            } catch (error) {
                console.error(`Error downloading attachment for trans ${trans.id}:`, error);
            }
        }
    }

    // 4. Add Metadata.json
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { full_name: true },
    });

    const metadata: TaxPackageMetadata = {
        version: '1.0',
        farm: {
            name: farm?.name || '',
            tax_code: farm?.tax_code || '',
            address: farm?.address || undefined,
            phone: farm?.phone || undefined,
        },
        period: {
            type: config.period_type,
            code: config.period_code,
            from_date: from_date.toISOString().split('T')[0],
            to_date: to_date.toISOString().split('T')[0],
        },
        generated: {
            at: new Date().toISOString(),
            by: user?.full_name || userId,
            software: 'LABA ERP',
            version: '1.0.0',
        },
        contents: {
            files: filesAdded,
            total_size: totalSize,
        },
        vat_summary: vatSummary,
    };

    const metadataStr = JSON.stringify(metadata, null, 2);
    zip.file('Metadata.json', metadataStr);
    totalSize += new TextEncoder().encode(metadataStr).length;

    // 5. Generate ZIP
    const zipBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
    });

    // 6. Upload to storage
    const fileName = `HoSoThue_${config.period_code}.zip`;
    const fileUrl = await uploadToR2(
        zipBuffer,
        fileName,
        'application/zip'
    );

    // 7. Save to database
    const exportRecord = await prisma.taxPackageExport.create({
        data: {
            farm_id: farmId,
            period_type: config.period_type,
            period_code: config.period_code,
            file_name: fileName,
            file_size: zipBuffer.length,
            file_url: fileUrl,
            contents: {
                xml_included: config.include_xml,
                reports_count: filesAdded.filter((f) => f.type === 'xlsx').length,
                images_count: imagesCount,
            },
            notes: config.notes,
            created_by: userId,
        },
    });

    return {
        id: exportRecord.id,
        period_type: config.period_type,
        period_code: config.period_code,
        file_name: fileName,
        file_size: zipBuffer.length,
        file_url: fileUrl,
        contents: {
            xml_included: config.include_xml,
            reports_count: filesAdded.filter((f) => f.type === 'xlsx').length,
            images_count: imagesCount,
        },
        created_at: exportRecord.created_at.toISOString(),
        created_by: userId,
        download_count: 0,
    };
}

// ==========================================
// DOWNLOAD TAX PACKAGE
// ==========================================

export async function downloadTaxPackage(
    farmId: string,
    exportId: string
): Promise<{
    buffer: Buffer;
    fileName: string;
    contentType: string;
}> {
    const exportRecord = await prisma.taxPackageExport.findFirst({
        where: { id: exportId, farm_id: farmId },
    });

    if (!exportRecord) throw new Error('Hồ sơ không tồn tại');

    const buffer = await downloadFromR2(exportRecord.file_url);

    // Update download count
    await prisma.taxPackageExport.update({
        where: { id: exportId },
        data: {
            download_count: { increment: 1 },
            last_downloaded_at: new Date(),
        },
    });

    return {
        buffer,
        fileName: exportRecord.file_name,
        contentType: 'application/zip',
    };
}

// ==========================================
// EXPORT HISTORY
// ==========================================

export async function getTaxPackageHistory(
    farmId: string,
    page: number = 1,
    limit: number = 20
): Promise<TaxPackageHistoryResponse> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
        prisma.taxPackageExport.findMany({
            where: { farm_id: farmId },
            include: { created_by_user: { select: { full_name: true } } },
            orderBy: { created_at: 'desc' },
            skip,
            take: limit,
        }),
        prisma.taxPackageExport.count({ where: { farm_id: farmId } }),
    ]);

    return {
        items: items.map((e: any) => ({
            id: e.id,
            period_code: e.period_code,
            file_name: e.file_name,
            file_size: e.file_size,
            created_at: e.created_at.toISOString(),
            created_by_name: e.created_by_user?.full_name || '',
            download_count: e.download_count,
        })),
        total,
        page,
        limit,
    };
}

// ==========================================
// DELETE EXPORT
// ==========================================

export async function deleteTaxPackageExport(
    farmId: string,
    exportId: string
): Promise<void> {
    const exportRecord = await prisma.taxPackageExport.findFirst({
        where: { id: exportId, farm_id: farmId },
    });

    if (!exportRecord) throw new Error('Hồ sơ không tồn tại');

    // Delete from storage (optional, could keep for audit)
    // await deleteFromR2(exportRecord.file_url);

    await prisma.taxPackageExport.delete({
        where: { id: exportId },
    });
}
