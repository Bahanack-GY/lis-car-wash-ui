import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reservationsApi } from './api';
import type { CreateReservationDto, UpdateReservationDto, ReservationFilters } from './types';

export const RESERVATIONS_KEYS = {
    all: ['reservations'] as const,
    lists: () => [...RESERVATIONS_KEYS.all, 'list'] as const,
    list: (filters: string) => [...RESERVATIONS_KEYS.lists(), { filters }] as const,
    details: () => [...RESERVATIONS_KEYS.all, 'detail'] as const,
    detail: (id: number) => [...RESERVATIONS_KEYS.details(), id] as const,
};

export const useReservations = (filters?: ReservationFilters) => {
    return useQuery({
        queryKey: RESERVATIONS_KEYS.list(JSON.stringify(filters || {})),
        queryFn: () => reservationsApi.findAll(filters),
    });
};

export const useReservation = (id: number) => {
    return useQuery({
        queryKey: RESERVATIONS_KEYS.detail(id),
        queryFn: () => reservationsApi.findOne(id),
        enabled: !!id,
    });
};

export const useCreateReservation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateReservationDto) => reservationsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEYS.lists() });
        },
    });
};

export const useUpdateReservation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: number; data: UpdateReservationDto }) => reservationsApi.update(args),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: RESERVATIONS_KEYS.detail(variables.id) });
        },
    });
};
