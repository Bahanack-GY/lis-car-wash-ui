import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { stationsApi } from './api';
import type { CreateStationDto, UpdateStationDto } from './types';

export const STATIONS_KEYS = {
    all: ['stations'] as const,
    lists: () => [...STATIONS_KEYS.all, 'list'] as const,
    list: (filters: string) => [...STATIONS_KEYS.lists(), { filters }] as const,
    details: () => [...STATIONS_KEYS.all, 'detail'] as const,
    detail: (id: number) => [...STATIONS_KEYS.details(), id] as const,
};

export const useStations = () => {
    return useQuery({
        queryKey: STATIONS_KEYS.lists(),
        queryFn: () => stationsApi.findAll(),
    });
};

export const useStation = (id: number) => {
    return useQuery({
        queryKey: STATIONS_KEYS.detail(id),
        queryFn: () => stationsApi.findOne(id),
        enabled: !!id,
    });
};

export const useCreateStation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateStationDto) => stationsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: STATIONS_KEYS.lists() });
        },
    });
};

export const useUpdateStation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: number; data: UpdateStationDto }) => stationsApi.update(args),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: STATIONS_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: STATIONS_KEYS.detail(variables.id) });
        },
    });
};
