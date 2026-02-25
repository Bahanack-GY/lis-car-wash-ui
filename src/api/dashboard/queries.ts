import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from './api';

export const DASHBOARD_KEYS = {
    all: ['dashboard'] as const,
    stats: (stationId: number) => [...DASHBOARD_KEYS.all, 'stats', stationId] as const,
    revenue: (stationId: number) => [...DASHBOARD_KEYS.all, 'revenue', stationId] as const,
    activity: (stationId: number) => [...DASHBOARD_KEYS.all, 'activity', stationId] as const,
    topPerformers: (stationId: number) => [...DASHBOARD_KEYS.all, 'topPerformers', stationId] as const,
    washTypeDistribution: (stationId: number) => [...DASHBOARD_KEYS.all, 'washTypeDistribution', stationId] as const,
};

export const useDashboardStats = (stationId: number) => {
    return useQuery({
        queryKey: DASHBOARD_KEYS.stats(stationId),
        queryFn: () => dashboardApi.getStats(stationId),
        enabled: !!stationId,
    });
};

export const useDashboardRevenue = (stationId: number) => {
    return useQuery({
        queryKey: DASHBOARD_KEYS.revenue(stationId),
        queryFn: () => dashboardApi.getRevenue(stationId),
        enabled: !!stationId,
    });
};

export const useDashboardActivity = (stationId: number) => {
    return useQuery({
        queryKey: DASHBOARD_KEYS.activity(stationId),
        queryFn: () => dashboardApi.getActivity(stationId),
        enabled: !!stationId,
    });
};

export const useDashboardTopPerformers = (stationId: number) => {
    return useQuery({
        queryKey: DASHBOARD_KEYS.topPerformers(stationId),
        queryFn: () => dashboardApi.getTopPerformers(stationId),
        enabled: !!stationId,
    });
};

export const useDashboardWashTypeDistribution = (stationId: number) => {
    return useQuery({
        queryKey: DASHBOARD_KEYS.washTypeDistribution(stationId),
        queryFn: () => dashboardApi.getWashTypeDistribution(stationId),
        enabled: !!stationId,
    });
};
