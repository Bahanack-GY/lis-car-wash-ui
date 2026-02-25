import { apiClient } from '@/lib/axios';
import type { LoginDto, RefreshTokenDto, AuthResponse, UserProfile } from './types';

export const authApi = {
    login: async (data: LoginDto): Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>('/auth/login', data);
        return response.data;
    },

    refresh: async (data: RefreshTokenDto): Promise<{ access_token: string; refresh_token: string }> => {
        const response = await apiClient.post<{ access_token: string; refresh_token: string }>('/auth/refresh', data);
        return response.data;
    },

    getProfile: async (): Promise<UserProfile> => {
        const response = await apiClient.get<UserProfile>('/auth/me');
        return response.data;
    },
};
