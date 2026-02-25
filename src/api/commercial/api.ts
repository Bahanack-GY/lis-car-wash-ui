import { apiClient } from '@/lib/axios';
import type { CommercialRegistration, RegisterVehicleDto, CommercialStats } from './types';

export const commercialApi = {
    register: async (data: RegisterVehicleDto): Promise<CommercialRegistration> => {
        const response = await apiClient.post<CommercialRegistration>('/commercial/register', data);
        return response.data;
    },

    getToday: async (): Promise<CommercialRegistration[]> => {
        const response = await apiClient.get<CommercialRegistration[]>('/commercial/today');
        return response.data;
    },

    getStats: async (): Promise<CommercialStats> => {
        const response = await apiClient.get<CommercialStats>('/commercial/stats');
        return response.data;
    },

    getStatsByUser: async (userId: number): Promise<CommercialStats> => {
        const response = await apiClient.get<CommercialStats>(`/commercial/${userId}/stats`);
        return response.data;
    },

    getHistory: async (filters?: { from?: string; to?: string; status?: string; search?: string }): Promise<CommercialRegistration[]> => {
        const response = await apiClient.get<CommercialRegistration[]>('/commercial/history', { params: filters });
        return response.data;
    },
};
