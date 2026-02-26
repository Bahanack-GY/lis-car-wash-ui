export interface Paiement {
    id: number;
    factureId?: number;
    userId?: number;
    methode: 'cash' | 'card' | 'wave' | 'orange_money' | 'transfer' | 'bond';
    montant: number;
    referenceExterne?: string;
    type: 'income' | 'expense';
    description?: string;
    stationId?: number;
    couponId?: number;
    categorie?: string;
    justificatif?: string;
    user?: { id: number; nom: string; prenom: string; role: string };
    createdAt: string;
}

export interface PaginatedPaiements {
    data: Paiement[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface CaisseSummary {
    totalRecettes: number;
    totalDepenses: number;
    solde: number;
    nombreTransactions: number;
    stationId: number;
    date: string;
}

export interface CreatePaiementDto {
    factureId?: number;
    methode: 'cash' | 'card' | 'wave' | 'orange_money' | 'transfer' | 'bond';
    montant: number;
    referenceExterne?: string;
    type: 'income' | 'expense';
    description?: string;
    stationId?: number;
    couponId?: number;
    categorie?: string;
    justificatif?: string;
}

export interface TransactionFilters {
    stationId: number;
    userId?: number;
    date?: string;
    startDate?: string;
    endDate?: string;
    type?: 'income' | 'expense';
    page?: number;
    limit?: number;
}
