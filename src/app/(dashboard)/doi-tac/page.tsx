// src/app/(dashboard)/doi-tac/page.tsx
// Trang quản lý đối tác (khách hàng, nhà cung cấp)

'use client';

import { useState, useCallback } from 'react';
import { Plus, Download, Trash2, Users, Phone, Mail, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { SearchInput } from '@/components/shared/search-input';
import { EmptyState } from '@/components/shared/empty-state';
import { LoadMoreButton } from '@/components/shared/load-more-button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { usePartners } from '@/hooks/use-partners';
import { PartnerFormDialog } from './partner-form-dialog';
import type { Partner } from '@/types/partner';
import type { PartnerType } from '@prisma/client';

// Type labels
const TYPE_LABELS: Record<PartnerType, string> = {
    CUSTOMER: 'Khách hàng',
    VENDOR: 'Nhà cung cấp',
    BOTH: 'Cả hai',
};

const TYPE_COLORS: Record<PartnerType, string> = {
    CUSTOMER: 'bg-blue-100 text-blue-800',
    VENDOR: 'bg-orange-100 text-orange-800',
    BOTH: 'bg-purple-100 text-purple-800',
};

const TYPE_ICONS: Record<PartnerType, string> = {
    CUSTOMER: '👤',
    VENDOR: '🏭',
    BOTH: '🤝',
};

export default function DoiTacPage() {
    // Filters
    const [search, setSearch] = useState('');
    const [partnerType, setPartnerType] = useState<PartnerType | 'ALL'>('ALL');

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Dialogs
    const [formOpen, setFormOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
    const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

    // Query
    const {
        partners,
        total,
        isLoading,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        deletePartner,
        bulkDelete,
        isDeleting,
        isBulkDeleting,
    } = usePartners({
        search: search || undefined,
        partner_type: partnerType !== 'ALL' ? partnerType : undefined,
        limit: 20,
    });

    // Handlers
    const handleSearch = useCallback((value: string) => {
        setSearch(value);
        setSelectedIds(new Set());
    }, []);

    const handleTypeChange = useCallback((value: string) => {
        setPartnerType(value as PartnerType | 'ALL');
        setSelectedIds(new Set());
    }, []);

    const handleSelectAll = useCallback(
        (checked: boolean) => {
            if (checked) {
                setSelectedIds(new Set(partners.map((p) => p.id)));
            } else {
                setSelectedIds(new Set());
            }
        },
        [partners]
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

    const handleEdit = useCallback((partner: Partner) => {
        setEditingPartner(partner);
        setFormOpen(true);
    }, []);

    const handleDelete = useCallback((partner: Partner) => {
        setPartnerToDelete(partner);
        setDeleteDialogOpen(true);
    }, []);

    const confirmDelete = useCallback(async () => {
        if (!partnerToDelete) return;
        await deletePartner(partnerToDelete.id);
        setDeleteDialogOpen(false);
        setPartnerToDelete(null);
    }, [partnerToDelete, deletePartner]);

    const confirmBulkDelete = useCallback(async () => {
        await bulkDelete(Array.from(selectedIds));
        setBulkDeleteDialogOpen(false);
        setSelectedIds(new Set());
    }, [selectedIds, bulkDelete]);

    const handleExport = useCallback(() => {
        window.open('/api/partners/export', '_blank');
    }, []);

    const handleFormClose = useCallback(() => {
        setFormOpen(false);
        setEditingPartner(null);
    }, []);

    const formatMoney = (value: number) => {
        if (value === 0) return '-';
        const formatted = new Intl.NumberFormat('vi-VN').format(Math.abs(value));
        return value > 0 ? `+${formatted}đ` : `-${formatted}đ`;
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Đối tác</h1>
                    <p className="text-muted-foreground">Quản lý khách hàng và nhà cung cấp</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Xuất Excel
                    </Button>
                    <Button onClick={() => setFormOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Thêm đối tác
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={partnerType} onValueChange={handleTypeChange}>
                <TabsList>
                    <TabsTrigger value="ALL">Tất cả</TabsTrigger>
                    <TabsTrigger value="CUSTOMER">
                        👤 Khách hàng
                    </TabsTrigger>
                    <TabsTrigger value="VENDOR">
                        🏭 Nhà cung cấp
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <SearchInput
                                placeholder="Tìm theo tên, SĐT, mã đối tác..."
                                onSearch={handleSearch}
                            />
                        </div>
                    </div>

                    {/* Bulk actions */}
                    {selectedIds.size > 0 && (
                        <div className="mt-4 flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                            <span className="text-sm text-blue-700">
                                Đã chọn {selectedIds.size} đối tác
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

            {/* Partners List */}
            <Card>
                <CardHeader className="border-b">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Danh sách đối tác
                            {total > 0 && <Badge variant="secondary">{total}</Badge>}
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : partners.length === 0 ? (
                        <EmptyState
                            icon="👥"
                            title="Chưa có đối tác nào"
                            description={
                                search
                                    ? 'Không tìm thấy đối tác phù hợp'
                                    : 'Thêm khách hàng hoặc nhà cung cấp đầu tiên'
                            }
                            action={
                                !search && (
                                    <Button onClick={() => setFormOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Thêm đối tác
                                    </Button>
                                )
                            }
                        />
                    ) : (
                        <>
                            {/* Grid Cards on Mobile, Table on Desktop */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-muted border-b">
                                        <tr>
                                            <th className="w-12 p-3">
                                                <Checkbox
                                                    checked={
                                                        partners.length > 0 &&
                                                        selectedIds.size === partners.length
                                                    }
                                                    onCheckedChange={handleSelectAll}
                                                />
                                            </th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">
                                                Mã
                                            </th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">
                                                Tên đối tác
                                            </th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">
                                                Loại
                                            </th>
                                            <th className="text-left p-3 font-medium text-muted-foreground">
                                                Liên hệ
                                            </th>
                                            <th className="text-right p-3 font-medium text-muted-foreground">
                                                Công nợ
                                            </th>
                                            <th className="w-24 p-3"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {partners.map((partner) => (
                                            <tr
                                                key={partner.id}
                                                className="hover:bg-muted transition-colors"
                                            >
                                                <td className="p-3">
                                                    <Checkbox
                                                        checked={selectedIds.has(partner.id)}
                                                        onCheckedChange={(checked) =>
                                                            handleSelectOne(partner.id, checked as boolean)
                                                        }
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <span className="font-mono text-sm text-muted-foreground">
                                                        {partner.code}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <div>
                                                        <div className="font-medium flex items-center gap-2">
                                                            <span>{TYPE_ICONS[partner.partner_type as PartnerType]}</span>
                                                            {partner.name}
                                                        </div>
                                                        {partner.company_name && (
                                                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                                                                <Building2 className="h-3 w-3" />
                                                                {partner.company_name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <Badge
                                                        className={TYPE_COLORS[partner.partner_type as PartnerType]}
                                                    >
                                                        {TYPE_LABELS[partner.partner_type as PartnerType]}
                                                    </Badge>
                                                </td>
                                                <td className="p-3">
                                                    <div className="space-y-1 text-sm">
                                                        {partner.phone && (
                                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                                <Phone className="h-3 w-3" />
                                                                {partner.phone}
                                                            </div>
                                                        )}
                                                        {partner.email && (
                                                            <div className="flex items-center gap-1 text-muted-foreground">
                                                                <Mail className="h-3 w-3" />
                                                                {partner.email}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-3 text-right">
                                                    <span
                                                        className={
                                                            partner.balance > 0
                                                                ? 'text-green-600 font-medium'
                                                                : partner.balance < 0
                                                                    ? 'text-red-600 font-medium'
                                                                    : 'text-muted-foreground'
                                                        }
                                                    >
                                                        {formatMoney(partner.balance)}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEdit(partner)}
                                                        >
                                                            Sửa
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700"
                                                            onClick={() => handleDelete(partner)}
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

                            {/* Mobile Cards */}
                            <div className="md:hidden divide-y">
                                {partners.map((partner) => (
                                    <div
                                        key={partner.id}
                                        className="p-4 flex items-start gap-3"
                                        onClick={() => handleEdit(partner)}
                                    >
                                        <Checkbox
                                            checked={selectedIds.has(partner.id)}
                                            onCheckedChange={(checked) => {
                                                handleSelectOne(partner.id, checked as boolean);
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{TYPE_ICONS[partner.partner_type as PartnerType]}</span>
                                                <span className="font-medium truncate">{partner.name}</span>
                                            </div>
                                            <div className="text-sm text-muted-foreground">{partner.code}</div>
                                            {partner.phone && (
                                                <div className="text-sm text-muted-foreground mt-1">{partner.phone}</div>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <Badge className={TYPE_COLORS[partner.partner_type as PartnerType]}>
                                                {TYPE_LABELS[partner.partner_type as PartnerType]}
                                            </Badge>
                                            <div className={`text-sm mt-1 ${partner.balance !== 0 ? 'font-medium' : 'text-muted-foreground'}`}>
                                                {formatMoney(partner.balance)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Load More */}
                            <LoadMoreButton
                                hasMore={hasNextPage ?? false}
                                isLoading={isFetchingNextPage}
                                onClick={() => fetchNextPage()}
                                loadedCount={partners.length}
                                totalCount={total}
                            />
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Form Dialog */}
            <PartnerFormDialog
                open={formOpen}
                onClose={handleFormClose}
                partner={editingPartner}
            />

            {/* Delete Confirm Dialog */}
            <ConfirmDialog
                open={deleteDialogOpen}
                title="Xóa đối tác"
                description={`Bạn có chắc muốn xóa đối tác "${partnerToDelete?.name}"? Hành động này không thể hoàn tác.`}
                confirmText="Xóa"
                variant="destructive"
                isLoading={isDeleting}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteDialogOpen(false)}
            />

            {/* Bulk Delete Confirm Dialog */}
            <ConfirmDialog
                open={bulkDeleteDialogOpen}
                title="Xóa nhiều đối tác"
                description={`Bạn có chắc muốn xóa ${selectedIds.size} đối tác đã chọn? Hành động này không thể hoàn tác.`}
                confirmText={`Xóa ${selectedIds.size} đối tác`}
                variant="destructive"
                isLoading={isBulkDeleting}
                onConfirm={confirmBulkDelete}
                onCancel={() => setBulkDeleteDialogOpen(false)}
            />
        </div>
    );
}
