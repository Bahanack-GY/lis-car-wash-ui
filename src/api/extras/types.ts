export interface ExtraService {
    id: number;
    nom: string;
    prix: number;
    createdAt: string;
    updatedAt: string;
}

export interface CreateExtraServiceDto {
    nom: string;
    prix: number;
}

export interface UpdateExtraServiceDto extends Partial<CreateExtraServiceDto> { }
