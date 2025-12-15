// src/types/dashboard.ts

// ==========================================
// DASHBOARD WIDGETS
// ==========================================

export interface CashBalanceWidget {
    total: number;
    by_account: Array<{
        account_id: string;
        name: string;
        type: 'CASH' | 'BANK';
        balance: number;
    }>;
    change_today: number;
    change_percentage: number;
}

export interface IncomeExpenseWidget {
    period: 'today' | 'week' | 'month';
    income: number;
    expense: number;
    net: number;
    transaction_count: number;
    compare_previous: {
        income_change: number;
        expense_change: number;
        net_change: number;
    };
}

export interface PayableWidget {
    receivable: {
        total: number;
        overdue: number;
        overdue_count: number;
    };
    payable: {
        total: number;
        overdue: number;
        overdue_count: number;
    };
}

export interface TopProductsWidget {
    period: 'week' | 'month';
    items: Array<{
        product_id: string;
        code: string;
        name: string;
        quantity_sold: number;
        revenue: number;
        profit: number;
    }>;
}

export interface WorkerWidget {
    total_active: number;
    total_working_today: number;
    pending_payroll: number;
    workers_on_leave: number;
}

export interface AlertWidget {
    items: Array<{
        type: 'LOW_STOCK' | 'OVERDUE_RECEIVABLE' | 'OVERDUE_PAYABLE' | 'PENDING_PAYROLL';
        severity: 'warning' | 'error';
        title: string;
        message: string;
        link?: string;
        entity_id?: string;
    }>;
    total_count: number;
}

export interface ChartDataPoint {
    date: string;
    income: number;
    expense: number;
    net: number;
}

export interface IncomeExpenseChart {
    period: 'week' | 'month';
    data: ChartDataPoint[];
    summary: {
        total_income: number;
        total_expense: number;
        avg_daily_income: number;
        avg_daily_expense: number;
    };
}

// ==========================================
// DASHBOARD RESPONSE
// ==========================================

export interface DashboardData {
    generated_at: string;
    cash_balance: CashBalanceWidget;
    income_expense_today: IncomeExpenseWidget;
    income_expense_month: IncomeExpenseWidget;
    payables: PayableWidget;
    top_products: TopProductsWidget;
    workers: WorkerWidget;
    alerts: AlertWidget;
    chart: IncomeExpenseChart;
}

export interface QuickAction {
    id: string;
    label: string;
    icon: string;
    href: string;
    color: string;
}

export interface DashboardResponse {
    success: boolean;
    data: DashboardData;
    quick_actions: QuickAction[];
    last_updated: string;
}
