export interface LoginDto {
    email: string;
    password: string;
}

export interface RefreshTokenDto {
    refresh_token: string;
}

export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    user: UserProfile;
}

export interface UserProfile {
    id: number;
    email: string;
    nom: string;
    prenom: string;
    role: 'super_admin' | 'manager' | 'controleur' | 'caissiere' | 'laveur';
    telephone?: string;
    stationIds?: number[];  // affectation station IDs returned by login & /auth/me
}
