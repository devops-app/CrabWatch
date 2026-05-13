import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuthStore } from '../store/authStore'
import { AuthStack } from './AuthStack'
import { MainTabs } from './MainTabs'
import { SpeciesDetailScreen } from '../screens/species/SpeciesDetailScreen'
import { ObservationDetailScreen } from '../screens/observation/ObservationDetailScreen'
import { EditProfileScreen } from '../screens/profile/EditProfileScreen'
import { AnalysisLoadingScreen } from '../screens/observation/AnalysisLoadingScreen'
import { AIReviewScreen } from '../screens/observation/AIReviewScreen'
import { AboutScreen } from '../screens/common/AboutScreen'
import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()

export function AppNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <AuthStack />
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="SpeciesDetail"
        component={SpeciesDetailScreen}
        options={{ headerShown: true, headerStyle: { backgroundColor: '#0284c7' }, headerTintColor: '#fff' }}
      />
      <Stack.Screen
        name="ObservationDetail"
        component={ObservationDetailScreen}
        options={{ headerShown: true, headerStyle: { backgroundColor: '#0284c7' }, headerTintColor: '#fff' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ headerShown: true, headerTitle: 'Edit Profile', headerStyle: { backgroundColor: '#0284c7' }, headerTintColor: '#fff' }}
      />
      <Stack.Screen
        name="AnalysisLoading"
        component={AnalysisLoadingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AIReview"
        component={AIReviewScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{ headerShown: true, headerTitle: 'About CrabWatch', headerStyle: { backgroundColor: '#0284c7' }, headerTintColor: '#fff' }}
      />
    </Stack.Navigator>
  )
}
