export interface DashboardStats {
    revenue: number;
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
