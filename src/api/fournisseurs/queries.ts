import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fournisseursApi } from './api';
import type { CreateFournisseurDto, UpdateFournisseurDto, FournisseurFilters } from './types';

export const FOURNISSEURS_KEYS = {
    all: ['fournisseurs'] as const,
    lists: () => [...FOURNISSEURS_KEYS.all, 'list'] as const,
    list: (filters: string) => [...FOURNISSEURS_KEYS.lists(), { filters }] as const,
    details: () => [...FOURNISSEURS_KEYS.all, 'detail'] as const,
    detail: (id: number) => [...FOURNISSEURS_KEYS.details(), id] as const,
};

export const useFournisseurs = (filters?: FournisseurFilters) => {
    return useQuery({
        queryKey: FOURNISSEURS_KEYS.list(JSON.stringify(filters || {})),
        queryFn: () => fournisseursApi.findAll(filters),
    });
};

export const useFournisseur = (id: number) => {
    return useQuery({
        queryKey: FOURNISSEURS_KEYS.detail(id),
        queryFn: () => fournisseursApi.findOne(id),
        enabled: !!id,
    });
};

export const useCreateFournisseur = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateFournisseurDto) => fournisseursApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: FOURNISSEURS_KEYS.lists() });
        },
    });
};

export const useUpdateFournisseur = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: number; data: UpdateFournisseurDto }) => fournisseursApi.update(args),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: FOURNISSEURS_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: FOURNISSEURS_KEYS.detail(variables.id) });
        },
    });
};
