// src/hooks/use-debounce.ts
// Hook để debounce giá trị

'use client';

import { useState, useEffect } from 'react';

/**
 * Hook để debounce một giá trị
 * Thường dùng cho search input để tránh gọi API quá nhiều
 * 
 * @param value - Giá trị cần debounce
 * @param delay - Thời gian delay (ms), mặc định 300ms
 * @returns Giá trị đã debounce
 * 
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 300);
 * 
 * useEffect(() => {
 *   // API call với debouncedSearch
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        // Set timeout để cập nhật giá trị sau delay
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Cleanup: clear timeout nếu value thay đổi trước khi delay kết thúc
        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}
