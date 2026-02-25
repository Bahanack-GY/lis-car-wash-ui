import { apiClient } from '@/lib/axios';
import type {
    FichePiste,
    PaginatedFichesPiste,
    CreateFichePisteDto,
    UpdateFichePisteDto,
    FichePisteFilters,
    CreateNouveauLavageDto,
} from './types';

export const fichesPisteApi = {
    findAll: async (filters?: FichePisteFilters): Promise<PaginatedFichesPiste> => {
        const response = await apiClient.get<PaginatedFichesPiste>('/fiches-piste', { params: filters });
        return response.data;
    },

    findOne: async (id: number): Promise<FichePiste> => {
        const response = await apiClient.get<FichePiste>(`/fiches-piste/${id}`);
        return response.data;
    },

    create: async (data: CreateFichePisteDto): Promise<FichePiste> => {
        const response = await apiClient.post<FichePiste>('/fiches-piste', data);
        return response.data;
    },

    update: async ({ id, data }: { id: number; data: UpdateFichePisteDto }): Promise<FichePiste> => {
        const response = await apiClient.patch<FichePiste>(`/fiches-piste/${id}`, data);
        return response.data;
    },

    createNouveauLavage: async (data: CreateNouveauLavageDto): Promise<any> => {
        const response = await apiClient.post('/fiches-piste/nouveau-lavage', data);
        return response.data;
    },
};
