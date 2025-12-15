// src/components/shared/money-input.tsx
// Money Input component with formatting

'use client';

import { forwardRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface MoneyInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value?: number;
    onChange?: (value: number) => void;
    max?: number;
    suffix?: string;
}

const MAX_DEFAULT = 99_999_999_999; // 99 tỷ

/**
 * Format số thành tiền VND
 */
function formatMoney(value: number): string {
    return new Intl.NumberFormat('vi-VN').format(value);
}

/**
 * Money Input component
 * Hiển thị format tiền VND và chỉ cho nhập số
 * 
 * @example
 * <MoneyInput
 *   value={price}
 *   onChange={setPrice}
 *   placeholder="Nhập giá"
 * />
 */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
    (
        { value = 0, onChange, max = MAX_DEFAULT, suffix = 'đ', className, ...props },
        ref
    ) => {
        const [displayValue, setDisplayValue] = useState(formatMoney(value));

        // Sync displayValue khi value prop thay đổi từ bên ngoài
        useEffect(() => {
            setDisplayValue(formatMoney(value));
        }, [value]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            // Chỉ giữ số
            const raw = e.target.value.replace(/[^\d]/g, '');

            let num = parseInt(raw || '0', 10);

            // Clamp to max/min
            if (num > max) num = max;
            if (num < 0) num = 0;

            setDisplayValue(formatMoney(num));
            onChange?.(num);
        };

        const handleFocus = () => {
            // Show raw number when focused (để dễ edit)
            if (value === 0) {
                setDisplayValue('');
            } else {
                setDisplayValue(value.toString());
            }
        };

        const handleBlur = () => {
            // Format when blur
            setDisplayValue(formatMoney(value));
        };

        return (
            <div className="relative">
                <Input
                    ref={ref}
                    type="text"
                    inputMode="numeric"
                    value={displayValue}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    className={cn('text-right pr-8', className)}
                    {...props}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                    {suffix}
                </span>
            </div>
        );
    }
);

MoneyInput.displayName = 'MoneyInput';
