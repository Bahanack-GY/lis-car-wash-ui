export interface CommandeAchat {
    id: number;
    fournisseurId: number;
    date: string;
    statut: 'pending' | 'delivered' | 'cancelled';
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedCommandesAchat {
    data: CommandeAchat[];
    total: number;
    page: number;
    limit: number;
}

export interface CreateCommandeAchatDto {
    fournisseurId: number;
    date: string;
    statut?: 'pending' | 'delivered' | 'cancelled';
}

export interface UpdateCommandeAchatDto extends Partial<CreateCommandeAchatDto> { }

export interface CommandeAchatFilters {
    fournisseurId?: number;
    statut?: 'pending' | 'delivered' | 'cancelled';
    page?: number;
    limit?: number;
}
