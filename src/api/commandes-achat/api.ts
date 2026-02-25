import { apiClient } from '@/lib/axios';
import type {
    CommandeAchat,
    PaginatedCommandesAchat,
    CreateCommandeAchatDto,
    UpdateCommandeAchatDto,
    CommandeAchatFilters
} from './types';

export const commandesAchatApi = {
    findAll: async (filters?: CommandeAchatFilters): Promise<PaginatedCommandesAchat> => {
        const response = await apiClient.get<PaginatedCommandesAchat>('/commandes-achat', { params: filters });
        return response.data;
    },

    create: async (data: CreateCommandeAchatDto): Promise<CommandeAchat> => {
        const response = await apiClient.post<CommandeAchat>('/commandes-achat', data);
        return response.data;
    },

    update: async ({ id, data }: { id: number; data: UpdateCommandeAchatDto }): Promise<CommandeAchat> => {
        const response = await apiClient.patch<CommandeAchat>(`/commandes-achat/${id}`, data);
        return response.data;
    }
};
