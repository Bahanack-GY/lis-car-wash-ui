import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { couponsApi } from './api';
import type {
    CreateCouponDto,
    UpdateCouponStatusDto,
    AssignWashersDto,
    CouponFilters
} from './types';

export const COUPONS_KEYS = {
    all: ['coupons'] as const,
    lists: () => [...COUPONS_KEYS.all, 'list'] as const,
    list: (filters: string) => [...COUPONS_KEYS.lists(), { filters }] as const,
    myAssigned: () => [...COUPONS_KEYS.all, 'my-assigned'] as const,
    details: () => [...COUPONS_KEYS.all, 'detail'] as const,
    detail: (id: number) => [...COUPONS_KEYS.details(), id] as const,
};

export const useCoupons = (filters?: CouponFilters) => {
    return useQuery({
        queryKey: COUPONS_KEYS.list(JSON.stringify(filters || {})),
        queryFn: () => couponsApi.findAll(filters),
    });
};

export const useMyAssignedCoupons = () => {
    return useQuery({
        queryKey: COUPONS_KEYS.myAssigned(),
        queryFn: () => couponsApi.findMyAssigned(),
    });
};

export const useCoupon = (id: number) => {
    return useQuery({
        queryKey: COUPONS_KEYS.detail(id),
        queryFn: () => couponsApi.findOne(id),
        enabled: !!id,
    });
};

export const useCreateCoupon = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateCouponDto) => couponsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: COUPONS_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: COUPONS_KEYS.myAssigned() });
        },
    });
};

export const useUpdateCouponStatus = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: number; data: UpdateCouponStatusDto }) => couponsApi.updateStatus(args),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: COUPONS_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: COUPONS_KEYS.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: COUPONS_KEYS.myAssigned() });
        },
    });
};

export const useAssignWashers = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: number; data: AssignWashersDto }) => couponsApi.assignWashers(args),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: COUPONS_KEYS.lists() });
            queryClient.invalidateQueries({ queryKey: COUPONS_KEYS.detail(variables.id) });
            queryClient.invalidateQueries({ queryKey: COUPONS_KEYS.myAssigned() });
        },
    });
};
