// src/hooks/use-form-dirty.ts
// Hook để theo dõi form có thay đổi hay chưa

'use client';

import { useState, useCallback } from 'react';

/**
 * Hook để theo dõi form có thay đổi hay chưa
 * Dùng để disable nút Lưu khi form chưa thay đổi
 *
 * @example
 * const { values, setValue, isDirty, reset, syncWithInitial } = useFormDirty({
 *   name: user?.name || '',
 *   email: user?.email || '',
 * });
 *
 * // When data is fetched, sync form values
 * useEffect(() => {
 *   if (user) {
 *     syncWithInitial({ name: user.name, email: user.email });
 *   }
 * }, [user, syncWithInitial]);
 *
 * <Input
 *   value={values.name}
 *   onChange={(e) => setValue('name', e.target.value)}
 * />
 *
 * <Button disabled={!isDirty}>Lưu</Button>
 */
export function useFormDirty<T extends Record<string, unknown>>(initialValues: T) {
    const [values, setValues] = useState<T>(initialValues);
    const [initialSnapshot, setInitialSnapshot] = useState<string>(
        JSON.stringify(initialValues)
    );

    // Compute isDirty by comparing current values to initial snapshot
    const isDirty = JSON.stringify(values) !== initialSnapshot;

    const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
        setValues((prev) => ({ ...prev, [key]: value }));
    }, []);

    const setMultipleValues = useCallback((newValues: Partial<T>) => {
        setValues((prev) => ({ ...prev, ...newValues }));
    }, []);

    const reset = useCallback(() => {
        const parsed = JSON.parse(initialSnapshot) as T;
        setValues(parsed);
    }, [initialSnapshot]);

    const resetTo = useCallback((newInitialValues: T) => {
        setInitialSnapshot(JSON.stringify(newInitialValues));
        setValues(newInitialValues);
    }, []);

    // Sync with new initial values (call this when data is fetched)
    const syncWithInitial = useCallback((newInitialValues: T) => {
        setInitialSnapshot(JSON.stringify(newInitialValues));
        setValues(newInitialValues);
    }, []);

    return {
        values,
        setValue,
        setMultipleValues,
        isDirty,
        reset,
        resetTo,
        syncWithInitial,
    };
}
