// src/app/(dashboard)/doi-tac/partner-form-dialog.tsx
// Partner Form Dialog for Create/Edit - Type Safe Version with MST Lookup

'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MoneyInput } from '@/components/shared/money-input';
import { usePartners } from '@/hooks/use-partners';
import type { Partner } from '@/types/partner';
import { Loader2, Search, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// ==========================================
// CONSTANTS - Single Source of Truth
// ==========================================

/** Enum values khớp với Prisma Schema */
const PARTNER_TYPE_VALUES = ['CUSTOMER', 'VENDOR', 'BOTH'] as const;

/** Options cho Select dropdown */
const PARTNER_TYPE_OPTIONS: { value: typeof PARTNER_TYPE_VALUES[number]; label: string }[] = [
    { value: 'CUSTOMER', label: '👤 Khách hàng' },
    { value: 'VENDOR', label: '🏭 Nhà cung cấp' },
    { value: 'BOTH', label: '🤝 Cả hai' },
];

// ==========================================
// FORM SCHEMA - Type Safe with z.enum
// ==========================================

const formSchema = z.object({
    name: z.string().min(1, 'Tên đối tác không được để trống'),
    partner_type: z.enum(PARTNER_TYPE_VALUES),
    phone: z.string().optional(),
    email: z.string().email('Email không hợp lệ').or(z.literal('')).optional(),
    address: z.string().optional(),
    contact_name: z.string().optional(),
    company_name: z.string().optional(),
    tax_code: z.string().optional(),
    notes: z.string().optional(),
    credit_limit: z.number().min(0),
});

type FormValues = z.infer<typeof formSchema>;

// ==========================================
// COMPONENT
// ==========================================

interface PartnerFormDialogProps {
    open: boolean;
    onClose: () => void;
    partner?: Partner | null;
}

export function PartnerFormDialog({
    open,
    onClose,
    partner,
}: PartnerFormDialogProps) {
    const { createPartner, updatePartner, isCreating, isUpdating } = usePartners();
    const isEditing = !!partner;
    const isLoading = isCreating || isUpdating;

    // MST Lookup State
    const [mstLoading, setMstLoading] = useState(false);
    const [mstResult, setMstResult] = useState<{
        success: boolean;
        name?: string;
        address?: string;
        error?: string;
    } | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            partner_type: 'CUSTOMER',
            phone: '',
            email: '',
            address: '',
            contact_name: '',
            company_name: '',
            tax_code: '',
            notes: '',
            credit_limit: 0,
        },
    });

    // Reset form when dialog opens or partner changes
    useEffect(() => {
        if (open) {
            if (partner) {
                form.reset({
                    name: partner.name,
                    partner_type: partner.partner_type as typeof PARTNER_TYPE_VALUES[number],
                    phone: partner.phone || '',
                    email: partner.email || '',
                    address: partner.address || '',
                    contact_name: partner.contact_name || '',
                    company_name: partner.company_name || '',
                    tax_code: partner.tax_code || '',
                    notes: partner.notes || '',
                    credit_limit: partner.credit_limit || 0,
                });
            } else {
                form.reset({
                    name: '',
                    partner_type: 'CUSTOMER',
                    phone: '',
                    email: '',
                    address: '',
                    contact_name: '',
                    company_name: '',
                    tax_code: '',
                    notes: '',
                    credit_limit: 0,
                });
            }
        }
    }, [open, partner, form]);

    // MST Lookup Handler
    const handleMSTLookup = async () => {
        const taxCode = form.getValues('tax_code');
        if (!taxCode || taxCode.length < 10) {
            toast.error('Vui lòng nhập MST (10 hoặc 13 số)');
            return;
        }

        setMstLoading(true);
        setMstResult(null);

        try {
            const res = await fetch(`/api/tax/mst-lookup?tax_code=${taxCode}`);
            const json = await res.json();

            if (json.success && json.data) {
                setMstResult({
                    success: true,
                    name: json.data.name,
                    address: json.data.address,
                });

                // Auto-fill company name and address
                if (json.data.name) {
                    form.setValue('company_name', json.data.name);
                }
                if (json.data.address) {
                    form.setValue('address', json.data.address);
                }

                toast.success('Đã tìm thấy thông tin MST');
            } else {
                setMstResult({
                    success: false,
                    error: json.error || 'Không tìm thấy MST',
                });
                toast.error(json.error || 'Không tìm thấy MST');
            }
        } catch (error) {
            setMstResult({
                success: false,
                error: 'Lỗi kết nối',
            });
            toast.error('Lỗi khi tra cứu MST');
        } finally {
            setMstLoading(false);
        }
    };

    const onSubmit = async (data: FormValues) => {
        try {
            // data.partner_type is already typed correctly as PARTNER_TYPE_VALUES[number]
            // No casting needed!
            if (isEditing && partner) {
                await updatePartner({
                    id: partner.id,
                    ...data,
                    version: partner.version,
                });
            } else {
                await createPartner(data);
            }
            onClose();
        } catch {
            // Error handled by mutation
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Chỉnh sửa đối tác' : 'Thêm đối tác mới'}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Name & Type */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tên đối tác *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nhập tên đối tác" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="partner_type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Loại đối tác</FormLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Chọn loại" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {PARTNER_TYPE_OPTIONS.map((opt) => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Contact Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Số điện thoại</FormLabel>
                                        <FormControl>
                                            <Input placeholder="0901234567" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="email@example.com"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="address"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Địa chỉ</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nhập địa chỉ" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Business Info */}
                        <div className="space-y-4">
                            {/* MST with Lookup Button */}
                            <FormField
                                control={form.control}
                                name="tax_code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mã số thuế</FormLabel>
                                        <div className="flex gap-2">
                                            <FormControl>
                                                <Input
                                                    placeholder="0123456789"
                                                    {...field}
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        setMstResult(null); // Reset result on change
                                                    }}
                                                />
                                            </FormControl>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                onClick={handleMSTLookup}
                                                disabled={mstLoading}
                                                title="Tra cứu MST"
                                            >
                                                {mstLoading ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Search className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                        <FormMessage />

                                        {/* MST Lookup Result */}
                                        {mstResult && (
                                            <div className={`mt-2 p-2 rounded-md text-sm ${mstResult.success
                                                    ? 'bg-green-50 border border-green-200 dark:bg-green-950/30 dark:border-green-900'
                                                    : 'bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900'
                                                }`}>
                                                {mstResult.success ? (
                                                    <div className="flex items-start gap-2">
                                                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                                                        <div>
                                                            <p className="font-medium text-green-700 dark:text-green-400">
                                                                {mstResult.name}
                                                            </p>
                                                            {mstResult.address && (
                                                                <p className="text-green-600/80 dark:text-green-500/80 text-xs mt-0.5">
                                                                    {mstResult.address}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                                                        <span className="text-red-700 dark:text-red-400">
                                                            {mstResult.error}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </FormItem>
                                )}
                            />

                            {/* Company Name - Auto-filled from MST lookup */}
                            <FormField
                                control={form.control}
                                name="company_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                            Tên công ty
                                            {mstResult?.success && (
                                                <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                                                    Từ MST
                                                </Badge>
                                            )}
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="Công ty ABC" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="contact_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Người liên hệ</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Tên người liên hệ" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Credit Limit */}
                        <FormField
                            control={form.control}
                            name="credit_limit"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Hạn mức công nợ</FormLabel>
                                    <FormControl>
                                        <MoneyInput
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="0"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Notes */}
                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ghi chú</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Nhập ghi chú (tùy chọn)"
                                            rows={3}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Hủy
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? 'Cập nhật' : 'Thêm mới'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
