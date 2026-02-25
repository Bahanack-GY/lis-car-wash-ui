import { apiClient } from '@/lib/axios';
import type { ExtraService, CreateExtraServiceDto, UpdateExtraServiceDto } from './types';

export const extrasApi = {
    findAll: async (): Promise<ExtraService[]> => {
        const response = await apiClient.get<ExtraService[]>('/extras');
        return response.data;
    },

    create: async (data: CreateExtraServiceDto): Promise<ExtraService> => {
        const response = await apiClient.post<ExtraService>('/extras', data);
        return response.data;
    },

    update: async ({ id, data }: { id: number; data: UpdateExtraServiceDto }): Promise<ExtraService> => {
        const response = await apiClient.patch<ExtraService>(`/extras/${id}`, data);
        return response.data;
    }
};
