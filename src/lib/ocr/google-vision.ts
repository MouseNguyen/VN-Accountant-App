// src/lib/ocr/google-vision.ts
// Google Cloud Vision OCR Provider

import { OCRResult } from '@/types/invoice';

const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

interface GoogleVisionResponse {
    responses: Array<{
        textAnnotations?: Array<{
            description: string;
            locale?: string;
        }>;
        fullTextAnnotation?: {
            text: string;
        };
        error?: {
            code: number;
            message: string;
        };
    }>;
}

export async function processWithGoogleVision(imageBase64: string): Promise<{
    success: boolean;
    rawText?: string;
    error?: string;
}> {
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY;

    if (!apiKey) {
        return {
            success: false,
            error: 'Google Cloud API key không được cấu hình',
        };
    }

    try {
        // Remove data URL prefix if present
        const base64Content = imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const requestBody = {
            requests: [
                {
                    image: {
                        content: base64Content,
                    },
                    features: [
                        {
                            type: 'TEXT_DETECTION',
                            maxResults: 1,
                        },
                    ],
                    imageContext: {
                        languageHints: ['vi', 'en'],
                    },
                },
            ],
        };

        const response = await fetch(`${GOOGLE_VISION_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Google Vision API] Error response:', response.status, errorText);

            // Parse error for better message
            try {
                const errorJson = JSON.parse(errorText);
                const message = errorJson.error?.message || errorText;
                return {
                    success: false,
                    error: `OCR lỗi: ${message}`,
                };
            } catch {
                return {
                    success: false,
                    error: `Google Vision API lỗi: ${response.status}`,
                };
            }
        }

        const data: GoogleVisionResponse = await response.json();

        // Check for errors
        if (data.responses[0]?.error) {
            return {
                success: false,
                error: data.responses[0].error.message,
            };
        }

        // Extract text
        const rawText = data.responses[0]?.fullTextAnnotation?.text ||
            data.responses[0]?.textAnnotations?.[0]?.description || '';

        if (!rawText) {
            return {
                success: false,
                error: 'Không tìm thấy văn bản trong ảnh',
            };
        }

        return {
            success: true,
            rawText,
        };
    } catch (error) {
        console.error('Google Vision error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Lỗi xử lý OCR',
        };
    }
}
