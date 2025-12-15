// src/app/(dashboard)/cai-dat/components/tax-rules-settings.tsx
// Tax Rules Settings Component - Phase 3

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, RotateCcw, Edit2, Check, X, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TaxRule {
    id: string;
    code: string;
    rule_type: string;
    category: string;
    action: string;
    value: number;
    original_value: number;
    limit_value?: number;
    description: string;
    reference?: string;
    is_overridden: boolean;
    is_active: boolean;
    priority: number;
}

interface GroupedRules {
    [ruleType: string]: TaxRule[];
}

const RULE_TYPE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
    'VAT_RATE': { label: 'Thuế suất VAT', icon: '💰', color: 'bg-emerald-500' },
    'VAT_DEDUCTIBLE': { label: 'Khấu trừ VAT', icon: '✅', color: 'bg-blue-500' },
    'CIT_ADD_BACK': { label: 'Điều chỉnh CIT', icon: '📊', color: 'bg-orange-500' },
    'PIT_DEDUCTION': { label: 'Giảm trừ PIT', icon: '👤', color: 'bg-purple-500' },
    'PIT_BRACKET': { label: 'Bậc thuế PIT', icon: '📈', color: 'bg-pink-500' },
};

const ACTION_LABELS: Record<string, { label: string; variant: 'default' | 'destructive' | 'outline' | 'secondary' }> = {
    'SET_RATE': { label: 'Đặt thuế suất', variant: 'default' },
    'DENY': { label: 'Từ chối', variant: 'destructive' },
    'PARTIAL': { label: 'Một phần', variant: 'secondary' },
    'ADD_BACK': { label: 'Cộng ngược', variant: 'destructive' },
    'DEDUCT': { label: 'Giảm trừ', variant: 'default' },
    'LIMIT': { label: 'Giới hạn', variant: 'secondary' },
    'WARN': { label: 'Cảnh báo', variant: 'outline' },
    'ALLOW': { label: 'Cho phép', variant: 'default' },
    'CALCULATE': { label: 'Tính toán', variant: 'secondary' },
};

function formatValue(value: number, ruleType: string, category: string): string {
    // Percentages
    if (category.includes('RATE') || category.includes('BRACKET') || category === 'INSURANCE') {
        return `${value}%`;
    }
    // Money values
    if (value >= 1000000) {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
            notation: 'compact',
        }).format(value);
    }
    if (value >= 1000) {
        return new Intl.NumberFormat('vi-VN').format(value) + 'đ';
    }
    return value.toString();
}

