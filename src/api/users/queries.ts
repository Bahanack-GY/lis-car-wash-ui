import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from './api';
import type { CreateUserDto, UpdateUserDto, AssignStationDto, TransferStationDto, UserFilters, CreateSanctionDto, LiftSanctionDto } from './types';

export const USERS_KEYS = {
    all: ['users'] as const,
    lists: () => [...USERS_KEYS.all, 'list'] as const,
    list: (filters: string) => [...USERS_KEYS.lists(), { filters }] as const,
    details: () => [...USERS_KEYS.all, 'detail'] as const,
    detail: (id: number) => [...USERS_KEYS.details(), id] as const,
    availableWashers: (stationId: number) => [...USERS_KEYS.all, 'availableWashers', stationId] as const,
    performance: (id: number, stationId?: number) => [...USERS_KEYS.detail(id), 'performance', stationId] as const,
};

export const useUsers = (filters?: UserFilters) => {
    return useQuery({
        queryKey: USERS_KEYS.list(JSON.stringify(filters || {})),
        queryFn: () => usersApi.findAll(filters),
    });
};

export const useAvailableWashers = (stationId: number) => {
    return useQuery({
        queryKey: USERS_KEYS.availableWashers(stationId),
        queryFn: () => usersApi.findAvailableWashers(stationId),
        enabled: !!stationId,
    });
};

export const useUser = (id: number) => {
    return useQuery({
        queryKey: USERS_KEYS.detail(id),
        queryFn: () => usersApi.findOne(id),
        enabled: !!id,
    });
};

export const useUserPerformance = (id: number, stationId?: number) => {
    return useQuery({
        queryKey: USERS_KEYS.performance(id, stationId),
        queryFn: () => usersApi.getPerformance(id, stationId),
        enabled: !!id,
    });
};

export const useCreateUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateUserDto) => usersApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: USERS_KEYS.lists() });
        },
    });
};

export const useUpdateUser = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: number; data: UpdateUserDto }) => usersApi.update(args),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: USERS_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: USERS_KEYS.detail(variables.id) });
        },
    });
};

export const useAssignStation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: number; data: AssignStationDto }) => usersApi.assignStation(args),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: USERS_KEYS.detail(variables.id) });
        },
    });
};

export const useTransferStation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: number; data: TransferStationDto }) => usersApi.transferStation(args),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: USERS_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: USERS_KEYS.detail(variables.id) });
        },
    });
};

export const useAddSanction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: number; data: CreateSanctionDto }) => usersApi.addSanction(args),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: USERS_KEYS.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: USERS_KEYS.lists() });
        },
    });
};

export const useLiftSanction = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { sanctionId: number; userId: number; data: LiftSanctionDto }) =>
            usersApi.liftSanction({ sanctionId: args.sanctionId, data: args.data }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: USERS_KEYS.detail(variables.userId) });
            queryClient.invalidateQueries({ queryKey: USERS_KEYS.lists() });
        },
    });
};
