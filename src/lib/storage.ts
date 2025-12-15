
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g., https://pub-xxx.r2.dev

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    console.warn('⚠️ Cloudflare R2 variables are missing. Storage features will fail.');
}

const S3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID || '',
        secretAccessKey: R2_SECRET_ACCESS_KEY || '',
    },
});

export async function uploadToR2(
    fileBuffer: Buffer,
    fileName: string,
    contentType: string = 'image/jpeg'
): Promise<string> {
    try {
        const key = `invoices/${Date.now()}-${fileName}`;

        await S3.send(new PutObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
            Body: fileBuffer,
            ContentType: contentType,
        }));

        // Return public URL
        if (R2_PUBLIC_URL) {
            return `${R2_PUBLIC_URL}/${key}`;
        }

        // Fallback or if public URL not configured (private bucket)
        // For now assume public read is allowed or worker is handling it
        return `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${key}`;
    } catch (error) {
        console.error('R2 Upload Error:', error);
        throw new Error('Không thể upload ảnh lên lưu trữ đám mây');
    }
}

export async function deleteFromR2(fileUrl: string): Promise<void> {
    try {
        // Extract key from URL
        // Assumes URL format: .../key or .../bucket/key
        const parts = fileUrl.split('/');
        const key = parts.slice(parts.indexOf('invoices')).join('/'); // Very naive parsing

        await S3.send(new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        }));
    } catch (error) {
        console.error('R2 Delete Error:', error);
        // Don't throw for delete errors, just log
    }
}

export async function downloadFromR2(fileUrl: string): Promise<Buffer> {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3');

    try {
        // Extract key from URL
        const parts = fileUrl.split('/');
        // Handle different URL formats
        let key: string;
        if (parts.includes('tax-packages')) {
            key = parts.slice(parts.indexOf('tax-packages')).join('/');
        } else if (parts.includes('invoices')) {
            key = parts.slice(parts.indexOf('invoices')).join('/');
        } else {
            // Fallback: take last parts as key
            key = parts.slice(-2).join('/');
        }

        const response = await S3.send(new GetObjectCommand({
            Bucket: R2_BUCKET_NAME,
            Key: key,
        }));

        if (!response.Body) {
            throw new Error('Empty response body');
        }

        // Convert stream to buffer
        const chunks: Uint8Array[] = [];
        for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    } catch (error) {
        console.error('R2 Download Error:', error);
        throw new Error('Không thể tải file từ lưu trữ đám mây');
    }
}
