import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../services/api'
import { Card } from '../../components/common/Card'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { COLORS } from '../../utils/constants'
import type { DashboardStats } from '@crabwatch/shared'
import type { NavigationProp } from '@react-navigation/native'
import type { MainTabParamList } from '../../navigation/types'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../navigation/types'

type TabNavigation = NavigationProp<MainTabParamList>
type StackNavigation = NativeStackNavigationProp<RootStackParamList>

export function HomeScreen() {
  const tabNav = useNavigation<TabNavigation>()
  const { user } = useAuth()

  const navigateToGamification = (screen: 'Leaderboard' | 'Missions' | 'Achievements') => {
    const parentNav = tabNav.getParent<StackNavigation>()
    parentNav?.navigate(screen)
  }
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const data = await api.getDashboardStats()
      setStats(data)
    } catch {
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Welcome, {user?.name?.split(' ')[0] || 'Contributor'}
          </Text>
          <Text style={styles.subheader}>
            Track crab populations across Malaysia
          </Text>
        </View>

        {stats && (
          <>
            <View style={styles.statsGrid}>
              <StatCard
                icon="fish"
                label="Observations"
                value={stats.totalObservations}
              />
              <StatCard
                icon="checkmark-circle"
                label="Approved"
                value={stats.approvedObservations}
              />
              <StatCard
                icon="earth"
                label="Species"
                value={stats.totalSpecies}
              />
              <StatCard
                icon="people"
                label="Contributors"
                value={stats.totalContributors}
              />
            </View>

            <Card padding={20}>
              <View style={styles.quickActions}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <TouchableOpacity style={styles.actionBtn} onPress={() => tabNav.navigate('New')}>
                  <Ionicons name="add-circle" size={22} color={COLORS.primary} />
                  <Text style={styles.actionText}>New Observation</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => tabNav.navigate('Analytics')}>
                  <Ionicons name="analytics" size={22} color={COLORS.secondary} />
                  <Text style={styles.actionText}>Analytics</Text>
                </TouchableOpacity>
              </View>
            </Card>

            <Card padding={20}>
              <View style={styles.quickActions}>
                <Text style={styles.sectionTitle}>Gamification</Text>
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigateToGamification('Leaderboard')}>
                  <Ionicons name="trophy" size={22} color={COLORS.accent} />
                  <Text style={styles.actionText}>Leaderboard</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigateToGamification('Missions')}>
                  <Ionicons name="shield-checkmark" size={22} color={COLORS.success} />
                  <Text style={styles.actionText}>Missions</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigateToGamification('Achievements')}>
                  <Ionicons name="ribbon" size={22} color={COLORS.primary} />
                  <Text style={styles.actionText}>Achievements</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </>
        )}

        <Card padding={20}>
          <View style={styles.mission}>
            <Ionicons name="information-circle" size={24} color={COLORS.primary} />
            <Text style={styles.missionTitle}>About CrabWatch</Text>
            <Text style={styles.missionText}>
              CrabWatch is a citizen science platform helping to conserve
              crab populations in Malaysia. Your observations help
              researchers understand population health and inform
              conservation policies.
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: number
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={24} color={COLORS.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  subheader: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  quickActions: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.background,
    borderRadius: 10,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  mission: {
    gap: 8,
  },
  missionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  missionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
})
