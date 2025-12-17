'use client';

// src/app/(dashboard)/cai-dat/thue/page.tsx
// Tax Settings Page - Task 9 Hybrid Tax Sync

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { TaxRule } from '@/types/tax-engine';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    RefreshCw,
    Check,
    Edit2,
    RotateCcw,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    History,
    ChevronDown,
    ChevronUp,
    ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

// ==========================================
// TYPES
// ==========================================

interface UpdateCheckData {
    has_updates: boolean;
    current_version: number | null;
    latest_version: number;
    changelog?: string;
}

interface SyncPreviewData {
    will_create: Array<{ code: string; description: string; value: number }>;
    will_update: Array<{
        code: string;
        description: string;
        old_value: number;
        new_value: number;
    }>;
    will_skip: Array<{
        code: string;
        description: string;
        reason: string;
        user_value: number;
        master_value: number;
    }>;
    master_version: number;
    current_version: number | null;
}

interface TaxRulesData {
    rules: TaxRule[];
    grouped: Record<string, TaxRule[]>;
    total: number;
}

// ==========================================
// LABELS & ICONS
// ==========================================

const RULE_TYPE_CONFIG: Record<
    string,
    { label: string; icon: string; color: string }
> = {
    VAT_RATE: { label: 'Thuế suất GTGT', icon: '💵', color: 'bg-emerald-500' },
    VAT_DEDUCTIBLE: { label: 'Khấu trừ VAT', icon: '📋', color: 'bg-green-500' },
    CIT_ADD_BACK: { label: 'Điều chỉnh TNDN', icon: '🏢', color: 'bg-blue-500' },
    PIT_DEDUCTION: { label: 'Giảm trừ TNCN', icon: '👤', color: 'bg-purple-500' },
    PIT_BRACKET: { label: 'Bậc thuế TNCN', icon: '📈', color: 'bg-pink-500' },
};

// ==========================================
// MAIN PAGE
// ==========================================

