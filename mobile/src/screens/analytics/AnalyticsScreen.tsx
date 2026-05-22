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
import { FONT } from '../../utils/fonts'
import type {
  GenderRatioData,
  SizeFrequencyData,
  TemporalTrendData,
  CW50Data,
  ConditionIndexAggregatedData,
  SpeciesDistributionData,
  DashboardStats,
} from '@crabwatch/shared'

export function AnalyticsScreen() {
  const [loading, setLoading] = useState(true)
  const [genderData, setGenderData] = useState<GenderRatioData[]>([])
  const [sizeData, setSizeData] = useState<SizeFrequencyData[]>([])
  const [trendData, setTrendData] = useState<TemporalTrendData[]>([])
  const [cw50Data, setCw50Data] = useState<CW50Data[]>([])
  const [conditionData, setConditionData] = useState<ConditionIndexAggregatedData[]>([])
  const [speciesData, setSpeciesData] = useState<SpeciesDistributionData[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activeSection, setActiveSection] = useState<
    'gender' | 'size' | 'temporal' | 'cw50' | 'condition' | 'species'
  >('gender')
  const [error, setError] = useState('')

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      const [gender, size, trends, cw50, condition, species, dashboardStats] = await Promise.all([
        api.getGenderRatio().catch(() => []),
        api.getSizeFrequency().catch(() => []),
        api.getTemporalTrends().catch(() => []),
        api.getCW50().catch(() => []),
        api.getConditionIndices().catch(() => []),
        api.getSpeciesDistribution().catch(() => []),
        api.getDashboardStats().catch(() => null),
      ])
      setGenderData(Array.isArray(gender) ? gender : [])
      setSizeData(Array.isArray(size) ? size : [])
      setTrendData(Array.isArray(trends) ? trends : [])
      setCw50Data(Array.isArray(cw50) ? cw50 : [])
      setConditionData(Array.isArray(condition) ? condition : [])
      setSpeciesData(Array.isArray(species) ? species : [])
      setStats(dashboardStats ?? null)
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

        {stats && <StatsCards stats={stats} />}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
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
              label="CW50"
              icon="pencil"
              active={activeSection === 'cw50'}
              onPress={() => setActiveSection('cw50')}
            />
            <TabButton
              label="Condition"
              icon="heart"
              active={activeSection === 'condition'}
              onPress={() => setActiveSection('condition')}
            />
            <TabButton
              label="Species"
              icon="earth"
              active={activeSection === 'species'}
              onPress={() => setActiveSection('species')}
            />
            <TabButton
              label="Trends"
              icon="trending-up"
              active={activeSection === 'temporal'}
              onPress={() => setActiveSection('temporal')}
            />
          </View>
        </ScrollView>

        {activeSection === 'gender' && <GenderSection data={genderData} />}

        {activeSection === 'size' && <SizeSection data={sizeData} />}

        {activeSection === 'cw50' && <CW50Section data={cw50Data} />}

        {activeSection === 'condition' && <ConditionSection data={conditionData} />}

        {activeSection === 'species' && <SpeciesSection data={speciesData} />}

        {activeSection === 'temporal' && <TemporalSection data={trendData} />}
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

function StatsCards({ stats }: { stats: DashboardStats }) {
  return (
    <View style={styles.statsGrid}>
      <StatCard label="Total" value={stats.totalObservations} icon="eye" color={COLORS.primary} />
      <StatCard label="Approved" value={stats.approvedObservations} icon="checkmark-circle" color={COLORS.success} />
      <StatCard label="Pending" value={stats.pendingObservations} icon="time" color={COLORS.warning} />
      <StatCard label="Species" value={stats.totalSpecies} icon="earth" color={COLORS.accent} />
      <StatCard label="Contributors" value={stats.totalContributors} icon="people" color="#8b5cf6" />
      <StatCard label="States" value={stats.statesCovered} icon="location" color="#ec4899" />
    </View>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: keyof typeof Ionicons.glyphMap; color: string }) {
  return (
    <Card padding={12} style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  )
}

function CW50Section({ data }: { data: CW50Data[] }) {
  if (data.length === 0) {
    return <EmptyState message="No CW50 maturity data available yet" />
  }

  return (
    <View style={styles.section}>
      <Card padding={16}>
        <Text style={styles.sectionTitle}>Size at Gender Maturity (CW50)</Text>
        <Text style={styles.sectionDesc}>
          Carapace width at which 50% of the population is mature
        </Text>
      </Card>
      {data.map((item, index) => (
        <Card key={index} padding={16}>
          <Text style={styles.speciesName}>{item.species}</Text>
          <View style={styles.cw50Row}>
            <View style={styles.cw50ValueContainer}>
              <Text style={styles.cw50Value}>{item.cw50}</Text>
              <Text style={styles.cw50Unit}>cm</Text>
            </View>
            <View style={styles.cw50Meta}>
              <Text style={styles.cw50MetaText}>
                CI: {item.confidenceInterval[0]} – {item.confidenceInterval[1]} cm
              </Text>
              <Text style={styles.cw50MetaText}>n = {item.sampleSize}</Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
  )
}

function ConditionSection({ data }: { data: ConditionIndexAggregatedData[] }) {
  if (data.length === 0) {
    return <EmptyState message="No condition index data available yet" />
  }

  return (
    <View style={styles.section}>
      <Card padding={16}>
        <Text style={styles.sectionTitle}>Condition Index (K)</Text>
        <Text style={styles.sectionDesc}>
          Health indicator: K = (BW / CW³) × 100 — higher values indicate healthier crabs
        </Text>
      </Card>
      {data.map((item, index) => (
        <Card key={index} padding={16}>
          <Text style={styles.speciesName}>{item.species}</Text>
          <View style={styles.conditionGrid}>
            <View style={styles.conditionCell}>
              <Text style={styles.conditionLabel}>Mean K</Text>
              <Text style={styles.conditionValue}>{item.meanConditionFactor.toFixed(3)}</Text>
            </View>
            <View style={styles.conditionCell}>
              <Text style={styles.conditionLabel}>Median K</Text>
              <Text style={styles.conditionValue}>{item.medianConditionFactor.toFixed(3)}</Text>
            </View>
            <View style={styles.conditionCell}>
              <Text style={styles.conditionLabel}>Min K</Text>
              <Text style={[styles.conditionValue, { color: COLORS.warning }]}>{item.minConditionFactor.toFixed(3)}</Text>
            </View>
            <View style={styles.conditionCell}>
              <Text style={styles.conditionLabel}>Max K</Text>
              <Text style={[styles.conditionValue, { color: COLORS.success }]}>{item.maxConditionFactor.toFixed(3)}</Text>
            </View>
            <View style={styles.conditionCell}>
              <Text style={styles.conditionLabel}>Mean CW</Text>
              <Text style={styles.conditionValueSecondary}>{item.meanCW.toFixed(1)} cm</Text>
            </View>
            <View style={styles.conditionCell}>
              <Text style={styles.conditionLabel}>Mean BW</Text>
              <Text style={styles.conditionValueSecondary}>{item.meanBW.toFixed(1)} g</Text>
            </View>
            <View style={styles.conditionCell}>
              <Text style={styles.conditionLabel}>Std Dev</Text>
              <Text style={styles.conditionValueSecondary}>{item.stdDevConditionFactor.toFixed(3)}</Text>
            </View>
            <View style={styles.conditionCell}>
              <Text style={styles.conditionLabel}>Sample</Text>
              <Text style={styles.conditionValueSecondary}>n = {item.count}</Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
  )
}

function SpeciesSection({ data }: { data: SpeciesDistributionData[] }) {
  if (data.length === 0) {
    return <EmptyState message="No species distribution data available yet" />
  }

  const maxCount = Math.max(...data.map((d) => d.count))

  return (
    <View style={styles.section}>
      {data.map((item, index) => {
        const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0
        return (
          <Card key={index} padding={14}>
            <View style={styles.speciesRow}>
              <View style={styles.speciesInfo}>
                <Text style={styles.speciesCommonName}>{item.commonName}</Text>
                <Text style={styles.speciesScientific}>{item.species}</Text>
              </View>
              <Text style={styles.speciesCount}>{item.count}</Text>
            </View>
            <View style={styles.speciesBarTrack}>
              <View
                style={[
                  styles.speciesBarFill,
                  { width: `${Math.max(barWidth, 2)}%` },
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
   tabsScroll: {
     marginBottom: 16,
   },
   statsGrid: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     gap: 8,
     marginBottom: 16,
   },
   statCard: {
     flex: 1,
     minWidth: '30%',
     alignItems: 'center',
     paddingVertical: 10,
   },
   statIcon: {
     width: 28,
     height: 28,
     borderRadius: 14,
     alignItems: 'center',
     justifyContent: 'center',
     marginBottom: 4,
   },
statValue: {
      fontSize: FONT.xl,
      fontWeight: '700',
      color: COLORS.text,
    },
    statLabel: {
      fontSize: FONT.xs,
      color: COLORS.textSecondary,
      marginTop: 2,
    },
    sectionDesc: {
      fontSize: FONT.sm,
      color: COLORS.textSecondary,
      marginTop: 4,
      marginBottom: 4,
    },
   cw50Row: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
   },
   cw50ValueContainer: {
     flexDirection: 'row',
     alignItems: 'baseline',
     gap: 4,
   },
cw50Value: {
      fontSize: FONT['3xl'],
      fontWeight: '700',
      color: COLORS.primary,
    },
    cw50Unit: {
      fontSize: FONT.base,
      color: COLORS.textSecondary,
    },
   cw50Meta: {
     alignItems: 'flex-end',
     gap: 2,
   },
cw50MetaText: {
      fontSize: FONT.sm,
      color: COLORS.textSecondary,
    },
   conditionGrid: {
     flexDirection: 'row',
     flexWrap: 'wrap',
     gap: 8,
   },
   conditionCell: {
     flex: 1,
     minWidth: '40%',
     backgroundColor: COLORS.background,
     borderRadius: 8,
     padding: 10,
   },
conditionLabel: {
      fontSize: FONT.xs,
      color: COLORS.textSecondary,
      marginBottom: 2,
    },
    conditionValue: {
      fontSize: FONT.base,
      fontWeight: '600',
      color: COLORS.primary,
    },
    conditionValueSecondary: {
      fontSize: FONT['sm+'],
      fontWeight: '600',
      color: COLORS.text,
    },
   speciesRow: {
     flexDirection: 'row',
     alignItems: 'center',
     justifyContent: 'space-between',
     marginBottom: 8,
   },
   speciesInfo: {
     flex: 1,
     marginRight: 8,
   },
speciesCommonName: {
      fontSize: FONT.base,
      fontWeight: '600',
      color: COLORS.text,
    },
    speciesScientific: {
      fontSize: FONT.sm,
      color: COLORS.textSecondary,
      fontStyle: 'italic',
    },
    speciesCount: {
      fontSize: FONT.xl,
      fontWeight: '700',
      color: COLORS.primary,
    },
   speciesBarTrack: {
     height: 6,
     borderRadius: 3,
     backgroundColor: COLORS.background,
     overflow: 'hidden',
   },
   speciesBarFill: {
     height: '100%',
     backgroundColor: COLORS.primary,
     borderRadius: 3,
   },
  headerTitle: {
    fontSize: FONT['2xl'],
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  headerSub: {
    fontSize: FONT.base,
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
    fontSize: FONT.base,
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
    fontSize: FONT['sm+'],
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
    fontSize: FONT.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 12,
  },
  speciesName: {
    fontSize: FONT.lg,
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
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
  },
  unknownText: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  ratioText: {
    fontSize: FONT['sm+'],
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
    fontSize: FONT['2xs'],
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  barValue: {
    fontSize: FONT.xs,
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
    fontSize: FONT['sm+'],
    fontWeight: '600',
    color: COLORS.text,
    width: 60,
  },
  trendSpecies: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    flex: 1,
    textAlign: 'right',
    marginRight: 8,
  },
  trendCount: {
    fontSize: FONT['sm+'],
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
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
})
