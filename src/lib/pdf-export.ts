// src/lib/pdf-export.ts
// PDF Export utility using html2pdf.js - Phase 4 Task 9

'use client';

interface ExportToPDFOptions {
    filename?: string;
    margin?: number;
    format?: 'a4' | 'letter';
    orientation?: 'portrait' | 'landscape';
}

export async function exportToPDF(
    elementId: string,
    options: ExportToPDFOptions = {}
): Promise<void> {
    const {
        filename = 'report.pdf',
        margin = 10,
        format = 'a4',
        orientation = 'portrait',
    } = options;

    // Dynamically import html2pdf to avoid SSR issues
    const html2pdf = (await import('html2pdf.js')).default;

    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error(`Element with id "${elementId}" not found`);
    }

    const opt = {
        margin,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format, orientation },
    };

    await html2pdf().set(opt as any).from(element).save();
}

export function formatDateForPDF(): string {
    return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date());
}
