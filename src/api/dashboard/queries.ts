import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { dashboardApi } from './api';
import type { GlobalDateParams } from './types';

export const DASHBOARD_KEYS = {
    all: ['dashboard'] as const,
    stats: (stationId: number, params?: GlobalDateParams) => [...DASHBOARD_KEYS.all, 'stats', stationId, params] as const,
    revenue: (stationId: number, params?: GlobalDateParams) => [...DASHBOARD_KEYS.all, 'revenue', stationId, params] as const,
    activity: (stationId: number, params?: GlobalDateParams) => [...DASHBOARD_KEYS.all, 'activity', stationId, params] as const,
    topPerformers: (stationId: number, params?: GlobalDateParams) => [...DASHBOARD_KEYS.all, 'topPerformers', stationId, params] as const,
    washTypeDistribution: (stationId: number, params?: GlobalDateParams) => [...DASHBOARD_KEYS.all, 'washTypeDistribution', stationId, params] as const,
    globalStats: (params?: GlobalDateParams) => [...DASHBOARD_KEYS.all, 'global', 'stats', params] as const,
    globalRevenueByStation: (params?: GlobalDateParams) => [...DASHBOARD_KEYS.all, 'global', 'revenueByStation', params] as const,
    globalStationRanking: (params?: GlobalDateParams) => [...DASHBOARD_KEYS.all, 'global', 'stationRanking', params] as const,
    globalTopPerformers: (params?: GlobalDateParams) => [...DASHBOARD_KEYS.all, 'global', 'topPerformers', params] as const,
    globalWashTypeDistribution: (params?: GlobalDateParams) => [...DASHBOARD_KEYS.all, 'global', 'washTypeDistribution', params] as const,
};

export const useDashboardStats = (stationId: number, dateParams?: GlobalDateParams) => {
    return useQuery({
        queryKey: DASHBOARD_KEYS.stats(stationId, dateParams),
        queryFn: () => dashboardApi.getStats(stationId, dateParams),
        enabled: !!stationId,
        placeholderData: keepPreviousData,
    });
};

export const useDashboardRevenue = (stationId: number, dateParams?: GlobalDateParams) => {
    return useQuery({
        queryKey: DASHBOARD_KEYS.revenue(stationId, dateParams),
        queryFn: () => dashboardApi.getRevenue(stationId, dateParams),
        enabled: !!stationId,
        placeholderData: keepPreviousData,
    });
};

export const useDashboardActivity = (stationId: number, dateParams?: GlobalDateParams) => {
    return useQuery({
        queryKey: DASHBOARD_KEYS.activity(stationId, dateParams),
        queryFn: () => dashboardApi.getActivity(stationId, dateParams),
        enabled: !!stationId,
        placeholderData: keepPreviousData,
    });
};

export const useDashboardTopPerformers = (stationId: number, dateParams?: GlobalDateParams) => {
    return useQuery({
        queryKey: DASHBOARD_KEYS.topPerformers(stationId, dateParams),
        queryFn: () => dashboardApi.getTopPerformers(stationId, dateParams),
        enabled: !!stationId,
        placeholderData: keepPreviousData,
    });
};

export const useDashboardWashTypeDistribution = (stationId: number, dateParams?: GlobalDateParams) => {
    return useQuery({
        queryKey: DASHBOARD_KEYS.washTypeDistribution(stationId, dateParams),
        queryFn: () => dashboardApi.getWashTypeDistribution(stationId, dateParams),
        enabled: !!stationId,
        placeholderData: keepPreviousData,
    });
};

// ─── Global (cross-station) hooks ─────────────────────────────

export const useGlobalStats = (params?: GlobalDateParams) => {
    return useQuery({
        queryKey: DASHBOARD_KEYS.globalStats(params),
        queryFn: () => dashboardApi.getGlobalStats(params),
        placeholderData: keepPreviousData,
    });
};

export const useGlobalRevenueByStation = (params?: GlobalDateParams) => {
    return useQuery({
        queryKey: DASHBOARD_KEYS.globalRevenueByStation(params),
        queryFn: () => dashboardApi.getGlobalRevenueByStation(params),
        placeholderData: keepPreviousData,
    });
};

export const useGlobalStationRanking = (params?: GlobalDateParams) => {
    return useQuery({
        queryKey: DASHBOARD_KEYS.globalStationRanking(params),
        queryFn: () => dashboardApi.getGlobalStationRanking(params),
        placeholderData: keepPreviousData,
    });
};

export const useGlobalTopPerformers = (params?: GlobalDateParams) => {
    return useQuery({
        queryKey: DASHBOARD_KEYS.globalTopPerformers(params),
        queryFn: () => dashboardApi.getGlobalTopPerformers(params),
        placeholderData: keepPreviousData,
    });
};

export const useGlobalWashTypeDistribution = (params?: GlobalDateParams) => {
    return useQuery({
        queryKey: DASHBOARD_KEYS.globalWashTypeDistribution(params),
        queryFn: () => dashboardApi.getGlobalWashTypeDistribution(params),
        placeholderData: keepPreviousData,
    });
};
