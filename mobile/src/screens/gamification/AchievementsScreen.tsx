import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import type { UserAchievementListDto } from '@crabwatch/shared'
import { api } from '../../services/api'
import { Card } from '../../components/common/Card'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { Button } from '../../components/common/Button'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'

const RARITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  COMMON: { bg: '#f3f4f6', text: '#374151', border: '#e5e7eb' },
  UNCOMMON: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' },
  RARE: { bg: '#dbeafe', text: '#1e40af', border: '#bfdbfe' },
  EPIC: { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff' },
  LEGENDARY: { bg: '#fef3c7', text: '#92400e', border: '#fde68a' },
}

const CATEGORY_ICONS: Record<string, string> = {
  OBSERVATION: '\u{1F980}',
  SPECIES: '\u{1F52C}',
  EXPLORATION: '\u{1F30A}',
  QUALITY: '\u2B50',
  HIDDEN: '\u{1F52E}',
}

const CATEGORIES = ['ALL', 'OBSERVATION', 'SPECIES', 'EXPLORATION', 'QUALITY', 'HIDDEN'] as const

const STATUS_LABELS: Record<string, string> = {
  all: 'All',
  unlocked: '\u2713 Unlocked',
  in_progress: '\u{1F504} In Progress',
}

export function AchievementsScreen() {
  const [achievements, setAchievements] = useState<UserAchievementListDto[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<'all' | 'unlocked' | 'in_progress'>('all')
  const [checking, setChecking] = useState(false)

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length
  const totalCount = achievements.length

  const loadAchievements = useCallback(async () => {
    try {
      const res = await api.getAchievements()
      setAchievements(Array.isArray(res) ? res : [])
    } catch {
      console.error('Failed to load achievements')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const checkAchievements = useCallback(async () => {
    setChecking(true)
    try {
      const res = await api.checkAchievements()
      if (res?.newlyUnlocked && res.newlyUnlocked.length > 0) {
        Alert.alert(
          'Achievement Unlocked!',
          `You've unlocked: ${res.newlyUnlocked.join(', ')}`,
        )
        loadAchievements()
      } else {
        Alert.alert('No New Achievements', 'Keep going to unlock more!')
      }
    } catch {
      console.error('Failed to check achievements')
    } finally {
      setChecking(false)
    }
  }, [loadAchievements])

  useEffect(() => {
    loadAchievements()
  }, [loadAchievements])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadAchievements()
  }, [loadAchievements])

  const overallProgress = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0

  const filtered = useMemo(() => {
    return achievements.filter((a) => {
      if (filterCategory !== 'ALL' && a.category !== filterCategory) return false
      if (filterStatus === 'unlocked' && !a.isUnlocked) return false
      if (filterStatus === 'in_progress' && a.isUnlocked) return false
      return true
    })
  }, [achievements, filterCategory, filterStatus])

  const renderItem = useCallback(({ item: a }: { item: UserAchievementListDto }) => {
    const rarityStyle = RARITY_COLORS[a.rarity] || RARITY_COLORS.COMMON
    return (
      <Card
        padding={12}
        style={[
          styles.achievementCard,
          !a.isUnlocked && styles.achievementLocked,
        ]}
      >
        <View style={styles.achievementHeader}>
          <View style={[
            styles.iconCircle,
            a.isUnlocked && styles.iconCircleUnlocked,
          ]}>
            <Text style={styles.achievementIcon}>
              {a.isUnlocked ? '\u{1F3C6}' : CATEGORY_ICONS[a.category] || '\u{1F4CC}'}
            </Text>
          </View>

          <View style={styles.achievementInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.achievementName} numberOfLines={1}>{a.name}</Text>
              <View style={[styles.rarityBadge, {
                backgroundColor: rarityStyle.bg,
                borderColor: rarityStyle.border,
              }]}>
                <Text style={[styles.rarityText, { color: rarityStyle.text }]}>
                  {a.rarity}
                </Text>
              </View>
            </View>
            <Text style={styles.achievementDesc} numberOfLines={2}>{a.description}</Text>
          </View>
        </View>

        <View style={styles.achievementFooter}>
          <View style={styles.xpLabel}>
            <Ionicons name="sparkles" size={12} color={COLORS.accent} />
            <Text style={styles.xpText}>+{a.xpReward} XP</Text>
          </View>
          {a.isUnlocked && a.earnedAt && (
            <Text style={styles.earnedText}>
              Earned {new Date(a.earnedAt).toLocaleDateString()}
            </Text>
          )}
        </View>

        {!a.isUnlocked && a.target > 0 && (
          <View style={styles.achievementProgress}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabelSmall}>
                {Math.min(a.progress, a.target)}/{a.target}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${a.target > 0 ? Math.min((a.progress / a.target) * 100, 100) : 0}%`,
                  },
                  styles.progressFillLocked,
                ]}
              />
            </View>
          </View>
        )}

        {a.isUnlocked && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: '100%' }]} />
          </View>
        )}
      </Card>
    )
  }, [])

  const keyExtractor = useCallback((item: UserAchievementListDto) => item.achievementId, [])

  const ListHeader = useCallback(() => {
    const catLabels = CATEGORIES.map((cat) =>
      cat === 'ALL' ? 'All' : `${CATEGORY_ICONS[cat] || '\u{1F4CC}'} ${cat}`
    )
    return (
      <>
        <View style={styles.header}>
          <View>
            <Text style={styles.subtitle}>
              {unlockedCount} of {totalCount} unlocked
            </Text>
          </View>
          <Button
            title={checking ? 'Checking...' : 'Check'}
            variant="primary"
            disabled={checking}
            onPress={checkAchievements}
            style={styles.checkBtn}
          />
        </View>

        <Card padding={14} style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Overall Progress</Text>
            <Text style={styles.progressPercent}>{overallProgress}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${overallProgress}%` }]} />
          </View>
        </Card>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {CATEGORIES.map((cat, i) => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterBtn, filterCategory === cat && styles.filterBtnActive]}
                onPress={() => setFilterCategory(cat)}
              >
                <Text style={[styles.filterText, filterCategory === cat && styles.filterTextActive]}>
                  {catLabels[i]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.statusFilter}>
          {(['all', 'unlocked', 'in_progress'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.statusBtn, filterStatus === status && styles.statusBtnActive]}
              onPress={() => setFilterStatus(status)}
            >
              <Text style={[styles.statusText, filterStatus === status && styles.statusTextActive]}>
                {STATUS_LABELS[status]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </>
    )
  }, [filterCategory, filterStatus, checking, unlockedCount, totalCount, overallProgress, checkAchievements])

  const ListEmpty = useCallback(() => (
    <Card padding={24}>
      <View style={styles.emptyState}>
        <Ionicons name="trophy-outline" size={48} color={COLORS.textLight} />
        <Text style={styles.emptyTitle}>No achievements match your filters</Text>
      </View>
    </Card>
  ), [])

  if (loading && achievements.length === 0) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      />
    </SafeAreaView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
  },
  checkBtn: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    height: 32,
  },
  progressCard: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: FONT['sm+'],
    fontWeight: '600',
    color: COLORS.text,
  },
  progressPercent: {
    fontSize: FONT['sm+'],
    fontWeight: '600',
    color: COLORS.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressFillLocked: {
    backgroundColor: COLORS.primaryLight,
  },
  filterScroll: {
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: FONT.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: '#ffffff',
  },
  statusFilter: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  statusBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  statusText: {
    fontSize: FONT.xs,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  statusTextActive: {
    color: '#ffffff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyTitle: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  achievementCard: {
  },
  achievementLocked: {
    opacity: 0.7,
  },
  achievementHeader: {
    flexDirection: 'row',
    gap: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconCircleUnlocked: {
    backgroundColor: COLORS.warningLight,
  },
  achievementIcon: {
    fontSize: FONT['2xl'],
  },
  achievementInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  achievementName: {
    fontSize: FONT.base,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  rarityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    flexShrink: 0,
  },
  rarityText: {
    fontSize: FONT['3xs'],
    fontWeight: '600',
  },
  achievementDesc: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  achievementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  xpLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  xpText: {
    fontSize: FONT.xs,
    fontWeight: '600',
    color: COLORS.accent,
  },
  earnedText: {
    fontSize: FONT.xs,
    color: COLORS.textSecondary,
  },
  achievementProgress: {
    marginTop: 8,
  },
  progressLabelSmall: {
    fontSize: FONT.xs,
    color: COLORS.textSecondary,
  },
})
