export interface LigneVenteItem {
    produitId: number;
    quantite: number;
    prixUnitaire: number;
}

export interface Facture {
    id: number;
    couponId?: number;
    stationId: number;
    clientId?: number;
    montantTotal: number;
    tva: number;
    date: string;
    lignes: LigneVenteItem[];
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedFactures {
    data: Facture[];
    total: number;
    page: number;
    limit: number;
}

export interface CreateFactureDto {
    couponId?: number;
    stationId: number;
    clientId?: number;
    montantTotal: number;
    tva?: number;
    date: string;
    lignes?: LigneVenteItem[];
}

export interface FactureFilters {
    stationId?: number;
    page?: number;
    limit?: number;
}
