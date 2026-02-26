import { apiClient } from '@/lib/axios';
import type {
    BonLavage,
    PaginatedBonds,
    CreateBonLavageDto,
    UseBonLavageDto,
    BondFilters
} from './types';

export const bondsApi = {
    findAll: async (filters?: BondFilters): Promise<PaginatedBonds> => {
        const response = await apiClient.get<PaginatedBonds>('/bonds', { params: filters });
        return response.data;
    },

    findOne: async (id: number): Promise<BonLavage> => {
        const response = await apiClient.get<BonLavage>(`/bonds/${id}`);
        return response.data;
    },

    validate: async (code: string): Promise<BonLavage> => {
        const response = await apiClient.get<BonLavage>(`/bonds/validate/${encodeURIComponent(code)}`);
        return response.data;
    },

    create: async (data: CreateBonLavageDto): Promise<BonLavage> => {
        const response = await apiClient.post<BonLavage>('/bonds', data);
        return response.data;
    },

    markAsUsed: async ({ id, data }: { id: number; data: UseBonLavageDto }): Promise<BonLavage> => {
        const response = await apiClient.patch<BonLavage>(`/bonds/${id}/use`, data);
        return response.data;
    },
};
