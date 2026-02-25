import { apiClient } from '@/lib/axios';
import type { Paiement, PaginatedPaiements, CaisseSummary, CreatePaiementDto, TransactionFilters } from './types';

export const paiementsApi = {
    getTransactions: async (filters: TransactionFilters): Promise<PaginatedPaiements> => {
        const response = await apiClient.get<PaginatedPaiements>('/caisse/transactions', { params: filters });
        return response.data;
    },

    getSummary: async (stationId: number, date?: string): Promise<CaisseSummary> => {
        const response = await apiClient.get<CaisseSummary>('/caisse/summary', { params: { stationId, date } });
        return response.data;
    },

    create: async (data: CreatePaiementDto): Promise<Paiement> => {
        const response = await apiClient.post<Paiement>('/caisse/transactions', data);
        return response.data;
    },
};
