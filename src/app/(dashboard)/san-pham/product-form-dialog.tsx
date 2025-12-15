// src/app/(dashboard)/san-pham/product-form-dialog.tsx
// Product Form Dialog for Create/Edit - Type Safe Version

'use client';

import { useEffect } from 'react';
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
import { MoneyInput } from '@/components/shared/money-input';
import { QuantityInput } from '@/components/shared/quantity-input';
import { useProducts } from '@/hooks/use-products';
import type { Product } from '@/types/product';
import { Loader2 } from 'lucide-react';

// ==========================================
// CONSTANTS - Single Source of Truth
// ==========================================

/** Enum values khớp với Prisma Schema */
const CATEGORY_VALUES = ['NONG_SAN', 'VAT_TU', 'MENU', 'NGUYEN_LIEU', 'OTHER'] as const;

/** Options cho Select dropdown */
const CATEGORY_OPTIONS: { value: typeof CATEGORY_VALUES[number]; label: string }[] = [
    { value: 'NONG_SAN', label: 'Nông sản' },
    { value: 'VAT_TU', label: 'Vật tư' },
    { value: 'MENU', label: 'Menu' },
    { value: 'NGUYEN_LIEU', label: 'Nguyên liệu' },
    { value: 'OTHER', label: 'Khác' },
];

/** Unit options */
const UNIT_OPTIONS = ['kg', 'g', 'lít', 'ml', 'cái', 'hộp', 'gói', 'chai', 'lon', 'bó', 'thùng'];

// ==========================================
// FORM SCHEMA - Type Safe with z.enum
// ==========================================

const formSchema = z.object({
    name: z.string().min(1, 'Tên sản phẩm không được để trống'),
    category: z.enum(CATEGORY_VALUES),
    unit: z.string().min(1),
    selling_price: z.number().min(0),
    purchase_price: z.number().min(0),
    stock_qty: z.number().min(0),
    min_stock: z.number().min(0),
    description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ==========================================
// COMPONENT
// ==========================================

interface ProductFormDialogProps {
    open: boolean;
    onClose: () => void;
    product?: Product | null;
}

export function ProductFormDialog({
    open,
    onClose,
    product,
}: ProductFormDialogProps) {
    const { createProduct, updateProduct, isCreating, isUpdating } = useProducts();
    const isEditing = !!product;
    const isLoading = isCreating || isUpdating;

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            category: 'NONG_SAN',
            unit: 'kg',
            selling_price: 0,
            purchase_price: 0,
            stock_qty: 0,
            min_stock: 0,
            description: '',
        },
    });

    // Reset form when dialog opens or product changes
    useEffect(() => {
        if (open) {
            if (product) {
                form.reset({
                    name: product.name,
                    category: product.category as typeof CATEGORY_VALUES[number],
                    unit: product.unit,
                    selling_price: product.selling_price,
                    purchase_price: product.purchase_price,
                    stock_qty: product.stock_qty,
                    min_stock: product.min_stock,
                    description: product.description || '',
                });
            } else {
                form.reset({
                    name: '',
                    category: 'NONG_SAN',
                    unit: 'kg',
                    selling_price: 0,
                    purchase_price: 0,
                    stock_qty: 0,
                    min_stock: 0,
                    description: '',
                });
            }
        }
    }, [open, product, form]);

    const onSubmit = async (data: FormValues) => {
        try {
            // data.category is already typed correctly as CATEGORY_VALUES[number]
            // No casting needed!
            if (isEditing && product) {
                await updateProduct({
                    id: product.id,
                    ...data,
                    version: product.version,
                });
            } else {
                await createProduct(data);
            }
            onClose();
        } catch {
            // Error handled by mutation
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Name */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tên sản phẩm *</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nhập tên sản phẩm" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Category & Unit */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Danh mục</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Chọn danh mục" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {CATEGORY_OPTIONS.map((opt) => (
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

                            <FormField
                                control={form.control}
                                name="unit"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Đơn vị tính</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Chọn đơn vị" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {UNIT_OPTIONS.map((unit) => (
                                                    <SelectItem key={unit} value={unit}>
                                                        {unit}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Prices */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="selling_price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Giá bán</FormLabel>
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

                            <FormField
                                control={form.control}
                                name="purchase_price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Giá nhập</FormLabel>
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
                        </div>

                        {/* Stock */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="stock_qty"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tồn kho</FormLabel>
                                        <FormControl>
                                            <QuantityInput
                                                value={field.value}
                                                onChange={field.onChange}
                                                suffix={form.watch('unit')}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="min_stock"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tồn tối thiểu</FormLabel>
                                        <FormControl>
                                            <QuantityInput
                                                value={field.value}
                                                onChange={field.onChange}
                                                suffix={form.watch('unit')}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Description */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mô tả</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Nhập mô tả sản phẩm (tùy chọn)"
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
