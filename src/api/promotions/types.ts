export type PromotionType = 'discount' | 'service_offert'
export type DiscountType = 'percentage' | 'fixed'

export interface Promotion {
    id: number
    nom: string
    description?: string | null
    type: PromotionType
    discountType?: DiscountType | null
    discountValue?: number | null
    serviceSpecialId?: number | null
    serviceSpecial?: { id: number; nom: string; prix: number } | null
    minVisits: number
    maxUses?: number | null
    usedCount: number
    isActive: boolean
    startDate: string
    endDate: string
    stationId?: number | null
    station?: { id: number; nom: string } | null
    washTypes?: { id: number; nom: string; prixBase: number }[]
    createdBy: number
    creator?: { id: number; nom: string; prenom: string }
    createdAt: string
    updatedAt: string
}

export interface CreatePromotionDto {
    nom: string
    description?: string
    type: PromotionType
    discountType?: DiscountType
    discountValue?: number
    serviceSpecialId?: number
    minVisits?: number
    maxUses?: number
    startDate: string
    endDate: string
    stationId?: number
    washTypeIds: number[]
}

export interface UpdatePromotionDto extends Partial<CreatePromotionDto> {}

export interface ApplicablePromotion {
    promotion: Promotion
    effectiveDiscount: number
    visitCount: number
}