export function TaxRulesSettings() {
    const [rules, setRules] = useState<TaxRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [expandedTypes, setExpandedTypes] = useState<string[]>(['VAT_RATE', 'VAT_DEDUCTIBLE']);

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/settings/tax-rules');
            if (!res.ok) throw new Error('Failed to fetch');
            const json = await res.json();
            // API returns { success, data: { rules, grouped, total } }
            const rulesData = json.data?.rules || json.rules || [];
            setRules(rulesData);
        } catch (error) {
            toast.error('Không thể tải quy tắc thuế');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (rule: TaxRule) => {
        setEditingId(rule.id);
        setEditValue(rule.value.toString());
    };

    const handleSave = async (ruleId: string) => {
        const newValue = parseFloat(editValue);
        if (isNaN(newValue)) {
            toast.error('Giá trị không hợp lệ');
            return;
        }

        try {
            setSaving(true);
            const res = await fetch(`/api/settings/tax-rules/${ruleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: newValue }),
            });

            if (!res.ok) throw new Error('Failed to update');

            const data = await res.json();
            setRules(prev => prev.map(r => r.id === ruleId ? { ...r, ...data.rule } : r));
            setEditingId(null);
            toast.success('Đã cập nhật quy tắc');
        } catch (error) {
            toast.error('Không thể cập nhật');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async (ruleId: string) => {
        try {
            setSaving(true);
            const res = await fetch(`/api/settings/tax-rules/${ruleId}/reset`, {
                method: 'POST',
            });

            if (!res.ok) throw new Error('Failed to reset');

            const data = await res.json();
            setRules(prev => prev.map(r => r.id === ruleId ? { ...r, ...data.rule } : r));
            toast.success('Đã khôi phục giá trị mặc định');
        } catch (error) {
            toast.error('Không thể khôi phục');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    const toggleExpand = (ruleType: string) => {
        setExpandedTypes(prev =>
            prev.includes(ruleType)
                ? prev.filter(t => t !== ruleType)
                : [...prev, ruleType]
        );
    };

    // Group rules by type
    const groupedRules: GroupedRules = rules.reduce((acc, rule) => {
        if (!acc[rule.rule_type]) acc[rule.rule_type] = [];
        acc[rule.rule_type].push(rule);
        return acc;
    }, {} as GroupedRules);

    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span>Đang tải quy tắc thuế...</span>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        🧮 Quy tắc thuế
                        <Badge variant="secondary">{rules.length} rules</Badge>
                    </CardTitle>
                    <CardDescription>
                        Quản lý các quy tắc thuế VAT, CIT, PIT theo quy định Việt Nam.
                        Có thể tùy chỉnh giá trị cho farm của bạn.
                    </CardDescription>
                </CardHeader>
            </Card>

            {Object.entries(groupedRules).map(([ruleType, typeRules]) => {
                const typeInfo = RULE_TYPE_LABELS[ruleType] || {
                    label: ruleType,
                    icon: '📋',
                    color: 'bg-gray-500'
                };
                const isExpanded = expandedTypes.includes(ruleType);

                return (
                    <Card key={ruleType}>
                        <CardHeader
                            className="cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleExpand(ruleType)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xl">{typeInfo.icon}</span>
                                    <div>
                                        <CardTitle className="text-lg">{typeInfo.label}</CardTitle>
                                        <CardDescription>{typeRules.length} quy tắc</CardDescription>
                                    </div>
                                </div>
                                {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                            </div>
                        </CardHeader>

                        {isExpanded && (
                            <CardContent className="pt-0">
                                <div className="divide-y">
                                    {typeRules.sort((a, b) => a.priority - b.priority).map(rule => (
                                        <div key={rule.id} className="py-3 flex items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                        {rule.code}
                                                    </span>
                                                    <Badge variant={ACTION_LABELS[rule.action]?.variant || 'outline'} className="text-xs">
                                                        {ACTION_LABELS[rule.action]?.label || rule.action}
                                                    </Badge>
                                                    {rule.is_overridden && (
                                                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                                                            Đã tùy chỉnh
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm mt-1 text-muted-foreground truncate" title={rule.description}>
                                                    {rule.description}
                                                </p>
                                                {rule.reference && (
                                                    <p className="text-xs text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                                                        <Info className="w-3 h-3" />
                                                        {rule.reference}
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 shrink-0">
                                                {editingId === rule.id ? (
                                                    <>
                                                        <Input
                                                            type="number"
                                                            value={editValue}
                                                            onChange={(e) => setEditValue(e.target.value)}
                                                            className="w-32 h-8 text-right"
                                                            autoFocus
                                                        />
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8"
                                                            onClick={() => handleSave(rule.id)}
                                                            disabled={saving}
                                                        >
                                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 text-green-600" />}
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8"
                                                            onClick={() => setEditingId(null)}
                                                        >
                                                            <X className="w-4 h-4 text-red-600" />
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className={cn(
                                                            "font-mono font-semibold text-right min-w-[80px]",
                                                            rule.is_overridden && "text-amber-600"
                                                        )}>
                                                            {formatValue(rule.value, rule.rule_type, rule.category)}
                                                        </span>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8"
                                                            onClick={() => handleEdit(rule)}
                                                            title="Chỉnh sửa"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        {rule.is_overridden && (
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8"
                                                                onClick={() => handleReset(rule.id)}
                                                                disabled={saving}
                                                                title="Khôi phục mặc định"
                                                            >
                                                                <RotateCcw className="w-4 h-4 text-muted-foreground" />
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}
