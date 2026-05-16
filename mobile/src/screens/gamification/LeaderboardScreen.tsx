import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../services/api'
import { Card } from '../../components/common/Card'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { COLORS } from '../../utils/constants'
import type { LeaderboardEntryDto } from '@crabwatch/shared'

type Scope = 'ALL_TIME' | 'SEASONAL'

export function LeaderboardScreen() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [scope, setScope] = useState<Scope>('ALL_TIME')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const loadLeaderboard = useCallback(async (currentPage: number, reset: boolean) => {
    try {
      const data: any = await api.getLeaderboard({ scope, page: currentPage, limit: 50 })
      const newEntries = data.entries || []
      setEntries(reset ? newEntries : [...entries, ...newEntries])
      setTotalPages(data.totalPages || 1)
      setPage(currentPage)
    } catch {
      console.error('Failed to load leaderboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [scope, entries])

  useEffect(() => {
    setLoading(true)
    setEntries([])
    setPage(1)
    loadLeaderboard(1, true)
  }, [scope])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setEntries([])
    setPage(1)
    loadLeaderboard(1, true)
  }, [loadLeaderboard])

  const loadMore = useCallback(() => {
    if (page < totalPages) {
      loadLeaderboard(page + 1, false)
    }
  }, [page, totalPages, loadLeaderboard])

  const getRankIcon = (rank: number) => {
    if (rank === 1) return { icon: '🥇', size: 28 }
    if (rank === 2) return { icon: '🥈', size: 28 }
    if (rank === 3) return { icon: '🥉', size: 28 }
    return { icon: String(rank), size: 0 }
  }

  if (loading && entries.length === 0) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        <View style={styles.scopeToggle}>
          {(['ALL_TIME', 'SEASONAL'] as Scope[]).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.scopeBtn, scope === s && styles.scopeBtnActive]}
              onPress={() => setScope(s)}
            >
              <Text style={[styles.scopeText, scope === s && styles.scopeTextActive]}>
                {s === 'ALL_TIME' ? 'All Time' : 'Seasonal'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {entries.length === 0 ? (
          <Card padding={24}>
            <View style={styles.emptyState}>
              <Ionicons name="trophy-outline" size={48} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptyText}>
                Submit your first observation to appear on the leaderboard!
              </Text>
            </View>
          </Card>
        ) : (
          <>
            {entries.map((entry) => {
              const isMe = entry.userId === user?.id
              const rankIcon = getRankIcon(entry.rank)

              return (
                <Card
                  key={entry.userId}
                  padding={14}
                  style={[styles.entryCard, isMe && styles.myEntry]}
                >
                  <View style={styles.entryRow}>
                    <View style={styles.rankCircle}>
                      {rankIcon.size > 0 ? (
                        <Text style={styles.medal}>{rankIcon.icon}</Text>
                      ) : (
                        <Text style={styles.rankText}>{rankIcon.icon}</Text>
                      )}
                    </View>

                    <View style={styles.entryInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.entryName} numberOfLines={1}>
                          {entry.name}
                        </Text>
                        {isMe && (
                          <View style={styles.meBadge}>
                            <Text style={styles.meBadgeText}>You</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.entryTitle}>{entry.title}</Text>
                    </View>

                    <View style={styles.entryStats}>
                      <View style={styles.levelBadge}>
                        <Text style={styles.levelText}>Lv.{entry.level}</Text>
                      </View>
                      <Text style={styles.xpText}>{entry.totalXP.toLocaleString()}</Text>
                    </View>
                  </View>

                  <View style={styles.subStats}>
                    <View style={styles.subStat}>
                      <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                      <Text style={styles.subStatText}>{entry.approvedCount}</Text>
                    </View>
                    {entry.currentStreak > 0 && (
                      <View style={styles.subStat}>
                        <Text style={styles.fire}>🔥</Text>
                        <Text style={styles.subStatText}>{entry.currentStreak}d</Text>
                      </View>
                    )}
                  </View>
                </Card>
              )
            })}

            {page < totalPages && (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={loadMore}>
                <Text style={styles.loadMoreText}>Load More</Text>
                <Ionicons name="chevron-down" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
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
  scopeToggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  scopeBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scopeBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  scopeText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  scopeTextActive: {
    color: '#ffffff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 10,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  entryCard: {
    marginBottom: 8,
  },
  myEntry: {
    borderColor: COLORS.primaryLight,
    borderWidth: 2,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  medal: {
    fontSize: 24,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  entryInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  entryName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  meBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: COLORS.primaryLight,
  },
  meBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.primary,
  },
  entryTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  entryStats: {
    alignItems: 'flex-end',
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  xpText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  subStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    paddingLeft: 48,
  },
  subStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  subStatText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  fire: {
    fontSize: 14,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
})
