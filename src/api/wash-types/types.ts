export interface WashType {
    id: number;
    stationId?: number;
    nom: string;
    particularites: string;
    prixBase: number;
    dureeEstimee: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateWashTypeDto {
    nom: string;
    particularites?: string;
    prixBase: number;
    dureeEstimee?: number;
    stationId?: number;
}

export interface UpdateWashTypeDto extends Partial<CreateWashTypeDto> { }

export interface WashTypeFilters {
    stationId?: number;
}
