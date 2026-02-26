export interface AuditLog {
    id: number;
    userId: number | null;
    userName: string | null;
    userRole: string | null;
    userPhone: string | null;
    action: string;
    actionLabel: string;
    entity: string;
    entityId: string | null;
    stationId: number | null;
    stationName: string | null;
    timestamp: string;
    route: string;
    statusCode: number | null;
    requestBody: Record<string, any> | null;
    metadata: Record<string, any> | null;
}

export interface PaginatedAuditLogs {
    data: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface AuditFilters {
    userId?: number;
    entity?: string;
    action?: string;
    stationId?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface AuditFilterOptions {
    entities: string[];
    actions: string[];
}
