export interface WashType {
    id: number;
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
}

export interface UpdateWashTypeDto extends Partial<CreateWashTypeDto> { }
