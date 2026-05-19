import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { api } from '../../services/api'
import { Card } from '../../components/common/Card'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { COLORS } from '../../utils/constants'
import type { GenderRatioData, SizeFrequencyData, TemporalTrendData } from '@crabwatch/shared'

export function AnalyticsScreen() {
  const [loading, setLoading] = useState(true)
  const [genderData, setGenderData] = useState<GenderRatioData[]>([])
  const [sizeData, setSizeData] = useState<SizeFrequencyData[]>([])
  const [trendData, setTrendData] = useState<TemporalTrendData[]>([])
  const [activeSection, setActiveSection] = useState<'gender' | 'size' | 'temporal'>('gender')
  const [error, setError] = useState('')

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      const [gender, size, trends] = await Promise.all([
        api.getGenderRatio().catch(() => []),
        api.getSizeFrequency().catch(() => []),
        api.getTemporalTrends().catch(() => []),
      ])
      setGenderData(Array.isArray(gender) ? gender : [])
      setSizeData(Array.isArray(size) ? size : [])
      setTrendData(Array.isArray(trends) ? trends : [])
    } catch {
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = useCallback(() => {
    setLoading(true)
    setError('')
    loadAnalytics()
  }, [])

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        <Text style={styles.headerTitle}>Analytics</Text>
        <Text style={styles.headerSub}>Population insights from observations</Text>

        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.tabs}>
          <TabButton
            label="Gender"
            icon="male-female"
            active={activeSection === 'gender'}
            onPress={() => setActiveSection('gender')}
          />
          <TabButton
            label="Size"
            icon="resize"
            active={activeSection === 'size'}
            onPress={() => setActiveSection('size')}
          />
          <TabButton
            label="Trends"
            icon="trending-up"
            active={activeSection === 'temporal'}
            onPress={() => setActiveSection('temporal')}
          />
        </View>

        {activeSection === 'gender' && (
          <GenderSection data={genderData} />
        )}

        {activeSection === 'size' && (
          <SizeSection data={sizeData} />
        )}

        {activeSection === 'temporal' && (
          <TemporalSection data={trendData} />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function TabButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  active: boolean
  onPress: () => void
}) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={18}
        color={active ? COLORS.primary : COLORS.textSecondary}
      />
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function GenderSection({ data }: { data: GenderRatioData[] }) {
  if (data.length === 0) {
    return <EmptyState message="No gender ratio data available yet" />
  }

  return (
    <View style={styles.section}>
      {data.map((item, index) => {
        const maleCount = Number((item as { male?: number | null }).male ?? 0)
        const femaleCount = Number((item as { female?: number | null }).female ?? 0)
        const unknownCount = Number((item as { unknown?: number | null }).unknown ?? 0)
        const ratioRaw = (item as { ratio?: number | null }).ratio
        const total = maleCount + femaleCount + unknownCount
        const malePct = total > 0 ? (maleCount / total) * 100 : 0
        const femalePct = total > 0 ? (femaleCount / total) * 100 : 0
        const ratioLabel =
          ratioRaw == null ? 'N/A' : Number.isFinite(Number(ratioRaw)) ? Number(ratioRaw).toFixed(2) : '∞'

        return (
          <Card key={index} padding={16}>
            <Text style={styles.speciesName}>{item.species}</Text>
            <View style={styles.barContainer}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${malePct}%`, backgroundColor: COLORS.primary },
                  ]}
                />
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${femalePct}%`,
                      backgroundColor: COLORS.accent,
                      marginLeft: malePct > 0 ? 1 : 0,
                    },
                  ]}
                />
              </View>
            </View>
            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} />
                <Text style={styles.legendText}>
                  Male ({maleCount}) — {malePct.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.accent }]} />
                <Text style={styles.legendText}>
                  Female ({femaleCount}) — {femalePct.toFixed(1)}%
                </Text>
              </View>
            </View>
            {unknownCount > 0 && (
              <Text style={styles.unknownText}>Unknown: {unknownCount}</Text>
            )}
            <Text style={styles.ratioText}>M:F Ratio = {ratioLabel}</Text>
          </Card>
        )
      })}
    </View>
  )
}

function SizeSection({ data }: { data: SizeFrequencyData[] }) {
  if (data.length === 0) {
    return <EmptyState message="No size frequency data available yet" />
  }

  const maxCount = Math.max(...data.map((d) => d.count))

  return (
    <View style={styles.section}>
      <Card padding={16}>
        <Text style={styles.sectionTitle}>Carapace Width Distribution</Text>
        <View style={styles.chartContainer}>
          {data.map((item, index) => {
            const height = maxCount > 0 ? (item.count / maxCount) * 150 : 0
            return (
              <View key={index} style={styles.barGroup}>
                <View style={styles.barWrapper}>
                  <View
                    style={[
                      styles.verticalBar,
                      { height: Math.max(height, 4) },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{item.sizeBin}</Text>
                <Text style={styles.barValue}>{item.count}</Text>
              </View>
            )
          })}
        </View>
      </Card>
    </View>
  )
}

function TemporalSection({ data }: { data: TemporalTrendData[] }) {
  if (data.length === 0) {
    return <EmptyState message="No temporal trend data available yet" />
  }

  const maxCount = Math.max(...data.map((d) => d.count))

  return (
    <View style={styles.section}>
      {data.map((item, index) => {
        const width = maxCount > 0 ? (item.count / maxCount) * 200 : 0
        return (
          <Card key={index} padding={12}>
            <View style={styles.trendRow}>
              <Text style={styles.trendMonth}>{item.month}</Text>
              <Text style={styles.trendSpecies}>{item.species}</Text>
              <Text style={styles.trendCount}>{item.count}</Text>
            </View>
            <View style={styles.trendBarTrack}>
              <View
                style={[
                  styles.trendBarFill,
                  { width: `${Math.max((width / 200) * 100, 2)}%` },
                ]}
              />
            </View>
          </Card>
        )
      })}
    </View>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card padding={32}>
      <Ionicons name="bar-chart-outline" size={48} color={COLORS.textSecondary} />
      <Text style={styles.emptyText}>{message}</Text>
    </Card>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.error,
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabLabelActive: {
    color: '#ffffff',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  speciesName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  barContainer: {
    marginBottom: 8,
  },
  barTrack: {
    height: 24,
    borderRadius: 6,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  unknownText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  ratioText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 6,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  barGroup: {
    alignItems: 'center',
    minWidth: 36,
  },
  barWrapper: {
    height: 160,
    justifyContent: 'flex-end',
    width: 28,
    alignItems: 'center',
  },
  verticalBar: {
    width: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  barValue: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 2,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  trendMonth: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    width: 60,
  },
  trendSpecies: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
    textAlign: 'right',
    marginRight: 8,
  },
  trendCount: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
    width: 30,
    textAlign: 'right',
  },
  trendBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  trendBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
})
