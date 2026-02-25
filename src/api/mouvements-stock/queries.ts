import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { mouvementsStockApi } from './api';
import type { CreateMouvementStockDto, MouvementStockFilters } from './types';

export const MOUVEMENTS_STOCK_KEYS = {
    all: ['mouvements-stock'] as const,
    lists: () => [...MOUVEMENTS_STOCK_KEYS.all, 'list'] as const,
    list: (filters: string) => [...MOUVEMENTS_STOCK_KEYS.lists(), { filters }] as const,
};

export const useMouvementsStock = (filters?: MouvementStockFilters) => {
    return useQuery({
        queryKey: MOUVEMENTS_STOCK_KEYS.list(JSON.stringify(filters || {})),
        queryFn: () => mouvementsStockApi.findAll(filters),
    });
};

export const useCreateMouvementStock = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateMouvementStockDto) => mouvementsStockApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: MOUVEMENTS_STOCK_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: ['produits'] }); // Also invalidate products to update stock
        },
    });
};
