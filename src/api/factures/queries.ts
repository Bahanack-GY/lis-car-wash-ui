import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { facturesApi } from './api';
import type { CreateFactureDto, FactureFilters } from './types';

export const FACTURES_KEYS = {
    all: ['factures'] as const,
    lists: () => [...FACTURES_KEYS.all, 'list'] as const,
    list: (filters: string) => [...FACTURES_KEYS.lists(), { filters }] as const,
    details: () => [...FACTURES_KEYS.all, 'detail'] as const,
    detail: (id: number) => [...FACTURES_KEYS.details(), id] as const,
};

export const useFactures = (filters?: FactureFilters) => {
    return useQuery({
        queryKey: FACTURES_KEYS.list(JSON.stringify(filters || {})),
        queryFn: () => facturesApi.findAll(filters),
    });
};

export const useFacture = (id: number) => {
    return useQuery({
        queryKey: FACTURES_KEYS.detail(id),
        queryFn: () => facturesApi.findOne(id),
        enabled: !!id,
    });
};

export const useCreateFacture = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateFactureDto) => facturesApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: FACTURES_KEYS.lists() });
        },
    });
};
