export interface Incident {
    id: number;
    stationId: number;
    clientId?: number;
    description: string;
    dateDeclaration: string;
    statut: 'open' | 'in_progress' | 'resolved';
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedIncidents {
    data: Incident[];
    total: number;
    page: number;
    limit: number;
}

export interface CreateIncidentDto {
    stationId: number;
    clientId?: number;
    description: string;
    dateDeclaration: string;
}

export interface UpdateIncidentDto extends Partial<CreateIncidentDto> {
    statut?: 'open' | 'in_progress' | 'resolved';
}

export interface IncidentFilters {
    stationId?: number;
    statut?: 'open' | 'in_progress' | 'resolved';
    page?: number;
    limit?: number;
}
