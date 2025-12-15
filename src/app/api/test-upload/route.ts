// src/app/api/test-upload/route.ts
// Simple test endpoint to debug upload issues
// NOTE: This endpoint has NO AUTH - for debugging only!

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    console.log('[TEST-UPLOAD] ===== Request received! =====');
    console.log('[TEST-UPLOAD] Content-Length:', req.headers.get('content-length'));

    try {
        const body = await req.json();
        const imageLength = body.image?.length || 0;

        console.log('[TEST-UPLOAD] Body size:', imageLength, 'chars');
        console.log('[TEST-UPLOAD] Approx KB:', Math.round(imageLength / 1024));

        return NextResponse.json({
            success: true,
            message: 'Upload test successful',
            image_size_chars: imageLength,
            image_size_kb: Math.round(imageLength / 1024),
        });
    } catch (error) {
        console.error('[TEST-UPLOAD] Error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({ message: 'Test upload endpoint ready' });
}
