import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type {
    MarketingInsights,
    MarketingSegment,
    PaginatedEnrichedClients,
    MarketingProspects,
    MarketingClientFilters,
    SmsTemplate,
    CreateTemplateDto,
    Campaign,
    CampaignDetail,
    PaginatedCampaigns,
    CreateCampaignDto,
} from './types';

export const MARKETING_KEYS = {
    all: ['marketing'] as const,
    insights: () => [...MARKETING_KEYS.all, 'insights'] as const,
    segments: () => [...MARKETING_KEYS.all, 'segments'] as const,
    clients: (filters: MarketingClientFilters) =>
        [...MARKETING_KEYS.all, 'clients', filters] as const,
    prospects: () => [...MARKETING_KEYS.all, 'prospects'] as const,
    templates: () => [...MARKETING_KEYS.all, 'templates'] as const,
    campaigns: (page: number) => [...MARKETING_KEYS.all, 'campaigns', page] as const,
    campaign: (id: number) => [...MARKETING_KEYS.all, 'campaign', id] as const,
};

const marketingApi = {
    getInsights: async (): Promise<MarketingInsights> => {
        const response = await apiClient.get<MarketingInsights>('/marketing/insights');
        return response.data;
    },
    getSegments: async (): Promise<MarketingSegment[]> => {
        const response = await apiClient.get<MarketingSegment[]>('/marketing/segments');
        return response.data;
    },
    getClients: async (filters: MarketingClientFilters): Promise<PaginatedEnrichedClients> => {
        const response = await apiClient.get<PaginatedEnrichedClients>('/marketing/clients', {
            params: filters,
        });
        return response.data;
    },
    getProspects: async (): Promise<MarketingProspects> => {
        const response = await apiClient.get<MarketingProspects>('/marketing/prospects');
        return response.data;
    },

    // Templates
    getTemplates: async (): Promise<SmsTemplate[]> => {
        const response = await apiClient.get<SmsTemplate[]>('/marketing/templates');
        return response.data;
    },
    createTemplate: async (dto: CreateTemplateDto): Promise<SmsTemplate> => {
        const response = await apiClient.post<SmsTemplate>('/marketing/templates', dto);
        return response.data;
    },
    updateTemplate: async ({ id, data }: { id: number; data: Partial<CreateTemplateDto> }): Promise<SmsTemplate> => {
        const response = await apiClient.patch<SmsTemplate>(`/marketing/templates/${id}`, data);
        return response.data;
    },
    deleteTemplate: async (id: number): Promise<void> => {
        await apiClient.delete(`/marketing/templates/${id}`);
    },

    // Campaigns
    getCampaigns: async (page = 1): Promise<PaginatedCampaigns> => {
        const response = await apiClient.get<PaginatedCampaigns>('/marketing/campaigns', { params: { page } });
        return response.data;
    },
    getCampaign: async (id: number): Promise<CampaignDetail> => {
        const response = await apiClient.get<CampaignDetail>(`/marketing/campaigns/${id}`);
        return response.data;
    },
    createCampaign: async (dto: CreateCampaignDto): Promise<CampaignDetail> => {
        const response = await apiClient.post<CampaignDetail>('/marketing/campaigns', dto);
        return response.data;
    },
    sendCampaign: async (id: number): Promise<CampaignDetail> => {
        const response = await apiClient.post<CampaignDetail>(`/marketing/campaigns/${id}/send`);
        return response.data;
    },
};

export const useMarketingInsights = () => {
    return useQuery({
        queryKey: MARKETING_KEYS.insights(),
        queryFn: () => marketingApi.getInsights(),
    });
};

export const useMarketingSegments = () => {
    return useQuery({
        queryKey: MARKETING_KEYS.segments(),
        queryFn: () => marketingApi.getSegments(),
    });
};

export const useMarketingClients = (filters: MarketingClientFilters) => {
    return useQuery({
        queryKey: MARKETING_KEYS.clients(filters),
        queryFn: () => marketingApi.getClients(filters),
    });
};

export const useMarketingProspects = () => {
    return useQuery({
        queryKey: MARKETING_KEYS.prospects(),
        queryFn: () => marketingApi.getProspects(),
    });
};

export const exportMarketingClients = async (filters: MarketingClientFilters) => {
    const response = await apiClient.get('/marketing/export', {
        params: filters,
        responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'clients-marketing.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
};

// ─── Template hooks ──────────────────────────────────────────────

export const useTemplates = () => {
    return useQuery({
        queryKey: MARKETING_KEYS.templates(),
        queryFn: () => marketingApi.getTemplates(),
    });
};

export const useCreateTemplate = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateTemplateDto) => marketingApi.createTemplate(dto),
        onSuccess: () => qc.invalidateQueries({ queryKey: MARKETING_KEYS.templates() }),
    });
};

export const useUpdateTemplate = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: number; data: Partial<CreateTemplateDto> }) =>
            marketingApi.updateTemplate(args),
        onSuccess: () => qc.invalidateQueries({ queryKey: MARKETING_KEYS.templates() }),
    });
};

export const useDeleteTemplate = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => marketingApi.deleteTemplate(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: MARKETING_KEYS.templates() }),
    });
};

// ─── Campaign hooks ──────────────────────────────────────────────

export const useCampaigns = (page = 1) => {
    return useQuery({
        queryKey: MARKETING_KEYS.campaigns(page),
        queryFn: () => marketingApi.getCampaigns(page),
    });
};

export const useCampaignDetail = (id: number) => {
    return useQuery({
        queryKey: MARKETING_KEYS.campaign(id),
        queryFn: () => marketingApi.getCampaign(id),
        enabled: !!id,
    });
};

export const useCreateCampaign = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (dto: CreateCampaignDto) => marketingApi.createCampaign(dto),
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: [...MARKETING_KEYS.all, 'campaigns'] }),
    });
};

export const useSendCampaign = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => marketingApi.sendCampaign(id),
        onSuccess: (data) => {
            qc.invalidateQueries({ queryKey: [...MARKETING_KEYS.all, 'campaigns'] });
            qc.invalidateQueries({ queryKey: MARKETING_KEYS.campaign(data.id) });
        },
    });
};
