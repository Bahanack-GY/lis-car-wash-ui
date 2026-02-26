import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bondsApi } from './api';
import type { CreateBonLavageDto, UseBonLavageDto, BondFilters } from './types';

export const BONDS_KEYS = {
    all: ['bonds'] as const,
    lists: () => [...BONDS_KEYS.all, 'list'] as const,
    list: (filters: string) => [...BONDS_KEYS.lists(), { filters }] as const,
    details: () => [...BONDS_KEYS.all, 'detail'] as const,
    detail: (id: number) => [...BONDS_KEYS.details(), id] as const,
};

export const useBonds = (filters?: BondFilters) => {
    return useQuery({
        queryKey: BONDS_KEYS.list(JSON.stringify(filters || {})),
        queryFn: () => bondsApi.findAll(filters),
    });
};

export const useBond = (id: number) => {
    return useQuery({
        queryKey: BONDS_KEYS.detail(id),
        queryFn: () => bondsApi.findOne(id),
        enabled: !!id,
    });
};

export const useCreateBond = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateBonLavageDto) => bondsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: BONDS_KEYS.lists() });
        },
    });
};

export const useMarkBondAsUsed = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: number; data: UseBonLavageDto }) => bondsApi.markAsUsed(args),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: BONDS_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: BONDS_KEYS.detail(variables.id) });
        },
    });
};
