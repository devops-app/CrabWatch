import type { NavigatorScreenParams } from '@react-navigation/native'
import type { ObservationResponse, CrabAnalysisResult, PhotoView } from '@crabwatch/shared'

export type AuthStackParamList = {
  Login: undefined
  Register: undefined
}

export type MainTabParamList = {
  Home: undefined
  New: undefined
  Species: undefined
  Profile: undefined
}

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>
  SpeciesDetail: { speciesId: string }
  ObservationDetail: { observation: ObservationResponse }
  EditProfile: undefined
  AnalysisLoading: { photos: string[]; views: PhotoView[]; coinType?: string }
  AIReview: { analysis: CrabAnalysisResult; photos: string[]; views: PhotoView[]; coinType?: string }
  About: undefined
}
