import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commercialApi } from './api';
import type { RegisterVehicleDto } from './types';

export interface HistoryFilters {
    from?: string;
    to?: string;
    status?: string;
    search?: string;
}

export const COMMERCIAL_KEYS = {
    all: ['commercial'] as const,
    today: () => [...COMMERCIAL_KEYS.all, 'today'] as const,
    stats: () => [...COMMERCIAL_KEYS.all, 'stats'] as const,
    userStats: (userId: number) => [...COMMERCIAL_KEYS.all, 'userStats', userId] as const,
    history: (filters: HistoryFilters) => [...COMMERCIAL_KEYS.all, 'history', filters] as const,
};

export const useCommercialToday = () => {
    return useQuery({
        queryKey: COMMERCIAL_KEYS.today(),
        queryFn: () => commercialApi.getToday(),
        refetchInterval: 30_000,
    });
};

export const useCommercialStats = () => {
    return useQuery({
        queryKey: COMMERCIAL_KEYS.stats(),
        queryFn: () => commercialApi.getStats(),
        refetchInterval: 30_000,
    });
};

export const useCommercialStatsByUser = (userId: number) => {
    return useQuery({
        queryKey: COMMERCIAL_KEYS.userStats(userId),
        queryFn: () => commercialApi.getStatsByUser(userId),
        enabled: !!userId,
    });
};

export const useCommercialHistory = (filters: HistoryFilters) => {
    return useQuery({
        queryKey: COMMERCIAL_KEYS.history(filters),
        queryFn: () => commercialApi.getHistory(filters),
    });
};

export const useRegisterVehicle = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: RegisterVehicleDto) => commercialApi.register(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COMMERCIAL_KEYS.today() });
            queryClient.invalidateQueries({ queryKey: COMMERCIAL_KEYS.stats() });
            queryClient.invalidateQueries({ queryKey: [...COMMERCIAL_KEYS.all, 'history'] });
        },
    });
};
