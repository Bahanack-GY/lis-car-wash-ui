import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { incidentsApi } from './api';
import type { CreateIncidentDto, UpdateIncidentDto, IncidentFilters } from './types';

export const INCIDENTS_KEYS = {
    all: ['incidents'] as const,
    lists: () => [...INCIDENTS_KEYS.all, 'list'] as const,
    list: (filters: string) => [...INCIDENTS_KEYS.lists(), { filters }] as const,
    details: () => [...INCIDENTS_KEYS.all, 'detail'] as const,
    detail: (id: number) => [...INCIDENTS_KEYS.details(), id] as const,
    activeByStation: () => [...INCIDENTS_KEYS.all, 'activeByStation'] as const,
};

export const useIncidents = (filters?: IncidentFilters) => {
    return useQuery({
        queryKey: INCIDENTS_KEYS.list(JSON.stringify(filters || {})),
        queryFn: () => incidentsApi.findAll(filters),
    });
};

export const useIncident = (id: number) => {
    return useQuery({
        queryKey: INCIDENTS_KEYS.detail(id),
        queryFn: () => incidentsApi.findOne(id),
        enabled: !!id,
    });
};

export const useActiveIncidentsByStation = () => {
    return useQuery({
        queryKey: INCIDENTS_KEYS.activeByStation(),
        queryFn: () => incidentsApi.getActiveByStation(),
        refetchInterval: 60000, // Refresh every minute
    });
};

export const useCreateIncident = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateIncidentDto) => incidentsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: INCIDENTS_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: INCIDENTS_KEYS.activeByStation() });
        },
    });
};

export const useUpdateIncident = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: number; data: UpdateIncidentDto }) => incidentsApi.update(args),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: INCIDENTS_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: INCIDENTS_KEYS.activeByStation() });
        },
    });
};
