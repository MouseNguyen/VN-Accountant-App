// src/lib/vat/xml-generator.ts
// Generate VAT Declaration XML for Vietnamese Tax Authority

import type { VATInvoiceDetail } from '@/types/vat';

interface XMLGeneratorInput {
    taxCode: string;
    companyName: string;
    address: string;
    phone: string;

    period: {
        type: string;
        code: string;
        from: Date;
        to: Date;
    };

    inputVAT: {
        amount: number;
        tax: number;
    };

    outputVAT: {
        amount: number;
        tax: number;
    };

    payableVAT: number;
    carriedForward: number;

    inputInvoices: VATInvoiceDetail[];
    outputInvoices: VATInvoiceDetail[];
}

export function generateVATXML(input: XMLGeneratorInput): string {
    const formatDate = (d: Date) => {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const formatMoney = (n: number) => Math.round(n).toString();

    // Build input invoices XML
    const inputInvoicesXML = input.inputInvoices
        .filter(inv => inv.is_deductible)
        .map((inv, idx) => `
      <Dong>
        <STT>${idx + 1}</STT>
        <SoHoaDon>${escapeXml(inv.invoice_number)}</SoHoaDon>
        <NgayHoaDon>${inv.invoice_date.split('-').reverse().join('/')}</NgayHoaDon>
        <MSTNguoiBan>${escapeXml(inv.partner_tax_code)}</MSTNguoiBan>
        <TenNguoiBan>${escapeXml(inv.partner_name)}</TenNguoiBan>
        <GiaTriHangHoa>${formatMoney(inv.goods_value)}</GiaTriHangHoa>
        <ThueSuat>${inv.vat_rate}</ThueSuat>
        <ThueGTGT>${formatMoney(inv.vat_amount)}</ThueGTGT>
      </Dong>`
        ).join('');

    // Build output invoices XML
    const outputInvoicesXML = input.outputInvoices
        .map((inv, idx) => `
      <Dong>
        <STT>${idx + 1}</STT>
        <SoHoaDon>${escapeXml(inv.invoice_number)}</SoHoaDon>
        <NgayHoaDon>${inv.invoice_date.split('-').reverse().join('/')}</NgayHoaDon>
        <MSTNguoiMua>${escapeXml(inv.partner_tax_code)}</MSTNguoiMua>
        <TenNguoiMua>${escapeXml(inv.partner_name)}</TenNguoiMua>
        <GiaTriHangHoa>${formatMoney(inv.goods_value)}</GiaTriHangHoa>
        <ThueSuat>${inv.vat_rate}</ThueSuat>
        <ThueGTGT>${formatMoney(inv.vat_amount)}</ThueGTGT>
      </Dong>`
        ).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<TKhai_GTGT xmlns="http://kekhaithue.gdt.gov.vn/TKhaiThue">
  <ThongTinChung>
    <MaSoThue>${escapeXml(input.taxCode)}</MaSoThue>
    <TenNguoiNopThue>${escapeXml(input.companyName)}</TenNguoiNopThue>
    <DiaChi>${escapeXml(input.address)}</DiaChi>
    <DienThoai>${escapeXml(input.phone)}</DienThoai>
    <LoaiKy>${input.period.type === 'MONTHLY' ? 'Thang' : 'Quy'}</LoaiKy>
    <KyKeToan>
      <TuNgay>${formatDate(input.period.from)}</TuNgay>
      <DenNgay>${formatDate(input.period.to)}</DenNgay>
    </KyKeToan>
    <NgayLap>${formatDate(new Date())}</NgayLap>
  </ThongTinChung>
  
  <ChiTieu>
    <ThueDauVao>
      <SoHoaDon>${input.inputInvoices.length}</SoHoaDon>
      <GiaTriHangHoa>${formatMoney(input.inputVAT.amount)}</GiaTriHangHoa>
      <ThueGTGT>${formatMoney(input.inputVAT.tax)}</ThueGTGT>
    </ThueDauVao>
    <ThueDauRa>
      <SoHoaDon>${input.outputInvoices.length}</SoHoaDon>
      <GiaTriHangHoa>${formatMoney(input.outputVAT.amount)}</GiaTriHangHoa>
      <ThueGTGT>${formatMoney(input.outputVAT.tax)}</ThueGTGT>
    </ThueDauRa>
    <ThuePhaiNop>${formatMoney(input.payableVAT)}</ThuePhaiNop>
    <ThueConDuocKhauTru>${formatMoney(input.carriedForward)}</ThueConDuocKhauTru>
  </ChiTieu>
  
  <BangKe>
    <HoaDonMuaVao>
      ${inputInvoicesXML}
    </HoaDonMuaVao>
    <HoaDonBanRa>
      ${outputInvoicesXML}
    </HoaDonBanRa>
  </BangKe>
</TKhai_GTGT>`;

    return xml;
}

function escapeXml(str: string): string {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}
