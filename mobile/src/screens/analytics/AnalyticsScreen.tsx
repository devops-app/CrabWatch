import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import MapView, { Marker as MapMarker, PROVIDER_GOOGLE } from 'react-native-maps'
import { api } from '../../services/api'
import { Card } from '../../components/common/Card'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import { useFormatters } from '../../hooks/useFormatters'
import { MALAYSIA_BOUNDS } from '@crabwatch/shared'
import type {
  GenderRatioData,
  SizeFrequencyData,
  TemporalTrendData,
  CW50Data,
  ConditionIndexAggregatedData,
  SpeciesDistributionData,
  DashboardStats,
  ObservationResponse,
  Gender,
} from '@crabwatch/shared'

export function AnalyticsScreen() {
  const { t } = useTranslation('analytics')
  const { formatNumber, formatPercent } = useFormatters()
  const [loading, setLoading] = useState(true)
  const [genderData, setGenderData] = useState<GenderRatioData[]>([])
  const [sizeData, setSizeData] = useState<SizeFrequencyData[]>([])
  const [trendData, setTrendData] = useState<TemporalTrendData[]>([])
  const [cw50Data, setCw50Data] = useState<CW50Data[]>([])
  const [conditionData, setConditionData] = useState<ConditionIndexAggregatedData[]>([])
  const [speciesData, setSpeciesData] = useState<SpeciesDistributionData[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activeSection, setActiveSection] = useState<
    'gender' | 'size' | 'temporal' | 'cw50' | 'condition' | 'species' | 'map'
  >('gender')
  const [error, setError] = useState('')
  const [mapObs, setMapObs] = useState<ObservationResponse[]>([])
  const [mapLoading, setMapLoading] = useState(false)
  const [mapGenderFilter, setMapGenderFilter] = useState<Gender | ''>('')
  const [selectedObs, setSelectedObs] = useState<ObservationResponse | null>(null)
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null)

  useEffect(() => {
    loadAnalytics()
  }, [])

  useEffect(() => {
    if (activeSection === 'map' && mapObs.length === 0 && !mapLoading) {
      loadMapData()
    }
  }, [activeSection])

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
      setError(t('loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = useCallback(() => {
    setLoading(true)
    setError('')
    loadAnalytics()
  }, [])

  const loadMapData = useCallback(async () => {
    setMapLoading(true)
    try {
      const PAGE_LIMIT = 500
      const MAX_OBS = 5000
      const allObs: ObservationResponse[] = []
      let page = 1
      let hasMore = true

      while (hasMore && allObs.length < MAX_OBS) {
        const result = await api.listObservations({
          status: 'approved',
          page,
          limit: PAGE_LIMIT,
        })
        const obsArray = Array.isArray(result) ? result : []
        allObs.push(...obsArray)
        hasMore = obsArray.length >= PAGE_LIMIT
        page++
      }

      setMapObs(allObs)
    } catch {
      setMapObs([])
    } finally {
      setMapLoading(false)
    }
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
      <Text style={styles.headerTitle}>{t('title')}</Text>
         <Text style={styles.headerSub}>{t('subtitle')}</Text>

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
              label={t('tabs.gender')}
              icon="male-female"
              active={activeSection === 'gender'}
              onPress={() => setActiveSection('gender')}
            />
            <TabButton
              label={t('tabs.size')}
              icon="resize"
              active={activeSection === 'size'}
              onPress={() => setActiveSection('size')}
            />
            <TabButton
              label={t('tabs.cw50')}
              icon="pencil"
              active={activeSection === 'cw50'}
              onPress={() => setActiveSection('cw50')}
            />
            <TabButton
              label={t('tabs.condition')}
              icon="heart"
              active={activeSection === 'condition'}
              onPress={() => setActiveSection('condition')}
            />
            <TabButton
              label={t('tabs.species')}
              icon="earth"
              active={activeSection === 'species'}
              onPress={() => setActiveSection('species')}
            />
            <TabButton
              label={t('tabs.trends')}
              icon="trending-up"
              active={activeSection === 'temporal'}
              onPress={() => setActiveSection('temporal')}
            />
            <TabButton
              label={t('tabs.map')}
              icon="map"
              active={activeSection === 'map'}
              onPress={() => setActiveSection('map')}
            />
          </View>
        </ScrollView>

        {activeSection === 'gender' && <GenderSection data={genderData} />}

        {activeSection === 'size' && <SizeSection data={sizeData} />}

        {activeSection === 'cw50' && <CW50Section data={cw50Data} />}

        {activeSection === 'condition' && <ConditionSection data={conditionData} />}

        {activeSection === 'species' && <SpeciesSection data={speciesData} />}

        {activeSection === 'temporal' && <TemporalSection data={trendData} />}

        {activeSection === 'map' && (
          <MapSection
            loading={mapLoading}
            observations={mapObs}
            genderFilter={mapGenderFilter}
            onGenderFilterChange={setMapGenderFilter}
            selectedObs={selectedObs}
            onSelectObs={setSelectedObs}
            fullscreenPhoto={fullscreenPhoto}
            onFullscreenPhotoChange={setFullscreenPhoto}
          />
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
  const { t } = useTranslation('analytics')
  const { formatNumber, formatPercent } = useFormatters()
  if (data.length === 0) {
    return <EmptyState message={t('empty.gender')} />
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
          ratioRaw == null ? 'N/A' : Number.isFinite(Number(ratioRaw)) ? formatNumber(Number(ratioRaw), 2) : '∞'

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
                  {t('gender.male')} ({maleCount}) — {formatPercent(malePct, 1)}
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: COLORS.accent }]} />
                <Text style={styles.legendText}>
                  {t('gender.female')} ({femaleCount}) — {formatPercent(femalePct, 1)}
                </Text>
              </View>
            </View>
            {unknownCount > 0 && (
              <Text style={styles.unknownText}>{t('gender.unknown')}: {unknownCount}</Text>
            )}
            <Text style={styles.ratioText}>{t('gender.ratio')} = {ratioLabel}</Text>
          </Card>
        )
      })}
    </View>
  )
}

