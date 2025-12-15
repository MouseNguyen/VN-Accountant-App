// src/lib/tax/cit-xml-generator.ts
// CIT (03/TNDN) XML Declaration Generator - Task 5
// Generates XML file compliant with TCT specifications

import { prisma } from '@/lib/prisma';
import { CITCalculationResult } from '@/types/cit';
import { parsePeriod, getCITCalculation } from './cit-calculator';

// ==========================================
// TYPES
// ==========================================

interface CITXMLData {
    taxCode: string;
    companyName: string;
    address: string;
    phone?: string;

    period: string;
    periodType: string;
    fromDate: Date;
    toDate: Date;

    calculation: CITCalculationResult;
}

// ==========================================
// GENERATE CIT XML (03/TNDN Format)
// ==========================================

export function generateCITXML(data: CITXMLData): string {
    const formatDate = (d: Date) => {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const formatMoney = (n: number) => Math.round(n).toString();

    const adjustmentsXML = data.calculation.adjustments
        .filter(a => a.adjustment_type === 'ADD_BACK')
        .map(a => `      <Khoan>
        <MoTa>${escapeXml(a.description)}</MoTa>
        <LoaiDieuChinh>${escapeXml(a.category)}</LoaiDieuChinh>
        <SoTien>${formatMoney(a.amount)}</SoTien>
      </Khoan>`)
        .join('\n');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TKhai_TNDN xmlns="http://kekhaithue.gdt.gov.vn/TKhaiThue">
  <!-- Thông tin chung -->
  <ThongTinChung>
    <MaSoThue>${escapeXml(data.taxCode)}</MaSoThue>
    <TenNguoiNopThue>${escapeXml(data.companyName)}</TenNguoiNopThue>
    <DiaChi>${escapeXml(data.address)}</DiaChi>
    <DienThoai>${escapeXml(data.phone || '')}</DienThoai>
    <LoaiToKhai>${data.periodType === 'QUARTERLY' ? 'TamTinh' : 'QuyetToan'}</LoaiToKhai>
    <KyTinhThue>
      <TuNgay>${formatDate(data.fromDate)}</TuNgay>
      <DenNgay>${formatDate(data.toDate)}</DenNgay>
    </KyTinhThue>
    <NgayLap>${formatDate(new Date())}</NgayLap>
    <MauToKhai>03/TNDN</MauToKhai>
    <SoLanNop>1</SoLanNop>
  </ThongTinChung>
  
  <!-- Chỉ tiêu -->
  <ChiTieu>
    <!-- I. Doanh thu -->
    <DoanhThu>
      <DoanhThuBanHang>${formatMoney(data.calculation.total_revenue)}</DoanhThuBanHang>
      <ThuNhapKhac>${formatMoney(data.calculation.other_income)}</ThuNhapKhac>
      <TongDoanhThu>${formatMoney(data.calculation.total_revenue + data.calculation.other_income)}</TongDoanhThu>
    </DoanhThu>
    
    <!-- II. Chi phí -->
    <ChiPhi>
      <TongChiPhi>${formatMoney(data.calculation.total_expenses)}</TongChiPhi>
    </ChiPhi>
    
    <!-- III. Lợi nhuận kế toán trước thuế -->
    <LoiNhuanKeToan>${formatMoney(data.calculation.accounting_profit)}</LoiNhuanKeToan>
    
    <!-- IV. Điều chỉnh tăng thu nhập chịu thuế -->
    <DieuChinhTang>
      <TongDieuChinhTang>${formatMoney(data.calculation.add_backs)}</TongDieuChinhTang>
${adjustmentsXML}
    </DieuChinhTang>
    
    <!-- V. Điều chỉnh giảm thu nhập chịu thuế -->
    <DieuChinhGiam>
      <TongDieuChinhGiam>${formatMoney(data.calculation.deductions)}</TongDieuChinhGiam>
    </DieuChinhGiam>
    
    <!-- VI. Thu nhập chịu thuế -->
    <ThuNhapChiuThue>${formatMoney(data.calculation.taxable_income)}</ThuNhapChiuThue>
    
    <!-- VII. Thuế suất áp dụng -->
    <ThueSuat>${data.calculation.tax_rate}</ThueSuat>
    
    <!-- VIII. Thuế TNDN phải nộp trong kỳ -->
    <ThueTNDN>${formatMoney(data.calculation.cit_amount)}</ThueTNDN>
    
    <!-- IX. Lỗ được chuyển kỳ sau -->
    <LoChuyenKySau>${formatMoney(data.calculation.loss_carried)}</LoChuyenKySau>
  </ChiTieu>
  
  <!-- Cam kết -->
  <CamKet>
    <NoiDung>Tôi cam đoan số liệu khai trên là đúng và chịu trách nhiệm trước pháp luật về những số liệu đã khai.</NoiDung>
  </CamKet>
</TKhai_TNDN>`;

    return xml;
}

// ==========================================
// ESCAPE XML SPECIAL CHARACTERS
// ==========================================

function escapeXml(str: string): string {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// ==========================================
// EXPORT CIT DECLARATION XML
// ==========================================

export async function exportCITDeclarationXML(
    farmId: string,
    period: string
): Promise<string> {
    // Get CIT calculation
    const calculation = await getCITCalculation(farmId, period);

    if (!calculation) {
        throw new Error(`Chưa có tờ khai CIT cho kỳ ${period}. Vui lòng tính thuế trước.`);
    }

    // Get farm info
    const farm = await prisma.farm.findUnique({
        where: { id: farmId },
        select: { name: true, tax_code: true, address: true, phone: true },
    });

    if (!farm) {
        throw new Error('Không tìm thấy thông tin doanh nghiệp');
    }

    // Parse period dates
    const { startDate, endDate } = parsePeriod(period, calculation.period_type);

    // Generate XML
    return generateCITXML({
        taxCode: farm.tax_code || '',
        companyName: farm.name,
        address: farm.address || '',
        phone: farm.phone || undefined,
        period,
        periodType: calculation.period_type,
        fromDate: startDate,
        toDate: endDate,
        calculation,
    });
}

// ==========================================
// VALIDATE CIT XML (Basic validation)
// ==========================================

export function validateCITXML(xml: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required elements
    const requiredElements = [
        'MaSoThue',
        'TenNguoiNopThue',
        'LoaiToKhai',
        'TuNgay',
        'DenNgay',
        'DoanhThuBanHang',
        'TongChiPhi',
        'ThuNhapChiuThue',
        'ThueSuat',
        'ThueTNDN',
    ];

    for (const elem of requiredElements) {
        const regex = new RegExp(`<${elem}>[^<]*</${elem}>`);
        if (!regex.test(xml)) {
            errors.push(`Thiếu phần tử bắt buộc: ${elem}`);
        }
    }

    // Check tax code format (10 or 13 digits)
    const taxCodeMatch = xml.match(/<MaSoThue>(\d+)<\/MaSoThue>/);
    if (taxCodeMatch) {
        const taxCode = taxCodeMatch[1];
        if (taxCode.length !== 10 && taxCode.length !== 13) {
            errors.push(`Mã số thuế không hợp lệ: ${taxCode} (phải 10 hoặc 13 chữ số)`);
        }
    }

    // Check if has proper XML declaration
    if (!xml.startsWith('<?xml')) {
        errors.push('Thiếu khai báo XML header');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
