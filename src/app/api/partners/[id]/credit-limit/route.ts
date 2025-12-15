// src/app/api/partners/[id]/credit-limit/route.ts
// API endpoint to update partner credit limit

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { updateCreditLimitSchema } from '@/lib/validations/payable';
import { updateCreditLimit } from '@/services/payable.service';

import { serializeDecimals } from '@/lib/api-utils';
export const PUT = withAuth(async (req: NextRequest, authData) => {
    // Extract partner ID from URL
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const partnerId = pathParts[pathParts.indexOf('partners') + 1];

    if (!partnerId || partnerId === 'undefined') {
        return NextResponse.json(
            { error: 'Partner ID is required' },
            { status: 400 }
        );
    }

    const body = await req.json();
    const validation = updateCreditLimitSchema.safeParse(body);

    if (!validation.success) {
        return NextResponse.json(
            { error: validation.error.issues[0].message },
            { status: 400 }
        );
    }

    const { credit_limit, payment_term_days } = validation.data;

    const updated = await updateCreditLimit(
        partnerId,
        credit_limit,
        payment_term_days
    );

    return NextResponse.json({
        success: true,
        data: {
            id: updated.id,
            name: updated.name,
            credit_limit: Number(updated.credit_limit),
            payment_term_days: updated.payment_term_days,
        },
    });
});
