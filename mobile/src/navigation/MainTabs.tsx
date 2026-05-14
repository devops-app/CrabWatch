import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { HomeScreen } from '../screens/home/HomeScreen'
import { GuidedCaptureScreen } from '../screens/observation/GuidedCaptureScreen'
import { AnalyticsScreen } from '../screens/analytics/AnalyticsScreen'
import { ResearcherScreen } from '../screens/researcher/ResearcherScreen'
import { AdminScreen } from '../screens/admin/AdminScreen'
import { ProfileScreen } from '../screens/profile/ProfileScreen'
import { useAuthStore } from '../store/authStore'
import type { MainTabParamList } from './types'

const Tab = createBottomTabNavigator<MainTabParamList>()

const TAB_COLORS = {
  active: '#0284c7',
  inactive: '#94a3b8',
  background: '#f0f9ff',
  tabBar: '#ffffff',
}

export function MainTabs() {
  const user = useAuthStore((state) => state.user)
  const isResearcher = user?.role === 'researcher' || user?.role === 'admin'
  const isAdmin = user?.role === 'admin'

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0284c7' },
        headerTintColor: '#ffffff',
        headerTitleStyle: { fontWeight: 'bold' },
        tabBarActiveTintColor: TAB_COLORS.active,
        tabBarInactiveTintColor: TAB_COLORS.inactive,
        tabBarStyle: {
          backgroundColor: TAB_COLORS.tabBar,
          borderTopColor: '#e2e8f0',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarIconStyle: { marginTop: 2 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="New"
        component={GuidedCaptureScreen}
        options={{
          title: 'New',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Analytics"
        component={AnalyticsScreen}
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={size} color={color} />
          ),
        }}
      />
      {isResearcher && (
        <Tab.Screen
          name="Researcher"
          component={ResearcherScreen}
          options={{
            title: 'Review',
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
            title: 'Admin',
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
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  )
}
