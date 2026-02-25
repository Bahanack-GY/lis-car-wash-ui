import { apiClient } from '@/lib/axios';
import type { Station, CreateStationDto, UpdateStationDto } from './types';

export const stationsApi = {
    findAll: async (): Promise<Station[]> => {
        const response = await apiClient.get<Station[]>('/stations');
        return response.data;
    },

    findOne: async (id: number): Promise<Station> => {
        const response = await apiClient.get<Station>(`/stations/${id}`);
        return response.data;
    },

    create: async (data: CreateStationDto): Promise<Station> => {
        const response = await apiClient.post<Station>('/stations', data);
        return response.data;
    },

    update: async ({ id, data }: { id: number; data: UpdateStationDto }): Promise<Station> => {
        const response = await apiClient.patch<Station>(`/stations/${id}`, data);
        return response.data;
    },
};
