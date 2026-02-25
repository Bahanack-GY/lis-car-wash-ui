export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Incident {
    id: number;
    stationId: number;
    description: string;
    severity: IncidentSeverity;
    stopsActivity: boolean;
    dateDeclaration: string;
    resolvedAt?: string;
    statut: 'open' | 'in_progress' | 'resolved';
    declarantId?: number;
    declarant?: { id: number; nom: string; prenom: string };
    station?: { id: number; nom: string };
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedIncidents {
    data: Incident[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface CreateIncidentDto {
    stationId: number;
    description: string;
    severity: IncidentSeverity;
    stopsActivity?: boolean;
    dateDeclaration: string;
}

export interface UpdateIncidentDto extends Partial<CreateIncidentDto> {
    statut?: 'open' | 'in_progress' | 'resolved';
    resolvedAt?: string;
}

export interface IncidentFilters {
    stationId?: number;
    statut?: 'open' | 'in_progress' | 'resolved';
    severity?: IncidentSeverity;
    stopsActivity?: boolean;
    page?: number;
    limit?: number;
}

export interface StationIncidentStatus {
    [stationId: number]: {
        hasStoppingIncident: boolean;
        hasNonStoppingIncident: boolean;
    };
}
