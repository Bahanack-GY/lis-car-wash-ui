export interface Client {
    id: number;
    stationId?: number;
    nom: string;
    contact?: string;
    email?: string;
    quartier?: string;
    pointsFidelite?: number;
    vehicleCount?: number;
    activeSubscriptionCount?: number;
    vehicleTypes?: string;
    vehicles?: Vehicle[];
    subscriptions?: Subscription[];
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedClients {
    data: Client[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface CreateClientDto {
    nom: string;
    contact?: string;
    email?: string;
    quartier?: string;
    stationId?: number;
}

export interface UpdateClientDto extends Partial<CreateClientDto> { }

export interface Vehicle {
    id: number;
    immatriculation: string;
    modele?: string;
    color?: string;
    type?: string;
    brand?: string;
    clientId: number;
    client?: Client;
    createdAt: string;
    updatedAt: string;
}

export interface CreateVehicleDto {
    immatriculation: string;
    modele?: string;
    color?: string;
    type?: string;
    brand?: string;
}

export interface Subscription {
    id: number;
    type: 'mensuel' | 'annuel';
    dateDebut: string;
    dateFin: string;
    clientId: number;
    actif: boolean;
}

export interface CreateSubscriptionDto {
    type: 'mensuel' | 'annuel';
    dateDebut: string;
    dateFin: string;
}

export interface ClientFilters {
    search?: string;
    stationId?: number;
    page?: number;
    limit?: number;
    vehicleType?: string;
    contact?: string;
    quartier?: string;
    dateFrom?: string;
    dateTo?: string;
}
