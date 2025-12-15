// src/components/shared/load-more-button.tsx
// Load More Button for infinite scroll

'use client';

import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown } from 'lucide-react';

interface LoadMoreButtonProps {
    hasMore: boolean;
    isLoading: boolean;
    onClick: () => void;
    loadedCount: number;
    totalCount: number;
}

/**
 * Load More Button
 * Hiển thị nút tải thêm với thông tin số lượng
 * 
 * @example
 * <LoadMoreButton
 *   hasMore={hasNextPage}
 *   isLoading={isFetchingNextPage}
 *   onClick={() => fetchNextPage()}
 *   loadedCount={products.length}
 *   totalCount={total}
 * />
 */
export function LoadMoreButton({
    hasMore,
    isLoading,
    onClick,
    loadedCount,
    totalCount,
}: LoadMoreButtonProps) {
    if (!hasMore) {
        if (loadedCount > 0 && loadedCount === totalCount) {
            return (
                <div className="text-center py-4 text-sm text-muted-foreground">
                    Đã hiển thị tất cả {totalCount} mục
                </div>
            );
        }
        return null;
    }

    return (
        <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-sm text-muted-foreground">
                Đang hiển thị <span className="font-medium">{loadedCount}</span> /{' '}
                <span className="font-medium">{totalCount}</span>
            </p>
            <Button
                variant="outline"
                onClick={onClick}
                disabled={isLoading}
                className="min-w-[140px]"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang tải...
                    </>
                ) : (
                    <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Tải thêm
                    </>
                )}
            </Button>
        </div>
    );
}
