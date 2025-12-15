// src/app/(dashboard)/san-pham/page.tsx
// Trang quản lý sản phẩm

'use client';

import { useState, useCallback } from 'react';
import { Plus, Download, Trash2, Package, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/shared/search-input';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadMoreButton } from '@/components/shared/load-more-button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useProducts } from '@/hooks/use-products';
import { ProductFormDialog } from './product-form-dialog';
import type { Product } from '@/types/product';
import type { ProductCategory } from '@prisma/client';

// Category labels
const CATEGORY_LABELS: Record<ProductCategory, string> = {
    NONG_SAN: 'Nông sản',
    VAT_TU: 'Vật tư',
    MENU: 'Menu',
    NGUYEN_LIEU: 'Nguyên liệu',
    OTHER: 'Khác',
};

const CATEGORY_COLORS: Record<ProductCategory, string> = {
    NONG_SAN: 'bg-green-100 text-green-800',
    VAT_TU: 'bg-blue-100 text-blue-800',
    MENU: 'bg-orange-100 text-orange-800',
    NGUYEN_LIEU: 'bg-purple-100 text-purple-800',
    OTHER: 'bg-muted text-foreground',
};

export default function SanPhamPage() {
    // Filters
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<ProductCategory | 'ALL'>('ALL');

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Dialogs
    const [formOpen, setFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

    // Query
    const {
        products,
        total,
        isLoading,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        deleteProduct,
        bulkDelete,
        isDeleting,
        isBulkDeleting,
    } = useProducts({
        search: search || undefined,
        category: category !== 'ALL' ? category : undefined,
        limit: 20,
    });

    // Handlers
    const handleSearch = useCallback((value: string) => {
        setSearch(value);
        setSelectedIds(new Set()); // Clear selection on search
    }, []);

    const handleCategoryChange = useCallback((value: string) => {
        setCategory(value as ProductCategory | 'ALL');
        setSelectedIds(new Set());
    }, []);

    const handleSelectAll = useCallback(
        (checked: boolean) => {
            if (checked) {
                setSelectedIds(new Set(products.map((p) => p.id)));
            } else {
                setSelectedIds(new Set());
            }
        },
        [products]
    );

    const handleSelectOne = useCallback((id: string, checked: boolean) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (checked) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    }, []);

    const handleEdit = useCallback((product: Product) => {
        setEditingProduct(product);
        setFormOpen(true);
    }, []);

    const handleDelete = useCallback((product: Product) => {
        setProductToDelete(product);
        setDeleteDialogOpen(true);
    }, []);

    const confirmDelete = useCallback(async () => {
        if (!productToDelete) return;
        await deleteProduct(productToDelete.id);
        setDeleteDialogOpen(false);
        setProductToDelete(null);
    }, [productToDelete, deleteProduct]);

    const confirmBulkDelete = useCallback(async () => {
        await bulkDelete(Array.from(selectedIds));
        setBulkDeleteDialogOpen(false);
        setSelectedIds(new Set());
    }, [selectedIds, bulkDelete]);

    const handleExport = useCallback(() => {
        window.open('/api/products/export', '_blank');
    }, []);

    const handleFormClose = useCallback(() => {
        setFormOpen(false);
        setEditingProduct(null);
    }, []);

    const formatMoney = (value: number) => {
        return new Intl.NumberFormat('vi-VN').format(value) + 'đ';
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Sản phẩm</h1>
                    <p className="text-muted-foreground">Quản lý danh sách sản phẩm, nông sản, vật tư</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Xuất Excel
                    </Button>
                    <Button onClick={() => setFormOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Thêm sản phẩm
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <SearchInput
                                placeholder="Tìm theo tên, mã sản phẩm..."
                                onSearch={handleSearch}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select value={category} onValueChange={handleCategoryChange}>
                                <SelectTrigger className="w-[160px]">
                                    <Filter className="mr-2 h-4 w-4" />
                                    <SelectValue placeholder="Danh mục" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Tất cả</SelectItem>
                                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Bulk actions */}
                    {selectedIds.size > 0 && (
                        <div className="mt-4 flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                            <span className="text-sm text-blue-700">
                                Đã chọn {selectedIds.size} sản phẩm
                            </span>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setBulkDeleteDialogOpen(true)}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Xóa đã chọn
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedIds(new Set())}
                            >
                                Bỏ chọn
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Products List */}
            <Card>
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5" />
                            Danh sách sản phẩm
                            {total > 0 && (
                                <Badge variant="secondary">{total}</Badge>
                            )}
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : products.length === 0 ? (
                        <EmptyState
                            icon="📦"
                            title="Chưa có sản phẩm nào"
                            description={
                                search
                                    ? 'Không tìm thấy sản phẩm phù hợp'
                                    : 'Thêm sản phẩm đầu tiên để bắt đầu quản lý'
                            }
                            action={
                                !search && (
                                    <Button onClick={() => setFormOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Thêm sản phẩm
                                    </Button>
                                )
                            }
                        />
                    ) : (
                        <>
                            {/* Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted border-b">
                                        <tr>
                                            <th className="w-12 p-3">
                                                <Checkbox
                                                    checked={
                                                        products.length > 0 &&
                                                        selectedIds.size === products.length
                                                    }
                                                    onCheckedChange={handleSelectAll}
                                                />
                                            </th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">
                                                Mã
                                            </th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">
                                                Tên sản phẩm
                                            </th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">
                                                Danh mục
                                            </th>
                                            <th className="text-right p-3 font-medium text-muted-foreground">
                                                Giá bán
                                            </th>
                                            <th className="text-right p-3 font-medium text-muted-foreground">
                                                Tồn kho
                                            </th>
                                            <th className="text-center p-3 font-medium text-muted-foreground">
                                                Trạng thái
                                            </th>
                                            <th className="w-24 p-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {products.map((product) => (
                                            <tr
                                                key={product.id}
                                                className="hover:bg-muted transition-colors"
                                            >
                                                <td className="p-3">
                                                    <Checkbox
                                                        checked={selectedIds.has(product.id)}
                                                        onCheckedChange={(checked) =>
                                                            handleSelectOne(product.id, checked as boolean)
                                                        }
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <span className="font-mono text-sm text-muted-foreground">
                                                        {product.code}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <div>
                                                        <div className="font-medium">{product.name}</div>
                                                        {product.description && (
                                                            <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                                                {product.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <Badge
                                                        className={
                                                            CATEGORY_COLORS[product.category as ProductCategory]
                                                        }
                                                    >
                                                        {CATEGORY_LABELS[product.category as ProductCategory]}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 text-right font-medium">
                                                    {formatMoney(product.selling_price)}
                                                </td>
                                                <td className="p-3 text-right">
                                                    <span
                                                        className={
                                                            product.stock_qty <= product.min_stock
                                                                ? 'text-red-600 font-medium'
                                                                : ''
                                                        }
                                                    >
                                                        {product.stock_qty} {product.unit}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <Badge
                                                        variant={product.is_active ? 'default' : 'secondary'}
                                                    >
                                                        {product.is_active ? 'Đang bán' : 'Ngừng'}
                                                    </Badge>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEdit(product)}
                                                        >
                                                            Sửa
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700"
                                                            onClick={() => handleDelete(product)}
                                                        >
                                                            Xóa
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Load More */}
                            <LoadMoreButton
                                hasMore={hasNextPage ?? false}
                                isLoading={isFetchingNextPage}
                                onClick={() => fetchNextPage()}
                                loadedCount={products.length}
                                totalCount={total}
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Form Dialog */}
            <ProductFormDialog
                open={formOpen}
                onClose={handleFormClose}
                product={editingProduct}
            />

            {/* Delete Confirm Dialog */}
            <ConfirmDialog
                open={deleteDialogOpen}
                title="Xóa sản phẩm"
                description={`Bạn có chắc muốn xóa sản phẩm "${productToDelete?.name}"? Hành động này không thể hoàn tác.`}
                confirmText="Xóa"
                variant="destructive"
                isLoading={isDeleting}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteDialogOpen(false)}
            />

            {/* Bulk Delete Confirm Dialog */}
            <ConfirmDialog
                open={bulkDeleteDialogOpen}
                title="Xóa nhiều sản phẩm"
                description={`Bạn có chắc muốn xóa ${selectedIds.size} sản phẩm đã chọn? Hành động này không thể hoàn tác.`}
                confirmText={`Xóa ${selectedIds.size} sản phẩm`}
                variant="destructive"
                isLoading={isBulkDeleting}
                onConfirm={confirmBulkDelete}
                onCancel={() => setBulkDeleteDialogOpen(false)}
            />
        </div>
    );
}
