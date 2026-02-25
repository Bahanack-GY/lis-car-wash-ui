import { apiClient } from '@/lib/axios';
import type {
    DashboardStats,
    RevenueData,
    ActivityItem,
    TopPerformer,
    WashTypeDistribution,
    GlobalStats,
    StationRevenueData,
    StationRanking,
    GlobalTopPerformer,
    GlobalDateParams,
} from './types';

export const dashboardApi = {
    getStats: async (stationId: number, dateParams?: GlobalDateParams): Promise<DashboardStats> => {
        const response = await apiClient.get<DashboardStats>('/dashboard/stats', { params: { stationId, ...dateParams } });
        return response.data;
    },

    getRevenue: async (stationId: number, dateParams?: GlobalDateParams): Promise<RevenueData[]> => {
        const response = await apiClient.get<RevenueData[]>('/dashboard/revenue', { params: { stationId, ...dateParams } });
        return response.data;
    },

    getActivity: async (stationId: number, dateParams?: GlobalDateParams): Promise<ActivityItem[]> => {
        const response = await apiClient.get<ActivityItem[]>('/dashboard/activity', { params: { stationId, ...dateParams } });
        return response.data;
    },

    getTopPerformers: async (stationId: number, dateParams?: GlobalDateParams): Promise<TopPerformer[]> => {
        const response = await apiClient.get<TopPerformer[]>('/dashboard/top-performers', { params: { stationId, ...dateParams } });
        return response.data;
    },

    getWashTypeDistribution: async (stationId: number, dateParams?: GlobalDateParams): Promise<WashTypeDistribution[]> => {
        const response = await apiClient.get<WashTypeDistribution[]>('/dashboard/wash-type-distribution', { params: { stationId, ...dateParams } });
        return response.data;
    },

    // ─── Global (cross-station) ───────────────────────────────────

    getGlobalStats: async (params?: GlobalDateParams): Promise<GlobalStats> => {
        const response = await apiClient.get<GlobalStats>('/dashboard/global/stats', { params });
        return response.data;
    },

    getGlobalRevenueByStation: async (params?: GlobalDateParams): Promise<StationRevenueData[]> => {
        const response = await apiClient.get<StationRevenueData[]>('/dashboard/global/revenue-by-station', { params });
        return response.data;
    },

    getGlobalStationRanking: async (params?: GlobalDateParams): Promise<StationRanking[]> => {
        const response = await apiClient.get<StationRanking[]>('/dashboard/global/station-ranking', { params });
        return response.data;
    },

    getGlobalTopPerformers: async (params?: GlobalDateParams): Promise<GlobalTopPerformer[]> => {
        const response = await apiClient.get<GlobalTopPerformer[]>('/dashboard/global/top-performers', { params });
        return response.data;
    },

    getGlobalWashTypeDistribution: async (params?: GlobalDateParams): Promise<WashTypeDistribution[]> => {
        const response = await apiClient.get<WashTypeDistribution[]>('/dashboard/global/wash-type-distribution', { params });
        return response.data;
    },
};
