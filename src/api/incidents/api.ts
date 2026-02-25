import { apiClient } from '@/lib/axios';
import type {
    Incident,
    PaginatedIncidents,
    CreateIncidentDto,
    UpdateIncidentDto,
    IncidentFilters
} from './types';

export const incidentsApi = {
    findAll: async (filters?: IncidentFilters): Promise<PaginatedIncidents> => {
        const response = await apiClient.get<PaginatedIncidents>('/incidents', { params: filters });
        return response.data;
    },

    create: async (data: CreateIncidentDto): Promise<Incident> => {
        const response = await apiClient.post<Incident>('/incidents', data);
        return response.data;
    },

    update: async ({ id, data }: { id: number; data: UpdateIncidentDto }): Promise<Incident> => {
        const response = await apiClient.patch<Incident>(`/incidents/${id}`, data);
        return response.data;
    }
};
