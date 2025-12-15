// scripts/test-r2.ts
// Test Cloudflare R2 connection

import { readFileSync } from 'fs';
import { join } from 'path';

// Load .env manually
const envPath = join(process.cwd(), '.env');
try {
    const envContent = readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
        const match = line.match(/^([^#=]+)=(.*)$/);
        if (match) {
            process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
        }
    }
} catch (e) {
    console.log('Note: .env file not found');
}

async function testR2() {
    console.log('=== Cloudflare R2 Configuration Check ===\n');

    const r2Vars = {
        R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
        R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
        R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ? '****' + process.env.R2_SECRET_ACCESS_KEY.slice(-4) : undefined,
        R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
        R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
    };

    console.log('Environment Variables:');
    for (const [key, value] of Object.entries(r2Vars)) {
        const status = value ? '✅' : '❌';
        console.log(`  ${status} ${key}: ${value || 'NOT SET'}`);
    }

    const allConfigured = r2Vars.R2_ACCOUNT_ID &&
        r2Vars.R2_ACCESS_KEY_ID &&
        r2Vars.R2_SECRET_ACCESS_KEY &&
        r2Vars.R2_BUCKET_NAME;

    console.log('\n--- Summary ---');
    if (allConfigured) {
        console.log('✅ R2 is CONFIGURED! Invoice images will be stored in Cloudflare R2.');

        // Try to test connection
        try {
            const { S3Client, ListBucketsCommand } = await import('@aws-sdk/client-s3');

            const client = new S3Client({
                region: 'auto',
                endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                credentials: {
                    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
                    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
                },
            });

            console.log('\nTesting R2 connection...');
            await client.send(new ListBucketsCommand({}));
            console.log('✅ R2 connection SUCCESSFUL!');
        } catch (err) {
            console.log('⚠️ R2 connection test failed:', (err as Error).message);
        }
    } else {
        console.log('⚠️ R2 is NOT fully configured.');
        console.log('Invoice images will use PLACEHOLDER URLs (fallback mode).');
        console.log('\nTo enable R2 storage, add these to your .env file:');
        console.log('  R2_ACCOUNT_ID=your-account-id');
        console.log('  R2_ACCESS_KEY_ID=your-access-key');
        console.log('  R2_SECRET_ACCESS_KEY=your-secret-key');
        console.log('  R2_BUCKET_NAME=your-bucket-name');
    }

    console.log('\n--- Google Vision API ---');
    const hasVisionAPI = !!process.env.GOOGLE_CLOUD_API_KEY;
    console.log(hasVisionAPI
        ? '✅ GOOGLE_CLOUD_API_KEY is configured'
        : '❌ GOOGLE_CLOUD_API_KEY is NOT configured (OCR will not work)');
}

testR2().catch(console.error);
