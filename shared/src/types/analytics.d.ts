export interface SizeFrequencyData {
    sizeBin: string;
    count: number;
}
export interface SexRatioData {
    species: string;
    male: number;
    female: number;
    unknown: number;
    ratio: number;
}
export interface ConditionIndexData {
    id: string;
    species: string;
    cw: number;
    bw: number;
    conditionFactor: number;
    sex: string;
    lat: number;
    lng: number;
}
export interface CW50Data {
    species: string;
    cw50: number;
    confidenceInterval: [number, number];
    sampleSize: number;
}
export interface SpawningHotspotData {
    lat: number;
    lng: number;
    intensity: number;
    species: string;
    month: number;
}
export interface TemporalTrendData {
    month: string;
    count: number;
    species: string;
}
export interface DashboardStats {
    totalObservations: number;
    approvedObservations: number;
    pendingObservations: number;
    totalSpecies: number;
    totalContributors: number;
    statesCovered: number;
}
//# sourceMappingURL=analytics.d.ts.map