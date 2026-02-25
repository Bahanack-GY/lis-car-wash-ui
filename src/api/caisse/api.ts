import { apiClient } from '@/lib/axios';
import type {
    CaisseSummary,
    PaginatedTransactions,
    CaisseSummaryFilters,
    CaisseTransactionFilters,
    CreateTransactionDto
} from './types';
import type { Paiement } from '../paiements/types';

export const caisseApi = {
    getSummary: async (filters: CaisseSummaryFilters): Promise<CaisseSummary> => {
        const response = await apiClient.get<CaisseSummary>('/caisse/summary', { params: filters });
        return response.data;
    },

    getTransactions: async (filters: CaisseTransactionFilters): Promise<PaginatedTransactions> => {
        const response = await apiClient.get<PaginatedTransactions>('/caisse/transactions', { params: filters });
        return response.data;
    },

    createTransaction: async (data: CreateTransactionDto): Promise<Paiement> => {
        const response = await apiClient.post<Paiement>('/caisse/transactions', data);
        return response.data;
    }
};
