// src/hooks/use-user.ts
// React Query hook cho User management

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface User {
    id: string;
    email: string;
    full_name: string;
    phone?: string | null;
    avatar_url?: string | null;
    role: string;
    email_verified: boolean;
    created_at: string;
}

interface UpdateUserInput {
    full_name?: string;
    phone?: string;
    avatar_url?: string;
}

interface ChangeEmailInput {
    new_email: string;
    password: string;
}

// Fetch User
async function fetchUser(): Promise<User> {
    const res = await fetch('/api/users/me', {
        credentials: 'include',
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi khi tải thông tin');
    return data.data;
}

// Update User
async function updateUserApi(input: UpdateUserInput): Promise<User> {
    const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi khi cập nhật');
    return data.data;
}

// Change Email
async function changeEmailApi(input: ChangeEmailInput): Promise<{ email: string }> {
    const res = await fetch('/api/users/me/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error?.message || 'Lỗi khi đổi email');
    return data.data;
}

export function useUser() {
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: ['user'],
        queryFn: fetchUser,
        staleTime: 5 * 60 * 1000, // 5 phút
    });

    const updateMutation = useMutation({
        mutationFn: updateUserApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user'] });
            toast.success('Cập nhật thành công!');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const changeEmailMutation = useMutation({
        mutationFn: changeEmailApi,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user'] });
            toast.success('Đã gửi mã xác thực đến email mới!');
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    return {
        user: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        error: query.error,
        refetch: query.refetch,
        updateUser: updateMutation.mutate,
        updateUserAsync: updateMutation.mutateAsync,
        isUpdating: updateMutation.isPending,
        changeEmail: changeEmailMutation.mutate,
        isChangingEmail: changeEmailMutation.isPending,
    };
}
