export interface Affectation {
    id: number;
    userId: number;
    stationId: number;
    dateDebut: string;
    dateFin?: string;
    statut: 'active' | 'inactive';
    station?: { id: number; nom: string };
}

export type SanctionType = 'avertissement' | 'suspension' | 'renvoi';
export type SanctionStatusType = 'active' | 'levee';

export interface Sanction {
    id: number;
    userId: number;
    type: SanctionType;
    motif: string;
    dateDebut: string;
    dateFin?: string;
    statut: SanctionStatusType;
    createdBy: number;
    noteLevee?: string;
    createur?: { id: number; nom: string; prenom: string };
    createdAt: string;
    updatedAt: string;
}

export interface Promotion {
    id: number;
    userId: number;
    ancienRole: string;
    nouveauRole: string;
    motif: string;
    date: string;
    createdBy: number;
    promoteur?: { id: number; nom: string; prenom: string };
    createdAt: string;
    updatedAt: string;
}

export interface User {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    role: 'super_admin' | 'manager' | 'controleur' | 'caissiere' | 'laveur';
    actif: boolean;
    affectations?: Affectation[];
    sanctions?: Sanction[];
    promotions?: Promotion[];
    createdAt: string;
    updatedAt: string;
}

export interface PaginatedUsers {
    data: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface CreateUserDto {
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    password?: string;
    role: 'super_admin' | 'manager' | 'controleur' | 'caissiere' | 'laveur';
}

export interface UpdateUserDto extends Partial<Omit<CreateUserDto, 'role'>> { }

export interface AssignStationDto {
    stationId: number;
    dateDebut: string;
}

export interface TransferStationDto {
    newStationId: number;
}

export interface UserFilters {
    role?: 'super_admin' | 'manager' | 'controleur' | 'caissiere' | 'laveur';
    stationId?: number;
    search?: string;
    page?: number;
    limit?: number;
}

export interface CreateSanctionDto {
    type: SanctionType;
    motif: string;
}

export interface LiftSanctionDto {
    noteLevee?: string;
}

export interface CreatePromotionDto {
    nouveauRole: string;
    motif: string;
}
