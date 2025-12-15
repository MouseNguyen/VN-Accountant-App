// scripts/list-r2-files.ts
// List files in R2 bucket

import { readFileSync } from 'fs';
import { join } from 'path';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

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

async function listR2Files() {
    const client = new S3Client({
        region: 'auto',
        endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID!,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
        },
    });

    console.log('=== Files in R2 Bucket ===\n');
    console.log(`Bucket: ${process.env.R2_BUCKET_NAME}`);
    console.log(`Folder: invoices/\n`);

    try {
        const response = await client.send(new ListObjectsV2Command({
            Bucket: process.env.R2_BUCKET_NAME,
            Prefix: 'invoices/',
            MaxKeys: 20, // Show last 20 files
        }));

        if (!response.Contents || response.Contents.length === 0) {
            console.log('📭 No invoice images found yet.');
            console.log('Upload an invoice image to see files here.');
            return;
        }

        console.log(`Found ${response.Contents.length} file(s):\n`);

        for (const obj of response.Contents) {
            const sizeKB = Math.round((obj.Size || 0) / 1024);
            const date = obj.LastModified?.toLocaleString('vi-VN') || 'Unknown';
            console.log(`📄 ${obj.Key}`);
            console.log(`   Size: ${sizeKB} KB | Uploaded: ${date}`);
            console.log('');
        }

        console.log('---');
        console.log(`To view on web: https://dash.cloudflare.com → R2 → ${process.env.R2_BUCKET_NAME}`);
    } catch (err) {
        console.error('Error listing files:', (err as Error).message);
    }
}

listR2Files().catch(console.error);
