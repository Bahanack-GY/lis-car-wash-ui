import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { promotionsApi } from './api'
import type { CreatePromotionDto, UpdatePromotionDto } from './types'

export const PROMOTIONS_KEYS = {
    all: ['promotions'] as const,
    lists: () => [...PROMOTIONS_KEYS.all, 'list'] as const,
    detail: (id: number) => [...PROMOTIONS_KEYS.all, 'detail', id] as const,
    applicable: (params: Record<string, any>) => [...PROMOTIONS_KEYS.all, 'applicable', params] as const,
}

export const usePromotions = (isActive?: boolean) => {
    return useQuery({
        queryKey: [...PROMOTIONS_KEYS.lists(), { isActive }],
        queryFn: () => promotionsApi.findAll(undefined, isActive),
    })
}

export const usePromotion = (id: number) => {
    return useQuery({
        queryKey: PROMOTIONS_KEYS.detail(id),
        queryFn: () => promotionsApi.findOne(id),
        enabled: !!id,
    })
}

export const useApplicablePromotions = (params: {
    clientId: number
    typeLavageId: number
    stationId: number
    extrasIds?: number[]
}) => {
    return useQuery({
        queryKey: PROMOTIONS_KEYS.applicable(params),
        queryFn: () => promotionsApi.getApplicable(params),
        enabled: !!params.clientId && !!params.typeLavageId && !!params.stationId,
    })
}

export const useCreatePromotion = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (data: CreatePromotionDto) => promotionsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PROMOTIONS_KEYS.all })
        },
    })
}

export const useUpdatePromotion = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: ({ id, data }: { id: number; data: UpdatePromotionDto }) =>
            promotionsApi.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PROMOTIONS_KEYS.all })
        },
    })
}

export const useTogglePromotion = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: number) => promotionsApi.toggle(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: PROMOTIONS_KEYS.all })
        },
    })
}
