import { apiClient } from '@/lib/axios';
import type {
    Client,
    PaginatedClients,
    CreateClientDto,
    UpdateClientDto,
    Vehicle,
    CreateVehicleDto,
    Subscription,
    CreateSubscriptionDto,
    ClientFilters
} from './types';

export const clientsApi = {
    findAll: async (filters?: ClientFilters): Promise<PaginatedClients> => {
        const response = await apiClient.get<PaginatedClients>('/clients', { params: filters });
        return response.data;
    },

    findOne: async (id: number): Promise<Client> => {
        const response = await apiClient.get<Client>(`/clients/${id}`);
        return response.data;
    },

    create: async (data: CreateClientDto): Promise<Client> => {
        const response = await apiClient.post<Client>('/clients', data);
        return response.data;
    },

    update: async ({ id, data }: { id: number; data: UpdateClientDto }): Promise<Client> => {
        const response = await apiClient.patch<Client>(`/clients/${id}`, data);
        return response.data;
    },

    getVehicles: async (id: number): Promise<Vehicle[]> => {
        const response = await apiClient.get<Vehicle[]>(`/clients/${id}/vehicles`);
        return response.data;
    },

    createVehicle: async ({ id, data }: { id: number; data: CreateVehicleDto }): Promise<Vehicle> => {
        const response = await apiClient.post<Vehicle>(`/clients/${id}/vehicles`, data);
        return response.data;
    },

    createSubscription: async ({ id, data }: { id: number; data: CreateSubscriptionDto }): Promise<Subscription> => {
        const response = await apiClient.post<Subscription>(`/clients/${id}/subscriptions`, data);
        return response.data;
    },

    searchVehicleByPlate: async (immatriculation: string): Promise<Vehicle | null> => {
        const response = await apiClient.get<Vehicle | null>('/clients/vehicles/search', {
            params: { immatriculation },
        });
        return response.data;
    },
};
