import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paiementsApi } from './api';
import type { CreatePaiementDto, TransactionFilters } from './types';

export const PAIEMENTS_KEYS = {
    all: ['paiements'] as const,
    lists: () => [...PAIEMENTS_KEYS.all, 'list'] as const,
    summary: (stationId: number) => [...PAIEMENTS_KEYS.all, 'summary', stationId] as const,
};

export const usePaiements = (filters: TransactionFilters) => {
    return useQuery({
        queryKey: [...PAIEMENTS_KEYS.lists(), filters],
        queryFn: () => paiementsApi.getTransactions(filters),
        enabled: !!filters.stationId,
    });
};

export const useCaisseSummary = (stationId: number, date?: string) => {
    return useQuery({
        queryKey: [...PAIEMENTS_KEYS.summary(stationId), date],
        queryFn: () => paiementsApi.getSummary(stationId, date),
        enabled: !!stationId,
    });
};

export const useCreatePaiement = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreatePaiementDto) => paiementsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['factures'] });
            queryClient.invalidateQueries({ queryKey: PAIEMENTS_KEYS.all });
        },
    });
};
