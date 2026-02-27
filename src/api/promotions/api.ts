import { apiClient } from '@/lib/axios'
import type { Promotion, CreatePromotionDto, UpdatePromotionDto, ApplicablePromotion } from './types'

export const promotionsApi = {
    findAll: async (_stationId?: number, isActive?: boolean): Promise<Promotion[]> => {
        const params: Record<string, any> = {}
        if (isActive !== undefined) params.isActive = isActive
        const response = await apiClient.get<Promotion[]>('/marketing/promotions', { params })
        return response.data
    },

    findOne: async (id: number): Promise<Promotion> => {
        const response = await apiClient.get<Promotion>(`/marketing/promotions/${id}`)
        return response.data
    },

    create: async (data: CreatePromotionDto): Promise<Promotion> => {
        const response = await apiClient.post<Promotion>('/marketing/promotions', data)
        return response.data
    },

    update: async (id: number, data: UpdatePromotionDto): Promise<Promotion> => {
        const response = await apiClient.patch<Promotion>(`/marketing/promotions/${id}`, data)
        return response.data
    },

    toggle: async (id: number): Promise<Promotion> => {
        const response = await apiClient.patch<Promotion>(`/marketing/promotions/${id}/toggle`)
        return response.data
    },

    getApplicable: async (params: {
        clientId: number
        typeLavageId: number
        stationId: number
        extrasIds?: number[]
    }): Promise<ApplicablePromotion[]> => {
        const queryParams: Record<string, any> = {
            clientId: params.clientId,
            typeLavageId: params.typeLavageId,
            stationId: params.stationId,
        }
        if (params.extrasIds?.length) {
            queryParams.extrasIds = params.extrasIds.join(',')
        }
        const response = await apiClient.get<ApplicablePromotion[]>(
            '/marketing/promotions/applicable',
            { params: queryParams },
        )
        return response.data
    },
}
