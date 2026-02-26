export interface ExtraService {
    id: number;
    stationId?: number;
    nom: string;
    prix: number;
    bonus?: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface CreateExtraServiceDto {
    nom: string;
    prix: number;
    bonus?: number | null;
    stationId?: number;
}

export interface UpdateExtraServiceDto extends Partial<CreateExtraServiceDto> { }

export interface ExtraFilters {
    stationId?: number;
}
