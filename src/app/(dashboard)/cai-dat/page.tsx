// src/app/(dashboard)/cai-dat/page.tsx
// Settings page with tabs for Farm, User, Security, and Tax Rules settings

'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FarmSettings } from './components/farm-settings';
import { UserSettings } from './components/user-settings';
import { SecuritySettings } from './components/security-settings';
import { TaxRulesSettings } from './components/tax-rules-settings';

export default function SettingsPage() {
    return (
        <div className="container max-w-4xl py-6 px-4 sm:px-6">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/dashboard" className="p-2 hover:bg-muted rounded-lg">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold">⚙️ Cài đặt</h1>
            </div>

            <Tabs defaultValue="farm" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="farm" className="gap-2">
                        <span className="hidden sm:inline">🏠</span> Nông trại
                    </TabsTrigger>
                    <TabsTrigger value="user" className="gap-2">
                        <span className="hidden sm:inline">👤</span> Tài khoản
                    </TabsTrigger>
                    <TabsTrigger value="security" className="gap-2">
                        <span className="hidden sm:inline">🔒</span> Bảo mật
                    </TabsTrigger>
                    <TabsTrigger value="tax-rules" className="gap-2">
                        <span className="hidden sm:inline">🧮</span> Quy tắc thuế
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="farm">
                    <FarmSettings />
                </TabsContent>

                <TabsContent value="user">
                    <UserSettings />
                </TabsContent>

                <TabsContent value="security">
                    <SecuritySettings />
                </TabsContent>

                <TabsContent value="tax-rules">
                    <TaxRulesSettings />
                </TabsContent>
            </Tabs>
        </div>
    );
}
