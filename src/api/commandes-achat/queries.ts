import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { commandesAchatApi } from './api';
import type { CreateCommandeAchatDto, UpdateCommandeAchatDto, CommandeAchatFilters } from './types';

export const COMMANDES_ACHAT_KEYS = {
    all: ['commandes-achat'] as const,
    lists: () => [...COMMANDES_ACHAT_KEYS.all, 'list'] as const,
    list: (filters: string) => [...COMMANDES_ACHAT_KEYS.lists(), { filters }] as const,
};

export const useCommandesAchat = (filters?: CommandeAchatFilters) => {
    return useQuery({
        queryKey: COMMANDES_ACHAT_KEYS.list(JSON.stringify(filters || {})),
        queryFn: () => commandesAchatApi.findAll(filters),
    });
};

export const useCreateCommandeAchat = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateCommandeAchatDto) => commandesAchatApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COMMANDES_ACHAT_KEYS.lists() });
        },
    });
};

export const useUpdateCommandeAchat = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: number; data: UpdateCommandeAchatDto }) => commandesAchatApi.update(args),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COMMANDES_ACHAT_KEYS.lists() });
        },
    });
};
