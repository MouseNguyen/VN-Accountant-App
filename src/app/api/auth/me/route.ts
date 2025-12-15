// src/app/api/auth/me/route.ts
// API: Get current user info

import { NextRequest, NextResponse } from 'next/server';
import { withAuthUnverified } from '@/lib/auth';

export const GET = withAuthUnverified(async (request: NextRequest, ctx, user) => {
    return NextResponse.json({
        success: true,
        data: {
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                email_verified: user.email_verified,
                role: user.role,
                avatar_url: user.avatar_url,
                phone: user.phone,
                created_at: user.created_at,
            },
            farm: {
                id: user.farm.id,
                name: user.farm.name,
                business_type: user.farm.business_type,
                owner_name: user.farm.owner_name,
            },
        },
    });
});
