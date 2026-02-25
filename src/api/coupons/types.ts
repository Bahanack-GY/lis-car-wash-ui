export interface Coupon {
    id: number;
    numero: string;
    fichePisteId: number;
    statut: 'pending' | 'washing' | 'done' | 'paid';
    montantTotal: number;
    fichePiste?: {
        id: number;
        date: string;
        etatLieu?: string;
        stationId?: number;
        vehicle?: { id?: number; immatriculation: string; modele?: string; brand?: string; color?: string; type?: string };
        client?: { id?: number; nom: string; contact?: string; email?: string };
        typeLavage?: { id?: number; nom: string; prixBase: number; particularites?: string; dureeEstimee?: number };
        extras?: { id: number; nom: string; prix: number }[];
        station?: { id: number; nom: string; adresse?: string };
        controleur?: { id: number; nom: string; prenom: string };
    };
    washers?: { id: number; nom: string; prenom: string; email?: string; telephone?: string }[];
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedCoupons {
    data: Coupon[];
    total: number;
    page: number;
    limit: number;
}

export interface CreateCouponDto {
    fichePisteId: number;
    washerIds?: number[];
}

export interface UpdateCouponStatusDto {
    statut: 'pending' | 'washing' | 'done' | 'paid';
}

export interface AssignWashersDto {
    washerIds: number[];
}

export interface CouponFilters {
    stationId?: number;
    statut?: 'pending' | 'washing' | 'done' | 'paid';
    page?: number;
    limit?: number;
}
