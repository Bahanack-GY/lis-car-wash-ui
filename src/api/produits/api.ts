import { apiClient } from '@/lib/axios';
import type {
    Produit,
    PaginatedProduits,
    CreateProduitDto,
    UpdateProduitDto,
    ProduitFilters
} from './types';

export const produitsApi = {
    findAll: async (filters?: ProduitFilters): Promise<PaginatedProduits> => {
        const response = await apiClient.get<PaginatedProduits>('/produits', { params: filters });
        return response.data;
    },

    findOne: async (id: number): Promise<Produit> => {
        const response = await apiClient.get<Produit>(`/produits/${id}`);
        return response.data;
    },

    create: async (data: CreateProduitDto): Promise<Produit> => {
        const response = await apiClient.post<Produit>('/produits', data);
        return response.data;
    },

    update: async ({ id, data }: { id: number; data: UpdateProduitDto }): Promise<Produit> => {
        const response = await apiClient.patch<Produit>(`/produits/${id}`, data);
        return response.data;
    }
};
