// src/types/export.ts

export type ExportFormat = 'xlsx' | 'pdf';

export interface ExportOptions {
    format: ExportFormat;
    report_type: string;
    date_from: string;
    date_to: string;
    account_id?: string;
    partner_id?: string;

    // Style options
    include_logo?: boolean;
    paper_size?: 'A4' | 'A3';
    orientation?: 'portrait' | 'landscape';
}

export interface ExportResult {
    filename: string;
    mimetype: string;
    buffer: Buffer;
    size: number;
}

// Email options
export interface EmailReportInput {
    report_type: string;
    date_from: string;
    date_to: string;
    format: ExportFormat;
    recipients: string[];
    subject?: string;
    message?: string;
}

// Scheduled export
export interface ScheduledExportConfig {
    id: string;
    farm_id: string;

    report_type: string;
    format: ExportFormat;

    // Schedule
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    day_of_week?: number;   // 0-6 for WEEKLY
    day_of_month?: number;  // 1-31 for MONTHLY
    time: string;           // "08:00"

    // Recipients
    recipients: string[];

    is_active: boolean;
    last_run_at?: string;
    next_run_at?: string;

    created_at: string;
}
