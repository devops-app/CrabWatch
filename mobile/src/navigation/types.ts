import type { NavigatorScreenParams } from '@react-navigation/native'
import type { ObservationResponse, CrabAnalysisResult, PhotoView } from '@crabwatch/shared'

export type MainTabParamList = {
  Home: undefined
  New: undefined
  Analytics: undefined
  Researcher: undefined
  Admin: undefined
  Profile: undefined
}

export type RootStackParamList = {
  // Auth screens
  Login: undefined
  Register: undefined
  ForgotPassword: undefined
  ResetPassword: { token: string }
  Consent: undefined
  // Main app
  MainTabs: NavigatorScreenParams<MainTabParamList>
  SpeciesList: undefined
  SpeciesDetail: { speciesId: string }
  SpeciesForm: { speciesId?: string }
  ObservationDetail: { observation: ObservationResponse }
  EditProfile: undefined
  AnalysisLoading: {
    photos: string[]
    views: PhotoView[]
    sessionId: string
    coinType?: string
    qualityOverrides?: Partial<Record<PhotoView, { approved: boolean; reason?: string }>>
  }
  AIReview: { analysis: CrabAnalysisResult; photos: string[]; views: PhotoView[]; sessionId: string; coinType?: string; blobUrls?: string[] }
  About: undefined
  Leaderboard: undefined
  Missions: undefined
  Achievements: undefined
  NotificationSettings: undefined
  ProfileSettings: undefined
}
