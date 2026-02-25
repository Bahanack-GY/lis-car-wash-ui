import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { incidentsApi } from './api';
import type { CreateIncidentDto, UpdateIncidentDto, IncidentFilters } from './types';

export const INCIDENTS_KEYS = {
    all: ['incidents'] as const,
    lists: () => [...INCIDENTS_KEYS.all, 'list'] as const,
    list: (filters: string) => [...INCIDENTS_KEYS.lists(), { filters }] as const,
};

export const useIncidents = (filters?: IncidentFilters) => {
    return useQuery({
        queryKey: INCIDENTS_KEYS.list(JSON.stringify(filters || {})),
        queryFn: () => incidentsApi.findAll(filters),
    });
};

export const useCreateIncident = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateIncidentDto) => incidentsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: INCIDENTS_KEYS.lists() });
        },
    });
};

export const useUpdateIncident = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: number; data: UpdateIncidentDto }) => incidentsApi.update(args),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: INCIDENTS_KEYS.lists() });
        },
    });
};
