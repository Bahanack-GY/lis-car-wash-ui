export interface FichePiste {
    id: number;
    numero?: string;
    stationId: number;
    vehicleId: number;
    clientId: number;
    controleurId?: number;
    typeLavageId: number;
    date: string;
    etatLieu?: string;
    statut: 'open' | 'in_progress' | 'completed';
    extrasIds?: number[];
    vehicle?: { immatriculation: string; modele?: string };
    client?: { nom: string; contact?: string };
    typeLavage?: { nom: string; prixBase: number };
    extras?: { id: number; nom: string; prix: number }[];
    controleur?: { nom: string; prenom: string };
    coupon?: { id: number; numero: string; statut: string; montantTotal: number };
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedFichesPiste {
    data: FichePiste[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface CreateFichePisteDto {
    stationId: number;
    vehicleId: number;
    clientId: number;
    controleurId?: number;
    typeLavageId: number;
    date: string;
    etatLieu?: string;
    extrasIds?: number[];
}

export interface UpdateFichePisteDto extends Partial<CreateFichePisteDto> {
    statut?: 'open' | 'in_progress' | 'completed';
}

export interface FichePisteFilters {
    stationId?: number;
    clientId?: number;
    statut?: 'open' | 'in_progress' | 'completed';
    date?: string;
    page?: number;
    limit?: number;
}

export interface CreateNouveauLavageDto {
    stationId: number;
    vehicleId: number;
    clientId: number;
    controleurId?: number;
    typeLavageId: number;
    date: string;
    etatLieu?: string;
    extrasIds?: number[];
    washerIds?: number[];
}
