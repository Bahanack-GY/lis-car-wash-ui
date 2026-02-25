import { apiClient } from '@/lib/axios';
import type {
    MouvementStock,
    PaginatedMouvementsStock,
    CreateMouvementStockDto,
    MouvementStockFilters
} from './types';

export const mouvementsStockApi = {
    findAll: async (filters?: MouvementStockFilters): Promise<PaginatedMouvementsStock> => {
        const response = await apiClient.get<PaginatedMouvementsStock>('/mouvements-stock', { params: filters });
        return response.data;
    },

    create: async (data: CreateMouvementStockDto): Promise<MouvementStock> => {
        const response = await apiClient.post<MouvementStock>('/mouvements-stock', data);
        return response.data;
    }
};
