import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  type ListRenderItemInfo,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../services/api'
import { Card } from '../../components/common/Card'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import type { DashboardStats } from '@crabwatch/shared'
import type { NavigationProp } from '@react-navigation/native'
import type { MainTabParamList } from '../../navigation/types'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../navigation/types'

type TabNavigation = NavigationProp<MainTabParamList>
type StackNavigation = NativeStackNavigationProp<RootStackParamList>

type SectionType = 'quick_actions' | 'gamification' | 'about'

interface SectionData {
  type: SectionType
}

export function HomeScreen() {
  const { t } = useTranslation()
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

  const onRefresh = useCallback(() => {
    setLoading(true)
    loadStats()
  }, [])

  const sections = useMemo<SectionData[]>(() => {
    const items: SectionData[] = []
    if (stats) {
      items.push({ type: 'quick_actions' })
      items.push({ type: 'gamification' })
    }
    items.push({ type: 'about' })
    return items
  }, [stats])

  const firstName = user?.name?.split(' ')[0] || t('home.contributor')

  const renderHeader = useCallback(() => (
    <>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          {t('home.greeting', { name: firstName })}
        </Text>
        <Text style={styles.subheader}>
          {t('home.subtitle')}
        </Text>
      </View>

      {stats && (
        <View style={styles.statsGrid}>
          <StatCard
            icon="fish"
            label={t('home.stats.observations')}
            value={stats.totalObservations}
          />
          <StatCard
            icon="checkmark-circle"
            label={t('home.stats.approved')}
            value={stats.approvedObservations}
          />
          <StatCard
            icon="earth"
            label={t('home.stats.species')}
            value={stats.totalSpecies}
          />
          <StatCard
            icon="people"
            label={t('home.stats.contributors')}
            value={stats.totalContributors}
          />
        </View>
      )}
    </>
  ), [user, stats, t, firstName])

  const renderSection = useCallback(({ item }: ListRenderItemInfo<SectionData>) => {
    switch (item.type) {
      case 'quick_actions':
        return (
          <Card padding={20}>
            <View style={styles.quickActions}>
              <Text style={styles.sectionTitle}>{t('home.quickActions')}</Text>
              <TouchableOpacity style={styles.actionBtn} onPress={() => tabNav.navigate('New')}>
                <Ionicons name="add-circle" size={22} color={COLORS.primary} />
                <Text style={styles.actionText}>{t('home.newObservation')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => tabNav.navigate('Analytics')}>
                <Ionicons name="analytics" size={22} color={COLORS.secondary} />
                <Text style={styles.actionText}>{t('home.analytics')}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )

      case 'gamification':
        return (
          <Card padding={20}>
            <View style={styles.quickActions}>
              <Text style={styles.sectionTitle}>{t('home.gamification')}</Text>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigateToGamification('Leaderboard')}>
                <Ionicons name="trophy" size={22} color={COLORS.accent} />
                <Text style={styles.actionText}>{t('home.leaderboard')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigateToGamification('Missions')}>
                <Ionicons name="shield-checkmark" size={22} color={COLORS.success} />
                <Text style={styles.actionText}>{t('home.missions')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigateToGamification('Achievements')}>
                <Ionicons name="ribbon" size={22} color={COLORS.primary} />
                <Text style={styles.actionText}>{t('home.achievements')}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )

      case 'about':
        return (
          <Card padding={20}>
            <View style={styles.mission}>
              <Ionicons name="information-circle" size={24} color={COLORS.primary} />
              <Text style={styles.missionTitle}>{t('home.about')}</Text>
              <Text style={styles.missionText}>
                {t('home.aboutText')}
              </Text>
            </View>
          </Card>
        )
    }
  }, [tabNav, t])

  if (loading && !stats) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={sections}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        renderItem={renderSection}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      />
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
  listContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 8,
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: FONT['4xl'],
    fontWeight: '700',
    color: COLORS.text,
  },
  subheader: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
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
    fontSize: FONT['5xl'],
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  quickActions: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: FONT.lg,
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
    fontSize: FONT.md,
    fontWeight: '500',
    color: COLORS.text,
  },
  mission: {
    gap: 8,
  },
  missionTitle: {
    fontSize: FONT.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  missionText: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
})
