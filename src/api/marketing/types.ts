export interface MarketingInsights {
    totalClients: number;
    activeClients: number;
    totalRevenue: number;
    avgRevenuePerClient: number;
    subscriptionCount: number;
    conversionRate: number;
}

export interface MarketingSegment {
    key: string;
    label: string;
    count: number;
    color: string;
}

export interface EnrichedClient {
    id: number;
    nom: string;
    contact?: string;
    email?: string;
    pointsFidelite: number;
    vehicleCount: number;
    totalVisits: number;
    totalSpent: number;
    lastVisitDate: string | null;
    hasSubscription: boolean;
}

export interface PaginatedEnrichedClients {
    data: EnrichedClient[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface MarketingProspects {
    totalPending: number;
    confirmedToday: number;
    conversionRate: number;
    recent: Array<{
        id: number;
        immatriculation: string;
        prospectNom: string;
        prospectTelephone: string;
        date: string;
        confirmed: boolean;
    }>;
}

export interface MarketingClientFilters {
    search?: string;
    segment?: string;
    sortBy?: 'nom' | 'visits' | 'revenue' | 'lastVisit';
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
}

// ─── SMS Templates ───────────────────────────────────────────────

export interface SmsTemplate {
    id: number;
    nom: string;
    contenu: string;
    createdAt: string;
}

export interface CreateTemplateDto {
    nom: string;
    contenu: string;
}

// ─── Campaigns ───────────────────────────────────────────────────

export type CampaignStatus = 'draft' | 'sending' | 'sent' | 'failed';

export interface Campaign {
    id: number;
    nom: string;
    message: string;
    segment?: string;
    totalRecipients: number;
    sentCount: number;
    failedCount: number;
    status: CampaignStatus;
    template?: { id: number; nom: string };
    createdAt: string;
}

export interface CampaignRecipient {
    id: number;
    clientId: number;
    telephone: string;
    status: 'pending' | 'sent' | 'failed';
    sentAt?: string;
    error?: string;
    client?: { id: number; nom: string; contact?: string };
}

export interface CampaignDetail extends Campaign {
    recipients: CampaignRecipient[];
}

export interface PaginatedCampaigns {
    data: Campaign[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface CreateCampaignDto {
    nom: string;
    templateId?: number;
    customMessage?: string;
    segment?: string;
    filters?: Record<string, any>;
}
