import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from './api';
import type { LoginDto } from './types';

export const AUTH_KEYS = {
    profile: ['auth', 'profile'] as const,
};

// Login — token storage is handled by AuthContext.login()
export const useLogin = () => {
    return useMutation({
        mutationFn: (data: LoginDto) => authApi.login(data),
    });
};

export const useProfile = (enabled = true) => {
    return useQuery({
        queryKey: AUTH_KEYS.profile,
        queryFn: () => authApi.getProfile(),
        enabled: enabled && !!localStorage.getItem('token'),
    });
};

export const useLogout = () => {
    const queryClient = useQueryClient();
    return () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('selectedStation');
        queryClient.clear();
    };
};
