import { apiClient } from '@/lib/axios';
import type {
    Fournisseur,
    PaginatedFournisseurs,
    CreateFournisseurDto,
    UpdateFournisseurDto,
    FournisseurFilters
} from './types';

export const fournisseursApi = {
    findAll: async (filters?: FournisseurFilters): Promise<PaginatedFournisseurs> => {
        const response = await apiClient.get<PaginatedFournisseurs>('/fournisseurs', { params: filters });
        return response.data;
    },

    findOne: async (id: number): Promise<Fournisseur> => {
        const response = await apiClient.get<Fournisseur>(`/fournisseurs/${id}`);
        return response.data;
    },

    create: async (data: CreateFournisseurDto): Promise<Fournisseur> => {
        const response = await apiClient.post<Fournisseur>('/fournisseurs', data);
        return response.data;
    },

    update: async ({ id, data }: { id: number; data: UpdateFournisseurDto }): Promise<Fournisseur> => {
        const response = await apiClient.patch<Fournisseur>(`/fournisseurs/${id}`, data);
        return response.data;
    }
};
