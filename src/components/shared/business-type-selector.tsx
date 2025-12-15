// src/components/shared/business-type-selector.tsx
// Business type selector with confirmation dialog

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { BUSINESS_TYPES } from '@/lib/constants/index';
import { ConfirmDialog } from './confirm-dialog';
import { Card } from '@/components/ui/card';
import { Check } from 'lucide-react';

interface BusinessTypeSelectorProps {
    value: 'FARM' | 'RETAIL_FNB';
    onChange: (type: 'FARM' | 'RETAIL_FNB') => void;
    disabled?: boolean;
    showConfirm?: boolean; // Hiện confirm dialog khi đổi
    isLoading?: boolean;
}

export function BusinessTypeSelector({
    value,
    onChange,
    disabled = false,
    showConfirm = false,
    isLoading = false,
}: BusinessTypeSelectorProps) {
    const [pendingType, setPendingType] = useState<'FARM' | 'RETAIL_FNB' | null>(
        null
    );

    const handleSelect = (type: 'FARM' | 'RETAIL_FNB') => {
        if (type === value || disabled) return;

        if (showConfirm) {
            setPendingType(type);
        } else {
            onChange(type);
        }
    };

    const handleConfirm = () => {
        if (pendingType) {
            onChange(pendingType);
            setPendingType(null);
        }
    };

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.values(BUSINESS_TYPES).map((type) => (
                    <Card
                        key={type.value}
                        onClick={() => handleSelect(type.value as 'FARM' | 'RETAIL_FNB')}
                        className={cn(
                            'p-6 cursor-pointer transition-all hover:shadow-md relative',
                            value === type.value
                                ? 'ring-2 ring-emerald-500 bg-indigo-50'
                                : 'hover:bg-gray-50',
                            disabled && 'opacity-50 cursor-not-allowed'
                        )}
                    >
                        {value === type.value && (
                            <div className="absolute top-3 right-3">
                                <Check className="h-5 w-5 text-emerald-600" />
                            </div>
                        )}
                        <div className="text-center">
                            <div className="text-4xl mb-2">{type.icon}</div>
                            <div className="font-semibold text-lg">{type.label}</div>
                            <div className="text-sm text-gray-500 mt-1">
                                {type.description}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            <ConfirmDialog
                open={!!pendingType}
                onOpenChange={() => setPendingType(null)}
                title="⚠️ Thay đổi mô hình kinh doanh"
                description={`Bạn sắp chuyển từ "${BUSINESS_TYPES[value].label}" sang "${pendingType ? BUSINESS_TYPES[pendingType].label : ''}".

Lưu ý quan trọng:
• Tất cả nhãn hiển thị sẽ thay đổi (VD: "Nông sản" → "Sản phẩm")
• Dữ liệu cũ vẫn được giữ nguyên
• Trang sẽ được tải lại sau khi thay đổi

Bạn có chắc chắn muốn tiếp tục?`}
                confirmText="Đồng ý thay đổi"
                variant="destructive"
                onConfirm={handleConfirm}
                isLoading={isLoading}
            />
        </>
    );
}
