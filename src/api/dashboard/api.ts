import { apiClient } from '@/lib/axios';
import type {
    DashboardStats,
    RevenueData,
    ActivityItem,
    TopPerformer,
    WashTypeDistribution
} from './types';

export const dashboardApi = {
    getStats: async (stationId: number): Promise<DashboardStats> => {
        const response = await apiClient.get<DashboardStats>('/dashboard/stats', { params: { stationId } });
        return response.data;
    },

    getRevenue: async (stationId: number): Promise<RevenueData[]> => {
        const response = await apiClient.get<RevenueData[]>('/dashboard/revenue', { params: { stationId } });
        return response.data;
    },

    getActivity: async (stationId: number): Promise<ActivityItem[]> => {
        const response = await apiClient.get<ActivityItem[]>('/dashboard/activity', { params: { stationId } });
        return response.data;
    },

    getTopPerformers: async (stationId: number): Promise<TopPerformer[]> => {
        const response = await apiClient.get<TopPerformer[]>('/dashboard/top-performers', { params: { stationId } });
        return response.data;
    },

    getWashTypeDistribution: async (stationId: number): Promise<WashTypeDistribution[]> => {
        const response = await apiClient.get<WashTypeDistribution[]>('/dashboard/wash-type-distribution', { params: { stationId } });
        return response.data;
    }
};
