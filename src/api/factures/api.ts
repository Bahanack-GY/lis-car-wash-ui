import { apiClient } from '@/lib/axios';
import type {
    Facture,
    PaginatedFactures,
    CreateFactureDto,
    FactureFilters
} from './types';

export const facturesApi = {
    findAll: async (filters?: FactureFilters): Promise<PaginatedFactures> => {
        const response = await apiClient.get<PaginatedFactures>('/factures', { params: filters });
        return response.data;
    },

    findOne: async (id: number): Promise<Facture> => {
        const response = await apiClient.get<Facture>(`/factures/${id}`);
        return response.data;
    },

    create: async (data: CreateFactureDto): Promise<Facture> => {
        const response = await apiClient.post<Facture>('/factures', data);
        return response.data;
    }
};
