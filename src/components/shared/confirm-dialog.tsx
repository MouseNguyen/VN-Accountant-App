// src/components/shared/confirm-dialog.tsx
// Reusable confirm dialog component

'use client';

import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange?: (open: boolean) => void;
    onCancel?: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
    onConfirm: () => void;
    isLoading?: boolean;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    onCancel,
    title,
    description,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    variant = 'default',
    onConfirm,
    isLoading = false,
}: ConfirmDialogProps) {
    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen && onCancel) {
            onCancel();
        }
        onOpenChange?.(isOpen);
    };

    const handleCancel = () => {
        onCancel?.();
        onOpenChange?.(false);
    };

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription className="whitespace-pre-line">
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isLoading} onClick={handleCancel}>
                        {cancelText}
                    </AlertDialogCancel>
                    <Button
                        variant={variant}
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Đang xử lý...
                            </>
                        ) : (
                            confirmText
                        )}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
