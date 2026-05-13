export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
}
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
export interface ApiError {
    status: number;
    message: string;
    details?: unknown;
}
export interface UploadResponse {
    url: string;
    fileName: string;
    contentType: string;
    size: number;
}
export interface LoginResponse {
    token: string;
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
}
export interface VerifyResponse {
    uid: string;
    email: string | null;
    name: string | null;
}
//# sourceMappingURL=api.d.ts.map