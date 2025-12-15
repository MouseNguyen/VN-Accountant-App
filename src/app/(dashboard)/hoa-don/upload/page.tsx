// src/app/(dashboard)/hoa-don/upload/page.tsx

'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { OCRResult, UploadInvoiceResponse } from '@/types/invoice';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/utils';
import {
    Camera,
    ArrowLeft,
    RefreshCw,
    Check,
    AlertCircle,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function InvoiceUploadPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
    const [invoiceId, setInvoiceId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Helper to resize image
    const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const objectUrl = URL.createObjectURL(file);
            const img = new Image();
            img.src = objectUrl;

            img.onload = () => {
                URL.revokeObjectURL(objectUrl);

                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Resize to max 1600px for better OCR quality on long invoices
                const MAX_WIDTH = 1600;
                const MAX_HEIGHT = 2000;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // JPEG 0.7
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };

            img.onerror = (err) => {
                URL.revokeObjectURL(objectUrl);
                reject(err);
            };
        });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('Vui lòng chọn file ảnh');
            return;
        }

        try {
            setUploading(true);
            setError('Đang xử lý ảnh...');

            const compressedBase64 = await resizeImage(file);
            console.log('Processed image size:', Math.round(compressedBase64.length / 1024), 'KB');
            setSelectedImage(compressedBase64);

            setError(null);
            await uploadImage(compressedBase64);
        } catch (err) {
            console.error(err);
            setError('Lỗi xử lý ảnh local: ' + (err instanceof Error ? err.message : String(err)));
            setUploading(false);
        }

        e.target.value = '';
    };

    const uploadImage = async (base64: string) => {
        setUploading(true);
        setError(null);

        try {
            // TEST: First try simple test endpoint
            console.log('Testing upload with size:', Math.round(base64.length / 1024), 'KB');

            const testRes = await fetch('/api/test-upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64 }),
            });

            if (!testRes.ok) {
                throw new Error(`Test upload failed: ${testRes.status} ${testRes.statusText}`);
            }

            const testData = await testRes.json();
            console.log('Test upload result:', testData);

            // If test passes, proceed with real upload
            const res = await apiClient.post<UploadInvoiceResponse>('/invoices', { image: base64 });
            console.log('Invoice API response:', res);

            if (!res.success) {
                console.error('API Error:', res);
                // Extract message from error object or string
                const errorMsg = typeof res.error === 'string'
                    ? res.error
                    : res.error?.message || 'Lỗi Server';
                console.log('Error message extracted:', errorMsg);
                throw new Error(errorMsg);
            }

            const data = res.data;
            // Data might be at root level if API spreads result
            const invoiceData = data || (res as any);
            console.log('Invoice data:', invoiceData);

            if (invoiceData.id) {
                setOcrResult(invoiceData.ocr_result || null);
                setInvoiceId(invoiceData.id);
                console.log('OCR Result set:', invoiceData.ocr_result);
                console.log('Invoice ID set:', invoiceData.id);

                if (invoiceData.status === 'FAILED') {
                    setError(invoiceData.message || 'OCR thất bại từ phía server');
                }
            }
        } catch (err: unknown) {
            console.error('Upload catch:', err);
            const msg = err instanceof Error ? err.message : 'Lỗi kết nối không xác định';

            // Check for duplicate message
            if (msg.includes('đã được upload') || msg.includes('duplicate')) {
                const duplicateMsg = '⚠️ Ảnh hóa đơn này đã được upload trước đó! Vui lòng chọn ảnh khác.';
                setError(duplicateMsg);
                toast.error('Hóa đơn trùng lặp!', {
                    description: 'Ảnh này đã được upload trước đó. Vui lòng chọn ảnh khác.',
                    duration: 5000,
                });
            } else {
                setError(msg);
                toast.error('Lỗi upload', {
                    description: msg,
                    duration: 4000,
                });
            }
        } finally {
            setUploading(false);
        }
    };

    const handleConfirm = () => {
        if (invoiceId) {
            router.push(`/hoa-don/${invoiceId}/confirm`);
        }
    };

    const handleReset = () => {
        setSelectedImage(null);
        setOcrResult(null);
        setInvoiceId(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="p-4 min-h-screen pb-24">
            <div className="flex items-center gap-3 mb-6">
                <Link href="/dashboard" className="p-2 hover:bg-muted rounded-lg">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-xl font-bold">📸 Chụp hóa đơn</h1>
            </div>

            {!selectedImage ? (
                <div className="flex flex-col items-center justify-center py-16">
                    {/* Main upload area */}
                    <Card
                        className="border-2 border-dashed cursor-pointer hover:border-primary transition-colors w-full max-w-sm"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <CardContent className="p-12 text-center">
                            <Camera className="w-20 h-20 mx-auto mb-4 text-primary" />
                            <p className="text-xl font-medium mb-2">Chụp / Chọn ảnh</p>
                            <p className="text-sm text-muted-foreground">
                                Nhấn để chụp ảnh hoặc chọn từ thư viện
                            </p>
                        </CardContent>
                    </Card>

                    {/* Single input - iOS will show action sheet with Camera/Photo Library options */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                    />

                    {/* Tips */}
                    <div className="mt-8 text-center text-sm text-muted-foreground max-w-sm">
                        <p className="mb-2">💡 <strong>Mẹo:</strong></p>
                        <ul className="space-y-1 text-left">
                            <li>• Ảnh càng rõ nét, OCR càng chính xác</li>
                            <li>• Hệ thống tự động nén ảnh để upload nhanh</li>
                        </ul>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="relative rounded-xl overflow-hidden border bg-black aspect-[3/4]">
                        <img
                            src={selectedImage}
                            alt="Invoice Preview"
                            className="w-full h-full object-contain"
                        />
                        {uploading && (
                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white z-10">
                                <Loader2 className="w-10 h-10 animate-spin mb-2" />
                                <p className="font-medium">Đang xử lý...</p>
                            </div>
                        )}
                    </div>

                    {error && (
                        <Card className="bg-red-50 border-red-200">
                            <CardContent className="p-4 flex flex-col gap-3 text-red-700">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                    <span className="font-medium text-sm break-words">{error}</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleReset}
                                        className="flex-1"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Chọn ảnh khác
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { setError(null); }}
                                        className="text-xs"
                                    >
                                        Đóng
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {ocrResult && !uploading && !error && (
                        <Card className="border-green-200 bg-green-50">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center gap-2 text-green-700 font-medium">
                                    <Check className="w-5 h-5" />
                                    Thành công!
                                </div>
                                <div className="space-y-2 text-sm bg-card p-3 rounded border">
                                    {ocrResult.supplier_name && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">NCC:</span>
                                            <span className="font-medium truncate max-w-[200px]">{ocrResult.supplier_name}</span>
                                        </div>
                                    )}
                                    {ocrResult.total_amount && (
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Tổng tiền:</span>
                                            <span className="font-bold text-primary">{formatMoney(ocrResult.total_amount)}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={handleReset}>
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Chụp lại
                                    </Button>
                                    <Button className="flex-1" onClick={handleConfirm}>
                                        Tiếp tục
                                        <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {error && !uploading && (
                        <Button variant="outline" className="w-full" onClick={handleReset}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Thử lại
                        </Button>
                    )}
                </div>
            )
            }
        </div >
    );
}
