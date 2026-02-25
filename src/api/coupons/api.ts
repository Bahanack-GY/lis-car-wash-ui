import { apiClient } from '@/lib/axios';
import type {
    Coupon,
    PaginatedCoupons,
    CreateCouponDto,
    UpdateCouponStatusDto,
    AssignWashersDto,
    CouponFilters
} from './types';

export const couponsApi = {
    findAll: async (filters?: CouponFilters): Promise<PaginatedCoupons> => {
        const response = await apiClient.get<PaginatedCoupons>('/coupons', { params: filters });
        return response.data;
    },

    findMyAssigned: async (): Promise<Coupon[]> => {
        const response = await apiClient.get<Coupon[]>('/coupons/my-assigned');
        return response.data;
    },

    findOne: async (id: number): Promise<Coupon> => {
        const response = await apiClient.get<Coupon>(`/coupons/${id}`);
        return response.data;
    },

    create: async (data: CreateCouponDto): Promise<Coupon> => {
        const response = await apiClient.post<Coupon>('/coupons', data);
        return response.data;
    },

    updateStatus: async ({ id, data }: { id: number; data: UpdateCouponStatusDto }): Promise<Coupon> => {
        const response = await apiClient.patch<Coupon>(`/coupons/${id}/status`, data);
        return response.data;
    },

    assignWashers: async ({ id, data }: { id: number; data: AssignWashersDto }): Promise<Coupon> => {
        const response = await apiClient.patch<Coupon>(`/coupons/${id}/washers`, data);
        return response.data;
    }
};