export default function TaxSettingsPage() {
    const queryClient = useQueryClient();
    const [showPreview, setShowPreview] = useState(false);
    const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['VAT_RATE', 'PIT_DEDUCTION']));

    // Check for updates
    const { data: updateCheck, isLoading: checkingUpdates } = useQuery({
        queryKey: ['tax-updates'],
        queryFn: async () => {
            const res = await apiClient.get<UpdateCheckData>('/settings/tax-rules/updates');
            return res.data as UpdateCheckData;
        },
        staleTime: 60000, // 1 minute
    });

    // Get all rules
    const { data: rulesData, isLoading: loadingRules } = useQuery({
        queryKey: ['tax-rules'],
        queryFn: async () => {
            const res = await apiClient.get<TaxRulesData>('/settings/tax-rules');
            return res.data as TaxRulesData;
        },
    });

    // Preview sync
    const { data: previewData, isLoading: loadingPreview } = useQuery({
        queryKey: ['tax-sync-preview'],
        queryFn: async () => {
            const res = await apiClient.get<SyncPreviewData>('/settings/tax-rules/sync');
            return res.data as SyncPreviewData;
        },
        enabled: showPreview,
    });

    // Sync mutation
    const syncMutation = useMutation({
        mutationFn: () => apiClient.post('/settings/tax-rules/sync', {}),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tax-rules'] });
            queryClient.invalidateQueries({ queryKey: ['tax-updates'] });
            queryClient.invalidateQueries({ queryKey: ['tax-sync-preview'] });
            setShowPreview(false);
            toast.success('Đồng bộ thành công!');
        },
        onError: (error) => {
            toast.error('Đồng bộ thất bại');
            console.error(error);
        },
    });

    const toggleType = (type: string) => {
        const newSet = new Set(expandedTypes);
        if (newSet.has(type)) {
            newSet.delete(type);
        } else {
            newSet.add(type);
        }
        setExpandedTypes(newSet);
    };

    if (loadingRules) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link href="/cai-dat">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">⚙️ Cài đặt Thuế</h1>
                    <p className="text-muted-foreground text-sm">
                        Quản lý quy tắc thuế VAT, TNDN, TNCN
                    </p>
                </div>
            </div>

            {/* Version & Sync Card */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                            <div className="text-sm text-muted-foreground">Phiên bản luật thuế</div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-lg font-bold">
                                    v{updateCheck?.current_version || 'N/A'}
                                </span>
                                {updateCheck?.has_updates && (
                                    <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        Có bản mới v{updateCheck.latest_version}
                                    </Badge>
                                )}
                                {!updateCheck?.has_updates && updateCheck?.current_version && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Đã cập nhật
                                    </Badge>
                                )}
                            </div>
                            {updateCheck?.changelog && updateCheck?.has_updates && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    📝 {updateCheck.changelog}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowPreview(!showPreview)}
                                disabled={!updateCheck?.has_updates}
                            >
                                <History className="w-4 h-4 mr-2" />
                                Xem trước
                            </Button>
                            <Button
                                variant={updateCheck?.has_updates ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => syncMutation.mutate()}
                                disabled={syncMutation.isPending || checkingUpdates}
                            >
                                {syncMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                )}
                                Cập nhật
                            </Button>
                        </div>
                    </div>

                    {/* Preview Panel */}
                    {showPreview && previewData && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                            <h3 className="font-medium">Xem trước thay đổi:</h3>

                            {previewData.will_create.length > 0 && (
                                <div className="text-sm">
                                    <span className="text-green-600 font-medium">
                                        + {previewData.will_create.length} luật mới
                                    </span>
                                </div>
                            )}

                            {previewData.will_update.length > 0 && (
                                <div className="space-y-1">
                                    <span className="text-sm text-blue-600 font-medium">
                                        ~ {previewData.will_update.length} luật thay đổi:
                                    </span>
                                    {previewData.will_update.map((item) => (
                                        <div key={item.code} className="text-xs text-muted-foreground ml-4">
                                            {item.description}: {formatValue(item.old_value)} → {formatValue(item.new_value)}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {previewData.will_skip.length > 0 && (
                                <div className="space-y-1">
                                    <span className="text-sm text-amber-600 font-medium">
                                        ⏭️ {previewData.will_skip.length} bỏ qua (đã tùy chỉnh):
                                    </span>
                                    {previewData.will_skip.map((item) => (
                                        <div key={item.code} className="text-xs text-muted-foreground ml-4">
                                            {item.description}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {previewData.will_create.length === 0 &&
                                previewData.will_update.length === 0 &&
                                previewData.will_skip.length === 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        Không có thay đổi nào.
                                    </p>
                                )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                <Card className="p-3">
                    <div className="text-2xl font-bold text-center">{rulesData?.total || 0}</div>
                    <div className="text-xs text-center text-muted-foreground">Tổng luật</div>
                </Card>
                <Card className="p-3">
                    <div className="text-2xl font-bold text-center text-amber-600">
                        {rulesData?.rules.filter((r) => r.is_overridden).length || 0}
                    </div>
                    <div className="text-xs text-center text-muted-foreground">Đã tùy chỉnh</div>
                </Card>
                <Card className="p-3">
                    <div className="text-2xl font-bold text-center text-green-600">
                        {rulesData?.rules.filter((r) => r.is_active).length || 0}
                    </div>
                    <div className="text-xs text-center text-muted-foreground">Đang áp dụng</div>
                </Card>
            </div>

            {/* Rules by Type */}
            {rulesData?.grouped &&
                Object.entries(rulesData.grouped).map(([ruleType, ruleList]) => {
                    const config = RULE_TYPE_CONFIG[ruleType] || {
                        label: ruleType,
                        icon: '📄',
                        color: 'bg-gray-500',
                    };
                    const isExpanded = expandedTypes.has(ruleType);

                    return (
                        <Card key={ruleType}>
                            <CardHeader
                                className="cursor-pointer hover:bg-muted/50 transition-colors"
                                onClick={() => toggleType(ruleType)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">{config.icon}</span>
                                        <CardTitle className="text-base">{config.label}</CardTitle>
                                        <Badge variant="outline">{ruleList.length}</Badge>
                                    </div>
                                    {isExpanded ? (
                                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                    )}
                                </div>
                            </CardHeader>
                            {isExpanded && (
                                <CardContent className="pt-0 space-y-2">
                                    {ruleList.map((rule) => (
                                        <TaxRuleRow key={rule.id} rule={rule} />
                                    ))}
                                </CardContent>
                            )}
                        </Card>
                    );
                })}
        </div>
    );
}

// ==========================================
// TAX RULE ROW COMPONENT
// ==========================================

function TaxRuleRow({ rule }: { rule: TaxRule }) {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(rule.value);

    const updateMutation = useMutation({
        mutationFn: (newValue: number) =>
            apiClient.put(`/settings/tax-rules/${rule.id}`, { value: newValue }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tax-rules'] });
            setIsEditing(false);
            toast.success('Đã lưu thay đổi!');
        },
        onError: () => toast.error('Lỗi cập nhật'),
    });

    const resetMutation = useMutation({
        mutationFn: () => apiClient.post(`/settings/tax-rules/${rule.id}/reset`, {}),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tax-rules'] });
            toast.success('Đã khôi phục mặc định!');
        },
        onError: () => toast.error('Lỗi khôi phục'),
    });

    const handleSave = () => {
        updateMutation.mutate(editValue);
    };

    const handleCancel = () => {
        setEditValue(rule.value);
        setIsEditing(false);
    };

    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
            <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{rule.description}</div>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground font-mono">{rule.code}</span>
                    {rule.reference && (
                        <span className="text-xs text-muted-foreground">• {rule.reference}</span>
                    )}
                </div>
                {rule.is_overridden && (
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                            ✏️ Đã tùy chỉnh
                        </Badge>
                        {rule.original_value !== null && rule.original_value !== undefined && rule.original_value !== rule.value && (
                            <span className="text-xs text-muted-foreground">
                                (Mặc định: {formatValue(rule.original_value, rule.rule_type)})
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {isEditing ? (
                    <>
                        <Input
                            type="number"
                            value={editValue}
                            onChange={(e) => setEditValue(Number(e.target.value))}
                            className="w-28 text-right"
                            autoFocus
                        />
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={handleCancel}>
                            Hủy
                        </Button>
                    </>
                ) : (
                    <>
                        <span className="text-lg font-bold font-mono">
                            {formatValue(rule.value, rule.rule_type)}
                        </span>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsEditing(true)}
                        >
                            <Edit2 className="w-4 h-4" />
                        </Button>
                        {rule.is_overridden && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => resetMutation.mutate()}
                                disabled={resetMutation.isPending}
                                title="Khôi phục mặc định"
                            >
                                {resetMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RotateCcw className="w-4 h-4" />
                                )}
                            </Button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ==========================================
// HELPERS
// ==========================================

function formatValue(value: number, ruleType?: string): string {
    if (ruleType === 'VAT_RATE' || ruleType === 'PIT_BRACKET' || value <= 100) {
        return `${value}%`;
    }
    return value.toLocaleString('vi-VN') + 'đ';
}
