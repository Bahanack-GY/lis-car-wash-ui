import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type {
    AuditLog,
    PaginatedAuditLogs,
    AuditFilters,
    AuditFilterOptions,
} from './types';

const auditApi = {
    findAll: async (filters?: AuditFilters): Promise<PaginatedAuditLogs> => {
        const response = await apiClient.get<PaginatedAuditLogs>('/audit', {
            params: filters,
        });
        return response.data;
    },
    findOne: async (id: number): Promise<AuditLog> => {
        const response = await apiClient.get<AuditLog>(`/audit/${id}`);
        return response.data;
    },
    getFilterOptions: async (): Promise<AuditFilterOptions> => {
        const response = await apiClient.get<AuditFilterOptions>('/audit/filters');
        return response.data;
    },
};

export const AUDIT_KEYS = {
    all: ['audit'] as const,
    lists: () => [...AUDIT_KEYS.all, 'list'] as const,
    list: (filters: string) => [...AUDIT_KEYS.lists(), { filters }] as const,
    details: () => [...AUDIT_KEYS.all, 'detail'] as const,
    detail: (id: number) => [...AUDIT_KEYS.details(), id] as const,
    filterOptions: () => [...AUDIT_KEYS.all, 'filterOptions'] as const,
};

export const useAuditLogs = (filters?: AuditFilters) => {
    return useQuery({
        queryKey: AUDIT_KEYS.list(JSON.stringify(filters || {})),
        queryFn: () => auditApi.findAll(filters),
        placeholderData: keepPreviousData,
    });
};

export const useAuditLog = (id: number) => {
    return useQuery({
        queryKey: AUDIT_KEYS.detail(id),
        queryFn: () => auditApi.findOne(id),
        enabled: !!id,
    });
};

export const useAuditFilterOptions = () => {
    return useQuery({
        queryKey: AUDIT_KEYS.filterOptions(),
        queryFn: () => auditApi.getFilterOptions(),
        staleTime: 5 * 60 * 1000,
    });
};
