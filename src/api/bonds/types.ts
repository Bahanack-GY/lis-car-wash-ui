export interface BonLavage {
    id: number;
    code: string;
    pourcentage: number;
    isUsed: boolean;
    usedAt: string | null;
    couponId: number | null;
    createdById: number;
    stationId: number | null;
    description: string | null;
    createdBy?: { id: number; nom: string; prenom: string; role: string };
    coupon?: { id: number; numero: string; montantTotal: number; statut: string } | null;
    station?: { id: number; nom: string } | null;
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedBonds {
    data: BonLavage[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface CreateBonLavageDto {
    pourcentage: number;
    stationId?: number;
    description?: string;
}

export interface UseBonLavageDto {
    couponId: number;
}

export interface BondFilters {
    isUsed?: boolean;
    stationId?: number;
    createdById?: number;
    page?: number;
    limit?: number;
}
