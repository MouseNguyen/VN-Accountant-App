'use client';

// src/components/dashboard/trend-chart.tsx
// Revenue Trend Chart with Recharts - Phase 4 Task 9

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { formatCompact } from './kpi-card';

interface TrendData {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
}

interface RevenueTrendChartProps {
    data: TrendData[];
}

export function RevenueTrendChart({ data }: RevenueTrendChartProps) {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="month"
                    tickFormatter={(value) => value.slice(5)} // Show MM only
                />
                <YAxis tickFormatter={(value) => formatCompact(value)} />
                <Tooltip
                    formatter={(value: number) => formatCompact(value)}
                    labelFormatter={(label) => `Tháng ${label}`}
                />
                <Legend />
                <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Doanh thu"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                />
                <Line
                    type="monotone"
                    dataKey="expenses"
                    name="Chi phí"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                />
                <Line
                    type="monotone"
                    dataKey="profit"
                    name="Lợi nhuận"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}

interface AgingPieData {
    bucket: string;
    amount: number;
    percentage: number;
    color: string;
}

interface ARAgingPieChartProps {
    data: AgingPieData[];
}

export function ARAgingPieChart({ data }: ARAgingPieChartProps) {
    // Custom render label function
    const renderLabel = (entry: any) => {
        return `${entry.bucket}: ${entry.percentage?.toFixed(1) || 0}%`;
    };

    return (
        <ResponsiveContainer width="100%" height={250}>
            <PieChart>
                <Pie
                    data={data as any}
                    dataKey="amount"
                    nameKey="bucket"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={renderLabel}
                    labelLine={false}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCompact(value)} />
                <Legend />
            </PieChart>
        </ResponsiveContainer>
    );
}

interface TopCustomer {
    customer_name: string;
    revenue: number;
    percentage: number;
}

interface TopCustomersChartProps {
    data: TopCustomer[];
}

export function TopCustomersChart({ data }: TopCustomersChartProps) {
    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart
                data={data.slice(0, 10)}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => formatCompact(value)} />
                <YAxis
                    type="category"
                    dataKey="customer_name"
                    width={90}
                    tickFormatter={(value) => value.length > 15 ? value.slice(0, 15) + '...' : value}
                />
                <Tooltip formatter={(value: number) => formatCompact(value)} />
                <Bar dataKey="revenue" name="Doanh thu" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
        </ResponsiveContainer>
    );
}

interface CashForecast {
    date: string;
    closing_balance: number;
    expected_receipts: number;
    expected_payments: number;
}

interface CashForecastChartProps {
    data: CashForecast[];
}

export function CashForecastChart({ data }: CashForecastChartProps) {
    return (
        <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.slice(0, 14)} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="date"
                    tickFormatter={(value) => value.slice(5)} // MM-DD
                />
                <YAxis tickFormatter={(value) => formatCompact(value)} />
                <Tooltip formatter={(value: number) => formatCompact(value)} />
                <Legend />
                <Line
                    type="monotone"
                    dataKey="closing_balance"
                    name="Số dư"
                    stroke="#22c55e"
                    strokeWidth={2}
                />
            </LineChart>
        </ResponsiveContainer>
    );
}
