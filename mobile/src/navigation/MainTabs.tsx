import { Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { HomeScreen } from '../screens/home/HomeScreen'
import { GuidedCaptureScreen } from '../screens/observation/GuidedCaptureScreen'
import { AnalyticsScreen } from '../screens/analytics/AnalyticsScreen'
import { ObservationScreen } from '../screens/researcher/ObservationScreen'
import { AdminScreen } from '../screens/admin/AdminScreen'
import { ProfileScreen } from '../screens/profile/ProfileScreen'
import { useAuthStore } from '../store/authStore'
import { useTheme } from '../hooks/useTheme'
import type { MainTabParamList } from './types'

const Tab = createBottomTabNavigator<MainTabParamList>()

export function MainTabs() {
  const { t } = useTranslation()
  const insets = useSafeAreaInsets()
  const { colors, isDark } = useTheme()
  const user = useAuthStore((state) => state.user)
  const isResearcher = user?.role === 'researcher' || user?.role === 'admin'
  const isAdmin = user?.role === 'admin'

  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'ios' ? 28 : 8)

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: isDark ? '#0f172a' : '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: bottomPadding,
          paddingTop: 8,
        },
        tabBarIconStyle: { marginTop: 2 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.selectionAsync()
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: t('tabs.home'),
          tabBarAccessibilityLabel: t('tabs.home'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="New"
        component={GuidedCaptureScreen}
        options={{
          title: t('tabs.new'),
          tabBarAccessibilityLabel: t('home.newObservation'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: t('tabs.analytics'),
          tabBarAccessibilityLabel: t('tabs.analytics'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={size} color={color} />
          ),
        }}
      />
      {isResearcher && (
        <Tab.Screen
          name="Observation"
          component={ObservationScreen}
          options={{
            title: t('tabs.review'),
            tabBarAccessibilityLabel: t('tabs.review'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="checkmark-circle" size={size} color={color} />
            ),
          }}
        />
      )}
      {isAdmin && (
        <Tab.Screen
          name="Admin"
          component={AdminScreen}
          options={{
            title: t('tabs.admin'),
            tabBarAccessibilityLabel: t('tabs.admin'),
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings" size={size} color={color} />
            ),
          }}
        />
      )}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('tabs.profile'),
          tabBarAccessibilityLabel: t('tabs.profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}
