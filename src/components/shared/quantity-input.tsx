// src/components/shared/quantity-input.tsx
// Quantity Input component for numbers with decimal support

'use client';

import { forwardRef, useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuantityInputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
    value?: number;
    onChange?: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    suffix?: string;
    showButtons?: boolean;
}

/**
 * Format số với tối đa 3 chữ số thập phân
 */
function formatNumber(value: number): string {
    const str = value.toFixed(3);
    // Only remove trailing zeros after decimal point
    if (str.includes('.')) {
        return str.replace(/\.?0+$/, '');
    }
    return str;
}

/**
 * Quantity Input component
 * Cho phép nhập số với phần thập phân
 * 
 * @example
 * <QuantityInput
 *   value={quantity}
 *   onChange={setQuantity}
 *   suffix="kg"
 *   step={0.1}
 * />
 */
export const QuantityInput = forwardRef<HTMLInputElement, QuantityInputProps>(
    (
        {
            value = 0,
            onChange,
            min = 0,
            max = 999_999_999,
            step = 1,
            suffix,
            showButtons = false,
            className,
            ...props
        },
        ref
    ) => {
        const [displayValue, setDisplayValue] = useState(formatNumber(value));

        // Sync displayValue khi value prop thay đổi từ bên ngoài
        useEffect(() => {
            setDisplayValue(formatNumber(value));
        }, [value]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const input = e.target.value;

            // Cho phép rỗng
            if (input === '') {
                setDisplayValue('');
                return;
            }

            // Chỉ cho phép số và dấu chấm
            if (!/^[\d.]*$/.test(input)) return;

            // Không cho phép nhiều dấu chấm
            if ((input.match(/\./g) || []).length > 1) return;

            setDisplayValue(input);
        };

        const handleBlur = () => {
            let num = parseFloat(displayValue || '0');

            // Clamp
            if (num < min) num = min;
            if (num > max) num = max;
            if (isNaN(num)) num = 0;

            setDisplayValue(formatNumber(num));
            onChange?.(num);
        };

        const handleIncrement = () => {
            let num = parseFloat(displayValue || '0');
            num = Math.min(num + step, max);
            setDisplayValue(formatNumber(num));
            onChange?.(num);
        };

        const handleDecrement = () => {
            let num = parseFloat(displayValue || '0');
            num = Math.max(num - step, min);
            setDisplayValue(formatNumber(num));
            onChange?.(num);
        };

        return (
            <div className="relative flex items-center">
                {showButtons && (
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-r-none"
                        onClick={handleDecrement}
                        disabled={value <= min}
                    >
                        <Minus className="h-4 w-4" />
                    </Button>
                )}
                <Input
                    ref={ref}
                    type="text"
                    inputMode="decimal"
                    value={displayValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={cn(
                        'text-right',
                        suffix && 'pr-12',
                        showButtons && 'rounded-none',
                        className
                    )}
                    {...props}
                />
                {suffix && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                        {suffix}
                    </span>
                )}
                {showButtons && (
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-l-none"
                        onClick={handleIncrement}
                        disabled={value >= max}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                )}
            </div>
        );
    }
);

QuantityInput.displayName = 'QuantityInput';
