// src/hooks/use-labels.ts
// Hook để lấy labels động theo business type

'use client';

import { useMemo } from 'react';
import { useFarm } from './use-farm';
import { getLabels, getLabel, type BusinessType, type LabelKey } from '@/config/labels';

/**
 * Hook để lấy labels theo business type của farm hiện tại
 *
 * @example
 * const { labels, getL } = useLabels();
 * console.log(labels.product); // "Nông sản" hoặc "Sản phẩm"
 * console.log(getL('customer')); // "Thương lái" hoặc "Khách hàng"
 */
export function useLabels() {
    const { farm, isLoading } = useFarm();

    const businessType: BusinessType = farm?.business_type || 'FARM';

    const labels = useMemo(() => getLabels(businessType), [businessType]);

    const getL = (key: LabelKey): string => getLabel(businessType, key);

    return {
        labels,
        getL,
        businessType,
        isLoading,
        isFarm: businessType === 'FARM',
        isRetail: businessType === 'RETAIL_FNB',
    };
}
