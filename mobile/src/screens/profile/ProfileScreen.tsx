import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../services/api'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { COLORS, STATUS_COLORS } from '../../utils/constants'
import { formatDate, formatStatus } from '../../utils/formatters'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { ObservationResponse } from '@crabwatch/shared'
import type { RootStackParamList } from '../../navigation/types'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { user, logout } = useAuth()
  const [observations, setObservations] = useState<ObservationResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadObservations()
  }, [])

  const loadObservations = async () => {
    try {
      const data = await api.listObservations({ limit: 20 })
      setObservations(data.observations || [])
    } catch {
      setObservations([])
    } finally {
      setLoading(false)
    }
  }

  const approvedCount = observations.filter((o) => o.status === 'approved').length

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ])
  }

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

        <View style={styles.actionsRow}>
          <Button
            title="Edit Profile"
            variant="secondary"
            onPress={() => navigation.navigate('EditProfile')}
            style={styles.actionBtn}
          />
          <Button
            title="About"
            variant="secondary"
            onPress={() => navigation.navigate('About')}
            style={styles.actionBtn}
          />
          <Button
            title="Sign Out"
            variant="danger"
            onPress={handleLogout}
            style={styles.actionBtn}
          />
        </View>

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
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
  },
  email: {
    fontSize: 14,
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
    fontSize: 13,
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
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
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
    fontSize: 15,
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
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
  },
  obsDetails: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
})
