// src/config/site.ts
// Site configuration

export const siteConfig = {
    name: 'LABA ERP',
    description: 'Quản lý tài chính đơn giản cho nông trại và F&B',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    version: '1.0.0',
    locale: 'vi-VN',
    currency: 'VND',
    timezone: 'Asia/Ho_Chi_Minh',

    // Contact
    supportEmail: 'support@laba.vn',

    // Social
    links: {
        facebook: 'https://facebook.com/labaerp',
        zalo: 'https://zalo.me/labaerp',
    },

    // Branding
    colors: {
        primary: '#16a34a',       // Green - Nông nghiệp
        primaryDark: '#15803d',
        success: '#22c55e',       // Thu tiền
        danger: '#ef4444',        // Chi tiền
        warning: '#f59e0b',       // Cảnh báo
        info: '#3b82f6',          // Thông tin
    },
};

export type SiteConfig = typeof siteConfig;
