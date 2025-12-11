// src/lib/api-client.ts
// API client cho frontend - tự động đính kèm token

type RequestOptions = {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: unknown;
    headers?: Record<string, string>;
};

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code?: string;
        message: string;
        details?: unknown;
    };
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

class ApiClient {
    private baseUrl: string;

    constructor() {
        this.baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    }

    /**
     * Lấy token từ localStorage (Zustand store)
     */
    private getToken(): string | null {
        if (typeof window === 'undefined') return null;

        try {
            const stored = localStorage.getItem('auth-storage');
            if (!stored) return null;

            const parsed = JSON.parse(stored);
            return parsed.state?.token || null;
        } catch {
            return null;
        }
    }

    /**
     * Main request method
     */
    async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
        const { method = 'GET', body, headers = {} } = options;

        const token = this.getToken();
        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            ...headers,
        };

        if (token) {
            requestHeaders['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`${this.baseUrl}/api${endpoint}`, {
                method,
                headers: requestHeaders,
                body: body ? JSON.stringify(body) : undefined,
            });

            const data = await response.json();

            if (!response.ok) {
                // Nếu 401, có thể cần logout
                if (response.status === 401) {
                    // Có thể emit event để AuthStore xử lý logout
                    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
                }

                return {
                    success: false,
                    error: data.error || { message: 'Có lỗi xảy ra' },
                };
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            return {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Không thể kết nối đến server'
                },
            };
        }
    }

    // ==================== SHORTHAND METHODS ====================

    /**
     * GET request
     */
    get<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
        let url = endpoint;
        if (params) {
            const searchParams = new URLSearchParams(params);
            url = `${endpoint}?${searchParams.toString()}`;
        }
        return this.request<T>(url, { method: 'GET' });
    }

    /**
     * POST request
     */
    post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'POST', body });
    }

    /**
     * PUT request
     */
    put<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'PUT', body });
    }

    /**
     * PATCH request
     */
    patch<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'PATCH', body });
    }

    /**
     * DELETE request
     */
    delete<T>(endpoint: string): Promise<ApiResponse<T>> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;

// Export type cho sử dụng ở các nơi khác
export type { ApiResponse };
