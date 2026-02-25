export interface CommercialRegistration {
    id: number;
    commercialId: number;
    immatriculation: string;
    prospectNom: string;
    prospectTelephone: string;
    vehicleId: number | null;
    stationId: number;
    date: string;
    confirmed: boolean;
    couponId: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface RegisterVehicleDto {
    immatriculation: string;
    prospectNom: string;
    prospectTelephone: string;
}

export interface CommercialStats {
    todayTotal: number;
    todayConfirmed: number;
    allTimeTotal: number;
    allTimeConfirmed: number;
    dailyGoal: number;
}
