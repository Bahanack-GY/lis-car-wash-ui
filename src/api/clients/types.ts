export interface Client {
    id: number;
    nom: string;
    contact?: string;
    email?: string;
    pointsFidelite?: number;
    vehicleCount?: number;
    activeSubscriptionCount?: number;
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
    page?: number;
    limit?: number;
}
