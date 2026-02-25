import type { CreatePaiementDto, Paiement } from '../paiements/types';

export interface CaisseSummary {
    solde_initial: number;
    entrees: number;
    sorties: number;
    solde_final: number;
}

export interface PaginatedTransactions {
    data: Paiement[];
    total: number;
    page: number;
    limit: number;
}

export interface CaisseSummaryFilters {
    stationId: number;
    date?: string; // YYYY-MM-DD
}

export interface CaisseTransactionFilters {
    stationId: number;
    date?: string; // YYYY-MM-DD
    type?: 'income' | 'expense';
    page?: number;
    limit?: number;
}

export type { CreatePaiementDto as CreateTransactionDto };
