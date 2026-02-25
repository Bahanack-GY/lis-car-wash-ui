export interface Produit {
    id: number;
    stationId: number;
    nom: string;
    categorie: 'chimique' | 'equipement' | 'consommable';
    quantiteStock: number;
    quantiteAlerte: number;
    prix?: number;
    unite?: string;
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedProduits {
    data: Produit[];
    total: number;
    page: number;
    limit: number;
}

export interface CreateProduitDto {
    stationId: number;
    nom: string;
    categorie: 'chimique' | 'equipement' | 'consommable';
    quantiteStock?: number;
    quantiteAlerte?: number;
    prix?: number;
    unite?: string;
}

export interface UpdateProduitDto extends Partial<CreateProduitDto> { }

export interface ProduitFilters {
    stationId?: number;
    categorie?: 'chimique' | 'equipement' | 'consommable';
    lowStock?: boolean;
    page?: number;
    limit?: number;
}
