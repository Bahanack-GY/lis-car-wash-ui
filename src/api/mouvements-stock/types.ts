export interface MouvementStock {
    id: number;
    produitId: number;
    date: string;
    typeMouvement: 'entree' | 'sortie' | 'ajustement';
    quantite: number;
    motif?: string;
    createdAt: string;
}

export interface PaginatedMouvementsStock {
    data: MouvementStock[];
    total: number;
    page: number;
    limit: number;
}

export interface CreateMouvementStockDto {
    produitId: number;
    date: string;
    typeMouvement: 'entree' | 'sortie' | 'ajustement';
    quantite: number;
    motif?: string;
}

export interface MouvementStockFilters {
    produitId?: number;
    stationId?: number;
    page?: number;
    limit?: number;
}
