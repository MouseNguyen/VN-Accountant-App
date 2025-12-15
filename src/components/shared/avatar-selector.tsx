// src/components/shared/avatar-selector.tsx
// Avatar selector với popup grid các avatar options

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AVATAR_OPTIONS, getAvatarIcon } from '@/lib/constants/index';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';

interface AvatarSelectorProps {
    value?: string | null;
    onChange: (avatarUrl: string) => void;
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
}

const sizeClasses = {
    sm: 'w-10 h-10 text-xl',
    md: 'w-16 h-16 text-3xl',
    lg: 'w-24 h-24 text-5xl',
};

export function AvatarSelector({
    value,
    onChange,
    size = 'md',
    disabled = false,
}: AvatarSelectorProps) {
    const [open, setOpen] = useState(false);

    // value có thể là avatar id hoặc icon trực tiếp
    const displayIcon = getAvatarIcon(value);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                        'rounded-full bg-muted hover:bg-gray-200 flex items-center justify-center cursor-pointer transition-all border-2 border-transparent hover:border-emerald-500 hover:scale-105',
                        sizeClasses[size],
                        disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
                    )}
                >
                    {displayIcon}
                </button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Chọn Avatar</DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-4 gap-3 py-4">
                    {AVATAR_OPTIONS.map((avatar) => (
                        <button
                            key={avatar.id}
                            type="button"
                            onClick={() => {
                                onChange(avatar.id);
                                setOpen(false);
                            }}
                            className={cn(
                                'w-16 h-16 rounded-full flex items-center justify-center text-3xl transition-all hover:scale-110',
                                value === avatar.id
                                    ? 'bg-emerald-100 ring-2 ring-emerald-500'
                                    : 'bg-muted hover:bg-gray-200'
                            )}
                            title={avatar.label}
                        >
                            {avatar.icon}
                        </button>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Avatar Display (không có selector, chỉ hiển thị)
interface AvatarProps {
    avatarUrl?: string | null;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function Avatar({ avatarUrl, size = 'md', className }: AvatarProps) {
    const icon = getAvatarIcon(avatarUrl);

    return (
        <div
            className={cn(
                'rounded-full bg-muted flex items-center justify-center',
                sizeClasses[size],
                className
            )}
        >
            {icon}
        </div>
    );
}
