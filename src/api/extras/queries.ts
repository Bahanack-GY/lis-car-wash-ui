import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { extrasApi } from './api';
import type { CreateExtraServiceDto, UpdateExtraServiceDto, ExtraFilters } from './types';

export const EXTRAS_KEYS = {
    all: ['extras'] as const,
    lists: () => [...EXTRAS_KEYS.all, 'list'] as const,
    list: (filters: string) => [...EXTRAS_KEYS.lists(), { filters }] as const,
};

export const useExtras = (filters?: ExtraFilters) => {
    return useQuery({
        queryKey: EXTRAS_KEYS.list(JSON.stringify(filters || {})),
        queryFn: () => extrasApi.findAll(filters),
    });
};

export const useCreateExtra = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateExtraServiceDto) => extrasApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: EXTRAS_KEYS.lists() });
        },
    });
};

export const useUpdateExtra = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: number; data: UpdateExtraServiceDto }) => extrasApi.update(args),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: EXTRAS_KEYS.lists() });
        },
    });
};
