import { apiClient } from '@/lib/axios';
import type { User, PaginatedUsers, CreateUserDto, UpdateUserDto, AssignStationDto, TransferStationDto, UserFilters, Sanction, CreateSanctionDto, LiftSanctionDto } from './types';

export const usersApi = {
    findAll: async (filters?: UserFilters): Promise<PaginatedUsers> => {
        const response = await apiClient.get<PaginatedUsers>('/users', { params: filters });
        return response.data;
    },

    findAvailableWashers: async (stationId: number): Promise<User[]> => {
        const response = await apiClient.get<User[]>('/users/washers/available', { params: { stationId } });
        return response.data;
    },

    findOne: async (id: number): Promise<User> => {
        const response = await apiClient.get<User>(`/users/${id}`);
        return response.data;
    },

    create: async (data: CreateUserDto): Promise<User> => {
        const response = await apiClient.post<User>('/users', data);
        return response.data;
    },

    update: async ({ id, data }: { id: number; data: UpdateUserDto }): Promise<User> => {
        const response = await apiClient.patch<User>(`/users/${id}`, data);
        return response.data;
    },

    getPerformance: async (id: number, stationId?: number): Promise<any> => {
        const response = await apiClient.get(`/users/${id}/performance`, { params: { stationId } });
        return response.data;
    },

    assignStation: async ({ id, data }: { id: number; data: AssignStationDto }): Promise<any> => {
        const response = await apiClient.post(`/users/${id}/assign-station`, data);
        return response.data;
    },

    transferStation: async ({ id, data }: { id: number; data: TransferStationDto }): Promise<any> => {
        const response = await apiClient.post(`/users/${id}/transfer-station`, data);
        return response.data;
    },

    getUserSanctions: async (id: number): Promise<Sanction[]> => {
        const response = await apiClient.get<Sanction[]>(`/users/${id}/sanctions`);
        return response.data;
    },

    addSanction: async ({ id, data }: { id: number; data: CreateSanctionDto }): Promise<Sanction> => {
        const response = await apiClient.post<Sanction>(`/users/${id}/sanctions`, data);
        return response.data;
    },

    liftSanction: async ({ sanctionId, data }: { sanctionId: number; data: LiftSanctionDto }): Promise<Sanction> => {
        const response = await apiClient.patch<Sanction>(`/users/sanctions/${sanctionId}/lift`, data);
        return response.data;
    },
};
