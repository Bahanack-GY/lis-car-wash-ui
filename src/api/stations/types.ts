export interface Station {
    id: number;
    nom: string;
    adresse: string;
    town: string;
    contact?: string;
    status: 'active' | 'upcoming' | 'inactive';
    activeEmployeesCount?: number;
    employeeCount?: number;
    managerName?: string;
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
