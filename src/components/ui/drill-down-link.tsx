// src/components/ui/drill-down-link.tsx
// Component to link report values to drill-down transaction lists

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DrillDownLinkProps {
    /** Displayed value (formatted money, count, etc.) */
    value: React.ReactNode;
    /** Transaction IDs to drill down to */
    transactionIds?: string[];
    /** Label for the modal title */
    label: string;
    /** Optional className for styling */
    className?: string;
    /** If true, show as inline link. If false, show as button */
    inline?: boolean;
    /** Optional: navigate to transactions page with filter */
    navigateUrl?: string;
}

/**
 * DrillDownLink component
 * Allows users to click on report values and see the underlying transactions
 */
export function DrillDownLink({
    value,
    transactionIds,
    label,
    className,
    inline = true,
    navigateUrl,
}: DrillDownLinkProps) {
    const [isOpen, setIsOpen] = useState(false);

    // No drill down if no transaction IDs
    if (!transactionIds || transactionIds.length === 0) {
        return <span className={className}>{value}</span>;
    }

    // Navigation link to transactions page
    if (navigateUrl) {
        return (
            <Link
                href={navigateUrl}
                className={cn(
                    'inline-flex items-center gap-1 cursor-pointer hover:underline text-primary',
                    className
                )}
            >
                {value}
                <ExternalLink className="h-3 w-3" />
            </Link>
        );
    }

    // Modal showing transaction list
    const content = inline ? (
        <button
            onClick={() => setIsOpen(true)}
            className={cn(
                'inline-flex items-center gap-1 cursor-pointer hover:underline hover:text-primary transition-colors',
                className
            )}
        >
            {value}
            <ExternalLink className="h-3 w-3 opacity-50" />
        </button>
    ) : (
        <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
            {value}
            <ExternalLink className="h-3 w-3 ml-1" />
        </Button>
    );

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{content}</DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
                <DialogHeader>
                    <DialogTitle>{label}</DialogTitle>
                </DialogHeader>
                <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-4">
                        {transactionIds.length} giao dịch liên quan
                    </p>
                    <div className="space-y-2">
                        {transactionIds.slice(0, 20).map((id, index) => (
                            <Link
                                key={id}
                                href={`/giao-dich/${id}`}
                                className="block p-2 rounded-md hover:bg-muted text-sm font-mono truncate"
                            >
                                {index + 1}. {id}
                            </Link>
                        ))}
                        {transactionIds.length > 20 && (
                            <p className="text-sm text-muted-foreground text-center py-2">
                                ... và {transactionIds.length - 20} giao dịch khác
                            </p>
                        )}
                    </div>
                    <div className="mt-4 pt-4 border-t">
                        <Button asChild className="w-full">
                            <Link href={`/giao-dich?ids=${transactionIds.slice(0, 50).join(',')}`}>
                                Xem tất cả trong Giao dịch
                            </Link>
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Helper to format money for DrillDownLink
 */
export function formatMoney(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}
