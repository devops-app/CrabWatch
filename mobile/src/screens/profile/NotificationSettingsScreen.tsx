import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Button } from '../../components/common/Button'
import { COLORS } from '../../utils/constants'
import { api } from '../../services/api'
import {
  getPushPermissionStatus,
  syncPushTokenWithServer,
  unregisterPushTokenFromServer,
  type PushPermissionState,
} from '../../services/pushNotificationService'

type NotificationChannel = 'PUSH' | 'EMAIL' | 'IN_APP'

type NotificationPreference = {
  channel: NotificationChannel
  category: string
  enabled: boolean
}

const CHANNELS: NotificationChannel[] = ['PUSH', 'EMAIL', 'IN_APP']

const CATEGORIES = [
  { key: 'mission_reminders', label: 'Mission Reminders' },
  { key: 'streak_warnings', label: 'Streak Warnings' },
  { key: 'milestone_alerts', label: 'Milestone Alerts' },
  { key: 'community_updates', label: 'Community Updates' },
] as const

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  PUSH: 'Push',
  EMAIL: 'Email',
  IN_APP: 'In-App',
}

const PERMISSION_COPY: Record<PushPermissionState, { title: string; description: string; color: string }> = {
  granted: {
    title: 'Enabled',
    description: 'This device can receive push notifications.',
    color: COLORS.success,
  },
  denied: {
    title: 'Blocked',
    description: 'Push notifications are blocked in system settings.',
    color: COLORS.error,
  },
  undetermined: {
    title: 'Not Set',
    description: 'Permission has not been requested on this device yet.',
    color: COLORS.warning,
  },
}

function normalizePreferences(data: unknown): NotificationPreference[] {
  if (!Array.isArray(data)) {
    return []
  }

  return data
    .map((item) => {
      const record = item as { channel?: unknown; category?: unknown; enabled?: unknown }
      if (
        typeof record.channel !== 'string' ||
        typeof record.category !== 'string' ||
        typeof record.enabled !== 'boolean'
      ) {
        return null
      }

      if (!CHANNELS.includes(record.channel as NotificationChannel)) {
        return null
      }

      return {
        channel: record.channel as NotificationChannel,
        category: record.category,
        enabled: record.enabled,
      }
    })
    .filter(Boolean) as NotificationPreference[]
}

export function NotificationSettingsScreen() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncingPush, setSyncingPush] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPreference[]>([])
  const [permission, setPermission] = useState<PushPermissionState>('undetermined')

  const permissionInfo = useMemo(() => PERMISSION_COPY[permission], [permission])

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const [prefData, permissionStatus] = await Promise.all([
        api.getNotificationPreferences().catch(() => []),
        getPushPermissionStatus().catch(() => 'undetermined' as const),
      ])
      setPrefs(normalizePreferences(prefData))
      setPermission(permissionStatus)
    } finally {
      if (isRefresh) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    loadData(false)
  }, [loadData])

  const getEnabled = useCallback((channel: NotificationChannel, category: string) => {
    const pref = prefs.find((p) => p.channel === channel && p.category === category)
    return pref?.enabled ?? false
  }, [prefs])

  const togglePreference = (channel: NotificationChannel, category: string) => {
    setPrefs((prev) => {
      const existing = prev.find((p) => p.channel === channel && p.category === category)
      if (!existing) {
        return [...prev, { channel, category, enabled: true }]
      }

      return prev.map((p) =>
        p.channel === channel && p.category === category
          ? { ...p, enabled: !p.enabled }
          : p
      )
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.updateNotificationPreferences({ updates: prefs })
      Alert.alert('Saved', 'Notification preferences updated successfully.')
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save preferences.')
    } finally {
      setSaving(false)
    }
  }

  const handleEnablePush = async () => {
    setSyncingPush(true)
    try {
      const result = await syncPushTokenWithServer({ requestPermission: true })
      setPermission(result.permission)

      if (result.registered) {
        Alert.alert('Push Enabled', 'Push notifications are enabled for this device.')
        return
      }

      if (result.reason) {
        Alert.alert('Push Not Enabled', result.reason)
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to enable push notifications.')
    } finally {
      setSyncingPush(false)
    }
  }

  const handleDisablePush = async () => {
    setSyncingPush(true)
    try {
      await unregisterPushTokenFromServer()
      Alert.alert('Device Unlinked', 'This device is no longer registered for push notifications.')
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to unlink this device.')
    } finally {
      setSyncingPush(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} />}
      >
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.cardTitle}>Push Permission</Text>
            <Text style={[styles.statusPill, { color: permissionInfo.color, borderColor: permissionInfo.color }]}> 
              {permissionInfo.title}
            </Text>
          </View>
          <Text style={styles.cardDescription}>{permissionInfo.description}</Text>

          <View style={styles.statusActions}>
            <Button
              title="Enable Push"
              onPress={handleEnablePush}
              loading={syncingPush}
              style={styles.statusButton}
            />
            <Button
              title="Unlink Device"
              variant="ghost"
              onPress={handleDisablePush}
              disabled={syncingPush}
              style={styles.statusButton}
            />
          </View>

          {permission === 'denied' ? (
            <TouchableOpacity onPress={() => Linking.openSettings()}>
              <Text style={styles.settingsLink}>Open system settings</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.prefCard}>
          <Text style={styles.cardTitle}>Notification Preferences</Text>
          <Text style={styles.cardDescription}>Choose which notifications you receive by channel.</Text>

          {CATEGORIES.map((category) => (
            <View key={category.key} style={styles.prefRow}>
              <Text style={styles.categoryLabel}>{category.label}</Text>
              <View style={styles.channelRow}>
                {CHANNELS.map((channel) => {
                  const enabled = getEnabled(channel, category.key)
                  return (
                    <TouchableOpacity
                      key={`${category.key}-${channel}`}
                      style={[styles.channelToggle, enabled ? styles.channelToggleOn : styles.channelToggleOff]}
                      onPress={() => togglePreference(channel, category.key)}
                    >
                      <Ionicons
                        name={enabled ? 'checkmark-circle' : 'ellipse-outline'}
                        size={14}
                        color={enabled ? '#ffffff' : COLORS.textSecondary}
                      />
                      <Text style={[styles.channelText, enabled && styles.channelTextOn]}>{CHANNEL_LABELS[channel]}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          ))}

          <Button
            title={loading ? 'Loading...' : 'Save Preferences'}
            onPress={handleSave}
            loading={saving}
            disabled={loading || syncingPush}
            style={styles.saveButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  statusCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 10,
  },
  prefCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  statusPill: {
    fontSize: 12,
    fontWeight: '700',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    minWidth: 0,
  },
  settingsLink: {
    marginTop: 2,
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  prefRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    gap: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  channelRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  channelToggle: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  channelToggleOn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  channelToggleOff: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  channelText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  channelTextOn: {
    color: '#ffffff',
  },
  saveButton: {
    marginTop: 4,
  },
})
