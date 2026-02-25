import { apiClient } from '@/lib/axios';
import type { WashType, CreateWashTypeDto, UpdateWashTypeDto, WashTypeFilters } from './types';

export const washTypesApi = {
    findAll: async (filters?: WashTypeFilters): Promise<WashType[]> => {
        const response = await apiClient.get<WashType[]>('/wash-types', { params: filters });
        return response.data;
    },

    create: async (data: CreateWashTypeDto): Promise<WashType> => {
        const response = await apiClient.post<WashType>('/wash-types', data);
        return response.data;
    },

    update: async ({ id, data }: { id: number; data: UpdateWashTypeDto }): Promise<WashType> => {
        const response = await apiClient.patch<WashType>(`/wash-types/${id}`, data);
        return response.data;
    }
};