function SizeSection({ data }: { data: SizeFrequencyData[] }) {
  const { t } = useTranslation('analytics')
  if (data.length === 0) {
    return <EmptyState message={t('empty.size')} />
  }

  const maxCount = Math.max(...data.map((d) => d.count))

  return (
    <View style={styles.section}>
      <Card padding={16}>
        <Text style={styles.sectionTitle}>{t('size.title')}</Text>
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
  const { t } = useTranslation('analytics')
  if (data.length === 0) {
    return <EmptyState message={t('empty.trends')} />
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
  const { t } = useTranslation('analytics')
  return (
    <View style={styles.statsGrid}>
      <StatCard label={t('stats.total')} value={stats.totalObservations} icon="eye" color={COLORS.primary} />
      <StatCard label={t('stats.approved')} value={stats.approvedObservations} icon="checkmark-circle" color={COLORS.success} />
      <StatCard label={t('stats.pending')} value={stats.pendingObservations} icon="time" color={COLORS.warning} />
      <StatCard label={t('stats.species')} value={stats.totalSpecies} icon="earth" color={COLORS.accent} />
      <StatCard label={t('stats.contributors')} value={stats.totalContributors} icon="people" color="#8b5cf6" />
      <StatCard label={t('stats.states')} value={stats.statesCovered} icon="location" color="#ec4899" />
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
  const { t } = useTranslation('analytics')
  if (data.length === 0) {
    return <EmptyState message={t('empty.cw50')} />
  }

  return (
    <View style={styles.section}>
      <Card padding={16}>
    <Text style={styles.sectionTitle}>{t('cw50.title')}</Text>
         <Text style={styles.sectionDesc}>
           {t('cw50.desc')}
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
                {t('cw50.ci')}: {item.confidenceInterval[0]} – {item.confidenceInterval[1]} cm
              </Text>
              <Text style={styles.cw50MetaText}>{t('cw50.sample')} = {item.sampleSize}</Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
  )
}

function ConditionSection({ data }: { data: ConditionIndexAggregatedData[] }) {
  const { t } = useTranslation('analytics')
  const { formatNumber } = useFormatters()
  if (data.length === 0) {
    return <EmptyState message={t('empty.condition')} />
  }

  return (
    <View style={styles.section}>
      <Card padding={16}>
        <Text style={styles.sectionTitle}>{t('condition.title')}</Text>
        <Text style={styles.sectionDesc}>
          {t('condition.desc')}
        </Text>
      </Card>
      {data.map((item, index) => (
        <Card key={index} padding={16}>
          <Text style={styles.speciesName}>{item.species}</Text>
          <View style={styles.conditionGrid}>
            <View style={styles.conditionCell}>
              <Text style={styles.conditionLabel}>{t('condition.meanK')}</Text>
              <Text style={styles.conditionValue}>{formatNumber(item.meanConditionFactor, 3)}</Text>
            </View>
            <View style={styles.conditionCell}>
              <Text style={styles.conditionLabel}>{t('condition.medianK')}</Text>
              <Text style={styles.conditionValue}>{formatNumber(item.medianConditionFactor, 3)}</Text>
            </View>
            <View style={styles.conditionCell}>
              <Text style={styles.conditionLabel}>{t('condition.minK')}</Text>
              <Text style={[styles.conditionValue, { color: COLORS.warning }]}>{formatNumber(item.minConditionFactor, 3)}</Text>
            </View>
            <View style={styles.conditionCell}>
              <Text style={styles.conditionLabel}>{t('condition.maxK')}</Text>
              <Text style={[styles.conditionValue, { color: COLORS.success }]}>{formatNumber(item.maxConditionFactor, 3)}</Text>
            </View>
            <View style={styles.conditionCell}>
              <Text style={styles.conditionLabel}>{t('condition.meanCW')}</Text>
              <Text style={styles.conditionValueSecondary}>{formatNumber(item.meanCW, 1)} cm</Text>
            </View>
            <View style={styles.conditionCell}>
              <Text style={styles.conditionLabel}>{t('condition.meanBW')}</Text>
              <Text style={styles.conditionValueSecondary}>{formatNumber(item.meanBW, 1)} g</Text>
            </View>
            <View style={styles.conditionCell}>
              <Text style={styles.conditionLabel}>{t('condition.stdDev')}</Text>
              <Text style={styles.conditionValueSecondary}>{formatNumber(item.stdDevConditionFactor, 3)}</Text>
            </View>
            <View style={styles.conditionCell}>
              <Text style={styles.conditionLabel}>{t('condition.sample')}</Text>
              <Text style={styles.conditionValueSecondary}>n = {item.count}</Text>
            </View>
          </View>
        </Card>
      ))}
    </View>
  )
}

function SpeciesSection({ data }: { data: SpeciesDistributionData[] }) {
  const { t } = useTranslation('analytics')
  if (data.length === 0) {
    return <EmptyState message={t('empty.species')} />
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

const MALAYSIA_REGION = {
  latitude: MALAYSIA_BOUNDS.center.lat,
  longitude: MALAYSIA_BOUNDS.center.lng,
  latitudeDelta: MALAYSIA_BOUNDS.north - MALAYSIA_BOUNDS.south,
  longitudeDelta: MALAYSIA_BOUNDS.east - MALAYSIA_BOUNDS.west,
}

const STATUS_COLORS: Record<string, string> = {
  approved: COLORS.success,
  pending: COLORS.warning,
  rejected: COLORS.error,
  default: COLORS.textSecondary,
}

function MapSection({
  loading,
  observations,
  genderFilter,
  onGenderFilterChange,
  selectedObs,
  onSelectObs,
  fullscreenPhoto,
  onFullscreenPhotoChange,
}: {
  loading: boolean
  observations: ObservationResponse[]
  genderFilter: Gender | ''
  onGenderFilterChange: (g: Gender | '') => void
  selectedObs: ObservationResponse | null
  onSelectObs: (o: ObservationResponse | null) => void
  fullscreenPhoto: string | null
  onFullscreenPhotoChange: (p: string | null) => void
}) {
  const { t } = useTranslation('analytics')
  const mapRef = useRef<MapView | null>(null)
  const [loaded, setLoaded] = useState(false)

  const filteredObs = useMemo(() => {
    if (!genderFilter) return observations
    return observations.filter((o) => o.gender === genderFilter)
  }, [observations, genderFilter])

  const validObs = useMemo(
    () => filteredObs.filter((o) => o.lat != null && o.lng != null && o.lat !== 0 && o.lng !== 0),
    [filteredObs]
  )

  useEffect(() => {
    if (!loading && observations.length === 0 && !loaded) {
      setLoaded(true)
    } else if (observations.length > 0) {
      setLoaded(true)
    }
  }, [loading, observations.length, loaded])

  const handleMarkerPress = useCallback((obs: ObservationResponse) => {
    onSelectObs(obs)
  }, [onSelectObs])

  const handleMapPress = useCallback(() => {
    onSelectObs(null)
  }, [onSelectObs])

  if (loading || (!loaded && observations.length === 0)) {
    return (
      <View style={styles.mapLoadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.mapLoadingText}>{t('map.loading')}</Text>
      </View>
    )
  }

  return (
    <View style={styles.mapContainer}>
      <View style={styles.mapHeader}>
        <View style={styles.mapHeaderLeft}>
          <Text style={styles.mapTitle}>{t('map.title')}</Text>
          <Text style={styles.mapSubtitle}>{t('map.subtitle')}</Text>
        </View>
        <View style={styles.mapFilterRow}>
          <Text style={styles.mapFilterLabel}>{t('map.filterGender')}</Text>
          <TouchableOpacity
            style={styles.mapFilterButton}
            onPress={() => {
              const options: Gender[] = ['male', 'female', 'unknown']
              const current = genderFilter
              const idx = current ? options.indexOf(current) : -1
              const next = idx < options.length - 1 ? idx + 1 : idx === -1 ? 0 : -1
              onGenderFilterChange(next >= 0 ? options[next] : '')
            }}
          >
            <Text style={styles.mapFilterValue}>
              {genderFilter ? t(`gender.${genderFilter}`) : t('map.allGenders')}
            </Text>
            <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mapWrapper}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.mapView}
          initialRegion={MALAYSIA_REGION}
          onPress={handleMapPress}
          showsUserLocation={false}
          showsMyLocationButton={false}
        >
          {validObs.map((obs) => (
            <MapMarker
              key={obs.id}
              coordinate={{ latitude: obs.lat!, longitude: obs.lng! }}
              onPress={() => handleMarkerPress(obs)}
            >
              <View
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 7,
                  backgroundColor: STATUS_COLORS[obs.status] || STATUS_COLORS.default,
                  borderWidth: 2,
                  borderColor: '#ffffff',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.3,
                  shadowRadius: 2,
                  elevation: 3,
                }}
              />
            </MapMarker>
          ))}
        </MapView>

        {selectedObs && (
          <View style={styles.mapInfoCard}>
            <View style={styles.mapInfoHeader}>
              <View style={styles.mapInfoTitleWrap}>
                <Text style={styles.mapInfoSpecies}>{selectedObs.species.commonName}</Text>
                <Text style={styles.mapInfoScientific}>{selectedObs.species.scientificName}</Text>
              </View>
              <TouchableOpacity onPress={() => onSelectObs(null)} style={styles.mapInfoClose}>
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.mapInfoGrid}>
              <View style={styles.mapInfoRow}>
                <Text style={styles.mapInfoLabel}>CW</Text>
                <Text style={styles.mapInfoValue}>{selectedObs.cw} cm</Text>
              </View>
              <View style={styles.mapInfoRow}>
                <Text style={styles.mapInfoLabel}>BW</Text>
                <Text style={styles.mapInfoValue}>{selectedObs.bw ?? 'N/A'} g</Text>
              </View>
              <View style={styles.mapInfoRow}>
                <Text style={styles.mapInfoLabel}>{t('map.gender')}</Text>
                <Text style={[styles.mapInfoValue, { textTransform: 'capitalize' }]}>
                  {t(`gender.${selectedObs.gender}`)}
                </Text>
              </View>
              <View style={styles.mapInfoRow}>
                <Text style={styles.mapInfoLabel}>{t('map.status')}</Text>
                <Text
                  style={[
                    styles.mapInfoValue,
                    { color: STATUS_COLORS[selectedObs.status] || STATUS_COLORS.default },
                  ]}
                >
                  {selectedObs.status}
                </Text>
              </View>
            </View>
            {selectedObs.photos.length > 0 && (
              <View style={styles.mapPhotoRow}>
                {selectedObs.photos.map((photo, i) => (
                  <TouchableOpacity key={i} onPress={() => onFullscreenPhotoChange(photo)}>
                    <Image source={{ uri: photo }} style={styles.mapPhoto} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.mapStatsBadge}>
          <Text style={styles.mapStatsText}>
            {validObs.length} {t('map.observations')}
          </Text>
        </View>
      </View>

      <Modal visible={!!fullscreenPhoto} transparent animationType="fade">
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => onFullscreenPhotoChange(null)}
          >
            <Ionicons name="close" size={28} color="#ffffff" />
          </TouchableOpacity>
          <Image source={{ uri: fullscreenPhoto! }} style={styles.fullscreenImage} resizeMode="contain" />
        </View>
      </Modal>
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
  mapLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  mapLoadingText: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    marginTop: 12,
  },
  mapContainer: {
    gap: 0,
  },
  mapHeader: {
    marginBottom: 12,
    gap: 8,
  },
  mapHeaderLeft: {
    gap: 2,
  },
  mapTitle: {
    fontSize: FONT.lg,
    fontWeight: '600',
    color: COLORS.text,
  },
  mapSubtitle: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
  },
  mapFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapFilterLabel: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
  },
  mapFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mapFilterValue: {
    fontSize: FONT.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  mapWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 350,
  },
  mapView: {
    flex: 1,
  },
  mapInfoCard: {
    position: 'absolute',
    top: 12,
    right: 12,
    left: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    padding: 12,
  },
  mapInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  mapInfoTitleWrap: {
    flex: 1,
  },
  mapInfoSpecies: {
    fontSize: FONT.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  mapInfoScientific: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  mapInfoClose: {
    padding: 4,
  },
  mapInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  mapInfoRow: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  mapInfoLabel: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
  },
  mapInfoValue: {
    fontSize: FONT.sm,
    fontWeight: '600',
    color: COLORS.text,
  },
  mapPhotoRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  mapPhoto: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  mapStatsBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  mapStatsText: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenClose: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 1,
    padding: 8,
  },
  fullscreenImage: {
    width: '90%',
    height: '70%',
    borderRadius: 8,
  },
})
