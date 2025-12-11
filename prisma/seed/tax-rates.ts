// prisma/seed/tax-rates.ts
// Thuế suất theo quy định Việt Nam

export const TAX_RATES_SEED = [
    // VAT - Thuế GTGT đầu ra
    {
        code: "VAT0",
        name: "VAT 0% (Xuất khẩu)",
        rate: 0,
        type: "OUTPUT"
    },
    {
        code: "VAT5",
        name: "VAT 5% (Nông sản, thực phẩm)",
        rate: 5,
        type: "OUTPUT"
    },
    {
        code: "VAT8",
        name: "VAT 8% (Giảm thuế)",
        rate: 8,
        type: "OUTPUT"
    },
    {
        code: "VAT10",
        name: "VAT 10% (Thông thường)",
        rate: 10,
        type: "OUTPUT"
    },

    // VAT - Thuế GTGT đầu vào
    {
        code: "VAT_IN_0",
        name: "VAT đầu vào 0%",
        rate: 0,
        type: "INPUT"
    },
    {
        code: "VAT_IN_5",
        name: "VAT đầu vào 5%",
        rate: 5,
        type: "INPUT"
    },
    {
        code: "VAT_IN_8",
        name: "VAT đầu vào 8%",
        rate: 8,
        type: "INPUT"
    },
    {
        code: "VAT_IN_10",
        name: "VAT đầu vào 10%",
        rate: 10,
        type: "INPUT"
    },
];

export default TAX_RATES_SEED;
