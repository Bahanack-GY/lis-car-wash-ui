import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fichesPisteApi } from './api';
import type { CreateFichePisteDto, UpdateFichePisteDto, FichePisteFilters, CreateNouveauLavageDto } from './types';

export const FICHES_PISTE_KEYS = {
    all: ['fiches-piste'] as const,
    lists: () => [...FICHES_PISTE_KEYS.all, 'list'] as const,
    list: (filters: string) => [...FICHES_PISTE_KEYS.lists(), { filters }] as const,
    details: () => [...FICHES_PISTE_KEYS.all, 'detail'] as const,
    detail: (id: number) => [...FICHES_PISTE_KEYS.details(), id] as const,
};

export const useFichesPiste = (filters?: FichePisteFilters) => {
    return useQuery({
        queryKey: FICHES_PISTE_KEYS.list(JSON.stringify(filters || {})),
        queryFn: () => fichesPisteApi.findAll(filters),
    });
};

export const useFichePiste = (id: number) => {
    return useQuery({
        queryKey: FICHES_PISTE_KEYS.detail(id),
        queryFn: () => fichesPisteApi.findOne(id),
        enabled: !!id,
    });
};

export const useCreateFichePiste = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateFichePisteDto) => fichesPisteApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: FICHES_PISTE_KEYS.lists() });
        },
    });
};

export const useUpdateFichePiste = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: number; data: UpdateFichePisteDto }) => fichesPisteApi.update(args),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: FICHES_PISTE_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: FICHES_PISTE_KEYS.detail(variables.id) });
        },
    });
};

export const useCreateNouveauLavage = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateNouveauLavageDto) => fichesPisteApi.createNouveauLavage(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: FICHES_PISTE_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: ['coupons'] });
        },
    });
};
