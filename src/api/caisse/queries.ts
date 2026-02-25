import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { caisseApi } from './api';
import type {
    CaisseSummaryFilters,
    CaisseTransactionFilters,
    CreateTransactionDto
} from './types';

export const CAISSE_KEYS = {
    all: ['caisse'] as const,
    summary: (filters: string) => [...CAISSE_KEYS.all, 'summary', { filters }] as const,
    transactions: (filters: string) => [...CAISSE_KEYS.all, 'transactions', { filters }] as const,
};

export const useCaisseSummary = (filters: CaisseSummaryFilters) => {
    return useQuery({
        queryKey: CAISSE_KEYS.summary(JSON.stringify(filters)),
        queryFn: () => caisseApi.getSummary(filters),
        enabled: !!filters.stationId,
    });
};

export const useCaisseTransactions = (filters: CaisseTransactionFilters) => {
    return useQuery({
        queryKey: CAISSE_KEYS.transactions(JSON.stringify(filters)),
        queryFn: () => caisseApi.getTransactions(filters),
        enabled: !!filters.stationId,
    });
};

export const useCreateTransaction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateTransactionDto) => caisseApi.createTransaction(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CAISSE_KEYS.all });
            queryClient.invalidateQueries({ queryKey: ['paiements'] });
        },
    });
};
