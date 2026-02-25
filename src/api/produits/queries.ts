import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { produitsApi } from './api';
import type { CreateProduitDto, UpdateProduitDto, ProduitFilters } from './types';

export const PRODUITS_KEYS = {
    all: ['produits'] as const,
    lists: () => [...PRODUITS_KEYS.all, 'list'] as const,
    list: (filters: string) => [...PRODUITS_KEYS.lists(), { filters }] as const,
    details: () => [...PRODUITS_KEYS.all, 'detail'] as const,
    detail: (id: number) => [...PRODUITS_KEYS.details(), id] as const,
};

export const useProduits = (filters?: ProduitFilters) => {
    return useQuery({
        queryKey: PRODUITS_KEYS.list(JSON.stringify(filters || {})),
        queryFn: () => produitsApi.findAll(filters),
    });
};

export const useProduit = (id: number) => {
    return useQuery({
        queryKey: PRODUITS_KEYS.detail(id),
        queryFn: () => produitsApi.findOne(id),
        enabled: !!id,
    });
};

export const useCreateProduit = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateProduitDto) => produitsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PRODUITS_KEYS.lists() });
        },
    });
};

export const useUpdateProduit = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: number; data: UpdateProduitDto }) => produitsApi.update(args),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: PRODUITS_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: PRODUITS_KEYS.detail(variables.id) });
        },
    });
};
