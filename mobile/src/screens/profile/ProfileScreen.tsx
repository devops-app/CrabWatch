import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../services/api'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { COLORS, STATUS_COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import { formatDate, formatStatus } from '../../utils/formatters'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { ObservationResponse, UserStatsDto } from '@crabwatch/shared'
import type { RootStackParamList } from '../../navigation/types'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { user, logout } = useAuth()
  const [observations, setObservations] = useState<ObservationResponse[]>([])
  const [stats, setStats] = useState<UserStatsDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [obsData, statsData] = await Promise.all([
        api.listObservations({ limit: 20 }).catch(() => ({ observations: [] })),
        api.getMyStats().catch(() => null),
      ])
      setObservations(Array.isArray(obsData.observations) ? obsData.observations : [])
      setStats(statsData?.stats || null)
    } catch {
      setObservations([])
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  const approvedCount = observations.filter((o) => o.status === 'approved').length

  const roleColors: Record<string, string> = {
    user: COLORS.primary,
    researcher: COLORS.secondary,
    admin: COLORS.accent,
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {user?.phoneNumber && <Text style={styles.email}>{user.phoneCode} {user.phoneNumber}</Text>}
          {user?.addressLine1 && <Text style={styles.email}>{user.addressLine1}{user.addressLine2 ? `, ${user.addressLine2}` : ''}</Text>}
          {[user?.addressLine3, user?.state, user?.postcode, user?.country].filter(Boolean).length > 0 && (
            <Text style={styles.email}>
              {[user?.addressLine3, user?.state, user?.postcode, user?.country].filter(Boolean).join(', ')}
            </Text>
          )}
          <View style={styles.roleBadge}>
            <Text
              style={[
                styles.roleText,
                { color: roleColors[user?.role || 'user'] || COLORS.primary },
              ]}
            >
              {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Citizen'}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{approvedCount}</Text>
            <Text style={styles.statLabel}>Approved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{observations.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {observations.filter((o) => o.status === 'pending').length}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>

        <View style={styles.engagementSection}>
          <Text style={styles.sectionTitle}>Gamification</Text>
          <View style={styles.engagementGrid}>
            <TouchableOpacity
              style={styles.engagementCard}
              onPress={() => navigation.navigate('Leaderboard')}
            >
              <View style={[styles.engagementIcon, { backgroundColor: COLORS.warningLight }]}>
                <Ionicons name="trophy" size={22} color={COLORS.accent} />
              </View>
              <Text style={styles.engagementTitle}>Leaderboard</Text>
              <Text style={styles.engagementDesc}>See top contributors</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.engagementCard}
              onPress={() => navigation.navigate('Missions')}
            >
              <View style={[styles.engagementIcon, { backgroundColor: COLORS.successLight }]}>
                <Ionicons name="shield-checkmark" size={22} color={COLORS.success} />
              </View>
              <Text style={styles.engagementTitle}>Missions</Text>
              <Text style={styles.engagementDesc}>Daily challenges</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.engagementCard}
              onPress={() => navigation.navigate('Achievements')}
            >
              <View style={[styles.engagementIcon, { backgroundColor: COLORS.primaryLight }]}>
                <Ionicons name="ribbon" size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.engagementTitle}>Achievements</Text>
              <Text style={styles.engagementDesc}>Your badges</Text>
            </TouchableOpacity>
          </View>
        </View>

        {stats && (
          <Card padding={16} style={styles.xpCard}>
            <View style={styles.xpHeader}>
              <View style={styles.xpInfo}>
                <Text style={styles.xpLevel}>Level {stats.level}</Text>
                <Text style={styles.xpTitle}>{stats.title}</Text>
              </View>
              <View style={styles.xpValue}>
                <Ionicons name="sparkles" size={16} color={COLORS.accent} />
                <Text style={styles.xpNumber}>{stats.totalXP.toLocaleString()}</Text>
              </View>
            </View>

            {stats.xpToNextLevel > 0 && (
              <View style={styles.xpProgress}>
                <View style={styles.xpProgressHeader}>
                  <Text style={styles.xpProgressText}>
                    XP Progress
                  </Text>
                  <Text style={styles.xpProgressText}>
                    {stats.totalXP % (stats.xpToNextLevel + (stats.level > 0 ? 0 : 0))}/{stats.xpToNextLevel}
                  </Text>
                </View>
                <View style={styles.xpBar}>
                  <View
                    style={[
                      styles.xpFill,
                      { width: `${Math.min(100, ((stats.totalXP % stats.xpToNextLevel) / stats.xpToNextLevel) * 100)}%` },
                    ]}
                  />
                </View>
              </View>
            )}

            <View style={styles.xpStats}>
              <View style={styles.xpStat}>
                <Ionicons name="flame" size={16} color={COLORS.accent} />
                <Text style={styles.xpStatValue}>{stats.currentStreak}</Text>
                <Text style={styles.xpStatLabel}>Streak</Text>
              </View>
              <View style={styles.xpStatDivider} />
              <View style={styles.xpStat}>
                <Ionicons name="trophy" size={16} color={COLORS.accent} />
                <Text style={styles.xpStatValue}>{stats.longestStreak}</Text>
                <Text style={styles.xpStatLabel}>Best</Text>
              </View>
              <View style={styles.xpStatDivider} />
              <View style={styles.xpStat}>
                <Ionicons name="checkmark-done" size={16} color={COLORS.success} />
                <Text style={styles.xpStatValue}>{stats.approvedCount}</Text>
                <Text style={styles.xpStatLabel}>Approved</Text>
              </View>
            </View>
          </Card>
        )}

        <View style={styles.actionsRow}>
          <Button
            title="Edit Profile"
            variant="secondary"
            onPress={() => navigation.navigate('EditProfile')}
            style={styles.actionBtn}
          />
          <Button
            title="Settings"
            variant="secondary"
            onPress={() => navigation.navigate('ProfileSettings')}
            style={styles.actionBtn}
          />
        </View>

        <Button
          title="Sign Out"
          variant="secondary"
          onPress={() => {
            Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
            ])
          }}
          style={styles.fullWidthBtn}
        />

        <Text style={styles.sectionTitle}>Recent Submissions</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <LoadingSpinner />
          </View>
        ) : observations.length === 0 ? (
          <Card padding={24}>
            <View style={styles.emptyCard}>
              <Ionicons name="document-outline" size={40} color={COLORS.textLight} />
              <Text style={styles.emptyTitle}>No observations yet</Text>
              <Text style={styles.emptyText}>
                Start contributing by submitting your first observation
              </Text>
            </View>
          </Card>
        ) : (
          observations.map((obs) => (
            <TouchableOpacity
              key={obs.id}
              style={styles.obsCard}
              onPress={() =>
                navigation.navigate('ObservationDetail', { observation: obs })
              }
            >
              <View style={styles.obsHeader}>
                <Text style={styles.obsSpecies}>{obs.species.scientificName}</Text>
                <View
                  style={[
                    styles.obsStatus,
                    {
                      backgroundColor:
                        STATUS_COLORS[obs.status] || COLORS.textLight,
                    },
                  ]}
                >
                  <Text style={styles.obsStatusText}>
                    {formatStatus(obs.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.obsDetails}>
                CW: {obs.cw.toFixed(1)}cm | BW: {obs.bw != null ? `${obs.bw.toFixed(0)}g` : 'N/A'} |{' '}
                {formatDate(obs.createdAt)}
              </Text>
            </TouchableOpacity>
          ))
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.border,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: FONT['3xl'],
    fontWeight: '700',
    color: '#ffffff',
  },
  name: {
    fontSize: FONT['2xl'],
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
  },
  email: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleText: {
    fontSize: FONT['sm+'],
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT['2xl'],
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  xpCard: {
    marginBottom: 16,
  },
  xpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  xpInfo: {
    flex: 1,
  },
  xpLevel: {
    fontSize: FONT.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  xpTitle: {
    fontSize: FONT['sm+'],
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  xpValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  xpNumber: {
    fontSize: FONT.xl,
    fontWeight: '700',
    color: COLORS.accent,
  },
  xpProgress: {
    marginBottom: 12,
  },
  xpProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  xpProgressText: {
    fontSize: FONT.xs,
    color: COLORS.textSecondary,
  },
  xpBar: {
    height: 6,
    backgroundColor: COLORS.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  xpStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  xpStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  xpStatValue: {
    fontSize: FONT.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  xpStatLabel: {
    fontSize: FONT.xs,
    color: COLORS.textSecondary,
  },
  xpStatDivider: {
    width: 1,
    backgroundColor: COLORS.border,
  },
  engagementSection: {
    marginBottom: 16,
  },
  engagementGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  engagementCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  engagementIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  engagementTitle: {
    fontSize: FONT['sm+'],
    fontWeight: '600',
    color: COLORS.text,
  },
  engagementDesc: {
    fontSize: FONT.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
  },
  fullWidthBtn: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: FONT.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyTitle: {
    fontSize: FONT.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 10,
  },
  emptyText: {
    fontSize: FONT['sm+'],
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  obsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  obsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  obsSpecies: {
    fontSize: FONT.base,
    fontWeight: '600',
    color: COLORS.text,
    fontStyle: 'italic',
    flex: 1,
  },
  obsStatus: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  obsStatusText: {
    fontSize: FONT.xs,
    fontWeight: '600',
    color: '#ffffff',
  },
  obsDetails: {
    fontSize: FONT['sm+'],
    color: COLORS.textSecondary,
  },
})
