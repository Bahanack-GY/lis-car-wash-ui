import { apiClient } from '@/lib/axios';
import type {
    Reservation,
    PaginatedReservations,
    CreateReservationDto,
    UpdateReservationDto,
    ReservationFilters
} from './types';

export const reservationsApi = {
    findAll: async (filters?: ReservationFilters): Promise<PaginatedReservations> => {
        const response = await apiClient.get<PaginatedReservations>('/reservations', { params: filters });
        return response.data;
    },

    findOne: async (id: number): Promise<Reservation> => {
        const response = await apiClient.get<Reservation>(`/reservations/${id}`);
        return response.data;
    },

    create: async (data: CreateReservationDto): Promise<Reservation> => {
        const response = await apiClient.post<Reservation>('/reservations', data);
        return response.data;
    },

    update: async ({ id, data }: { id: number; data: UpdateReservationDto }): Promise<Reservation> => {
        const response = await apiClient.patch<Reservation>(`/reservations/${id}`, data);
        return response.data;
    }
};
