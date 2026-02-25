export interface Reservation {
    id: number;
    numero?: string;
    clientId: number;
    vehicleId: number;
    stationId: number;
    typeLavageId: number;
    dateHeureApport: string;
    statut: 'pending' | 'confirmed' | 'done' | 'cancelled';
    client?: { nom: string; contact?: string };
    vehicle?: { immatriculation: string; modele?: string };
    station?: { nom: string };
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedReservations {
    data: Reservation[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface CreateReservationDto {
    clientId: number;
    vehicleId: number;
    stationId: number;
    typeLavageId: number;
    dateHeureApport: string;
}

export interface UpdateReservationDto extends Partial<CreateReservationDto> {
    statut?: 'pending' | 'confirmed' | 'done' | 'cancelled';
}

export interface ReservationFilters {
    stationId?: number;
    statut?: 'pending' | 'confirmed' | 'done' | 'cancelled';
    date?: string;
    page?: number;
    limit?: number;
}
