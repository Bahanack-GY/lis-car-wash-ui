import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { washTypesApi } from './api';
import type { CreateWashTypeDto, UpdateWashTypeDto, WashTypeFilters } from './types';

export const WASH_TYPES_KEYS = {
    all: ['wash-types'] as const,
    lists: () => [...WASH_TYPES_KEYS.all, 'list'] as const,
    list: (filters: string) => [...WASH_TYPES_KEYS.lists(), { filters }] as const,
};

export const useWashTypes = (filters?: WashTypeFilters) => {
    return useQuery({
        queryKey: WASH_TYPES_KEYS.list(JSON.stringify(filters || {})),
        queryFn: () => washTypesApi.findAll(filters),
    });
};

export const useCreateWashType = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateWashTypeDto) => washTypesApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: WASH_TYPES_KEYS.lists() });
        },
    });
};

export const useUpdateWashType = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: number; data: UpdateWashTypeDto }) => washTypesApi.update(args),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: WASH_TYPES_KEYS.lists() });
        },
    });
};
