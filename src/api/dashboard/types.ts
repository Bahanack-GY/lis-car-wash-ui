export interface DashboardStats {
    revenue: number;
    expenses: number;
    vehicules: number;
    lavagesActifs: number;
    reservations: number;
}

export interface RevenueData {
    date: string;
    amount: number;
}

export interface ActivityItem {
    id: number;
    type: string;
    description: string;
    timestamp: string;
    userId?: number;
}

export interface TopPerformer {
    id: number;
    nom: string;
    prenom: string;
    score: number;
    lavages: number;
}

export interface WashTypeDistribution {
    type: string;
    count: number;
    percentage: number;
}

// ─── Global (cross-station) types ─────────────────────────────

export interface GlobalStats {
    totalRevenue: number;
    totalExpenses: number;
    totalVehicules: number;
    totalLavagesActifs: number;
    totalReservations: number;
    stationCount: number;
    incidentCount: number;
}

export interface StationRevenueData {
    stationId: number;
    stationName: string;
    data: RevenueData[];
}

export interface StationRanking {
    stationId: number;
    stationName: string;
    revenue: number;
    vehicules: number;
    reservations: number;
    hasIncident: boolean;
}

export interface GlobalTopPerformer {
    id: number;
    nom: string;
    prenom: string;
    lavages: number;
    score: number;
    stationName: string;
}

// ─── Date period filtering ────────────────────────────────────

export type DatePeriod = 'today' | 'week' | 'month' | 'year' | 'custom'

export interface GlobalDateParams {
    startDate: string;  // YYYY-MM-DD
    endDate: string;    // YYYY-MM-DD
}
