export interface Station {
    id: number;
    nom: string;
    adresse: string;
    town: string;
    contact?: string;
    status: 'active' | 'upcoming' | 'inactive';
    activeEmployeesCount?: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateStationDto {
    nom: string;
    adresse: string;
    town: string;
    contact?: string;
    status?: 'active' | 'upcoming' | 'inactive';
}

export interface UpdateStationDto extends Partial<CreateStationDto> { }
