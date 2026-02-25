export interface Fournisseur {
    id: number;
    stationId: number;
    nom: string;
    contact?: string;
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedFournisseurs {
    data: Fournisseur[];
    total: number;
    page: number;
    limit: number;
}

export interface CreateFournisseurDto {
    stationId: number;
    nom: string;
    contact?: string;
}

export interface UpdateFournisseurDto extends Partial<CreateFournisseurDto> { }

export interface FournisseurFilters {
    stationId?: number;
    page?: number;
    limit?: number;
}
