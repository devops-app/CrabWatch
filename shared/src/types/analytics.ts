export interface SizeFrequencyData {
  sizeBin: string
  count: number
}

export interface GenderRatioData {
  species: string
  male: number
  female: number
  unknown: number
  ratio: number
}

export interface ConditionIndexData {
  id: string
  species: string
  cw: number
  bw: number
  conditionFactor: number
  gender: string
  lat: number
  lng: number
}

export interface ConditionIndexAggregatedData {
  species: string
  count: number
  meanConditionFactor: number
  medianConditionFactor: number
  minConditionFactor: number
  maxConditionFactor: number
  stdDevConditionFactor: number
  meanCW: number
  meanBW: number
}

export interface CW50Data {
  species: string
  cw50: number
  confidenceInterval: [number, number]
  sampleSize: number
}

export interface SpawningHotspotData {
  lat: number
  lng: number
  intensity: number
  species: string
  month: number
}

export interface TemporalTrendData {
  month: string
  count: number
  species: string
}

export interface SpeciesDistributionData {
  speciesId: string
  species: string
  commonName: string
  count: number
}

export interface DashboardStats {
  totalObservations: number
  approvedObservations: number
  pendingObservations: number
  totalSpecies: number
  totalContributors: number
  statesCovered: number
}
