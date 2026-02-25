export interface ExtraService {
    id: number;
    stationId?: number;
    nom: string;
    prix: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateExtraServiceDto {
    nom: string;
    prix: number;
    stationId?: number;
}

export interface UpdateExtraServiceDto extends Partial<CreateExtraServiceDto> { }

export interface ExtraFilters {
    stationId?: number;
}
