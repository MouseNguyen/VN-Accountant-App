// src/components/shared/search-input.tsx
// Search Input with debounce

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

interface SearchInputProps {
    placeholder?: string;
    onSearch: (value: string) => void;
    debounceMs?: number;
    defaultValue?: string;
    className?: string;
}

/**
 * Search Input với debounce
 * Tự động gọi onSearch sau khi người dùng ngừng gõ
 * 
 * @example
 * <SearchInput
 *   placeholder="Tìm sản phẩm..."
 *   onSearch={(value) => setSearchTerm(value)}
 *   debounceMs={300}
 * />
 */
export function SearchInput({
    placeholder = 'Tìm kiếm...',
    onSearch,
    debounceMs = 300,
    defaultValue = '',
    className,
}: SearchInputProps) {
    const [value, setValue] = useState(defaultValue);
    const debouncedValue = useDebounce(value, debounceMs);

    // Gọi onSearch khi debouncedValue thay đổi
    useEffect(() => {
        onSearch(debouncedValue);
    }, [debouncedValue, onSearch]);

    const handleClear = useCallback(() => {
        setValue('');
    }, []);

    return (
        <div className={cn('relative', className)}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="pl-9 pr-9"
            />
            {value && (
                <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-muted-foreground transition-colors"
                    aria-label="Xóa tìm kiếm"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
