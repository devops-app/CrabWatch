export interface Species {
  id: string
  scientificName: string
  commonName: string
  description: string
  keyFeatures: KeyFeature[]
  images: string[]
  distributionZones: DistributionZone[]
}

export interface KeyFeature {
  trait: string
  value: string
}

export interface DistributionZone {
  name: string
  polygon: [number, number][]
}

export interface CreateSpeciesInput {
  scientificName: string
  commonName: string
  description: string
  keyFeatures: KeyFeature[]
  images: string[]
  distributionZones: DistributionZone[]
}

export interface UpdateSpeciesInput {
  scientificName?: string
  commonName?: string
  description?: string
  keyFeatures?: KeyFeature[]
  images?: string[]
  distributionZones?: DistributionZone[]
}

export interface SpeciesResponse {
  id: string
  scientificName: string
  commonName: string
  description: string
  keyFeatures: KeyFeature[]
  images: string[]
  distributionZones: DistributionZone[]
}

export interface SpeciesTranslation {
  commonName: string
  description: string
  keyFeatures: KeyFeature[]
  distributionZones: { name: string }[]
}
