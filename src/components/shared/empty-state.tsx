// src/components/shared/empty-state.tsx
// Empty State component for when there's no data

'use client';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    className?: string;
}

/**
 * Empty State component
 * Hiển thị khi không có data
 * 
 * @example
 * <EmptyState
 *   icon="📦"
 *   title="Chưa có sản phẩm nào"
 *   description="Thêm sản phẩm đầu tiên để bắt đầu"
 *   action={<Button onClick={openDialog}>Thêm sản phẩm</Button>}
 * />
 */
export function EmptyState({
    icon = '📭',
    title,
    description,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center py-16 px-4 text-center',
                className
            )}
        >
            <div className="text-6xl mb-4 animate-bounce">{icon}</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
            </h3>
            {description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm">
                    {description}
                </p>
            )}
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}
