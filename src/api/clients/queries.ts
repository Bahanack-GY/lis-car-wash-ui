import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from './api';
import type {
    CreateClientDto,
    UpdateClientDto,
    CreateVehicleDto,
    CreateSubscriptionDto,
    ClientFilters
} from './types';

export const CLIENTS_KEYS = {
    all: ['clients'] as const,
    lists: () => [...CLIENTS_KEYS.all, 'list'] as const,
    list: (filters: string) => [...CLIENTS_KEYS.lists(), { filters }] as const,
    details: () => [...CLIENTS_KEYS.all, 'detail'] as const,
    detail: (id: number) => [...CLIENTS_KEYS.details(), id] as const,
    vehicles: (id: number) => [...CLIENTS_KEYS.detail(id), 'vehicles'] as const,
};

export const useClients = (filters?: ClientFilters) => {
    return useQuery({
        queryKey: CLIENTS_KEYS.list(JSON.stringify(filters || {})),
        queryFn: () => clientsApi.findAll(filters),
    });
};

export const useClient = (id: number) => {
    return useQuery({
        queryKey: CLIENTS_KEYS.detail(id),
        queryFn: () => clientsApi.findOne(id),
        enabled: !!id,
    });
};

export const useClientVehicles = (id: number) => {
    return useQuery({
        queryKey: CLIENTS_KEYS.vehicles(id),
        queryFn: () => clientsApi.getVehicles(id),
        enabled: !!id,
    });
};

export const useCreateClient = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateClientDto) => clientsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: CLIENTS_KEYS.lists() });
        },
    });
};

export const useUpdateClient = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: number; data: UpdateClientDto }) => clientsApi.update(args),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: CLIENTS_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: CLIENTS_KEYS.detail(variables.id) });
        },
    });
};

export const useCreateVehicle = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: number; data: CreateVehicleDto }) => clientsApi.createVehicle(args),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: CLIENTS_KEYS.vehicles(variables.id) });
            queryClient.invalidateQueries({ queryKey: CLIENTS_KEYS.detail(variables.id) });
        },
    });
};

export const useCreateSubscription = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: number; data: CreateSubscriptionDto }) => clientsApi.createSubscription(args),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: CLIENTS_KEYS.detail(variables.id) });
        },
    });
};
