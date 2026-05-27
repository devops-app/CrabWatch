import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { FONT } from '../../utils/fonts'
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

const CATEGORIES = ['mission_reminders', 'streak_warnings', 'milestone_alerts', 'community_updates'] as const

const CHANNEL_LABEL_KEYS: Record<NotificationChannel, 'push' | 'email' | 'inApp'> = {
  PUSH: 'push',
  EMAIL: 'email',
  IN_APP: 'inApp',
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
  const { t } = useTranslation('notificationSettings')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [syncingPush, setSyncingPush] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPreference[]>([])
  const [permission, setPermission] = useState<PushPermissionState>('undetermined')

  const permissionInfo = useMemo(() => {
    if (permission === 'granted') {
      return {
        title: t('permission.status.granted.title'),
        description: t('permission.status.granted.description'),
        color: COLORS.success,
      }
    }

    if (permission === 'denied') {
      return {
        title: t('permission.status.denied.title'),
        description: t('permission.status.denied.description'),
        color: COLORS.error,
      }
    }

    return {
      title: t('permission.status.undetermined.title'),
      description: t('permission.status.undetermined.description'),
      color: COLORS.warning,
    }
  }, [permission, t])

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
      Alert.alert(t('alerts.savedTitle'), t('alerts.savedBody'))
    } catch (error) {
      Alert.alert(t('alerts.errorTitle'), error instanceof Error ? error.message : t('alerts.saveFailed'))
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
        Alert.alert(t('alerts.pushEnabledTitle'), t('alerts.pushEnabledBody'))
        return
      }

      if (result.reason) {
        Alert.alert(t('alerts.pushNotEnabledTitle'), result.reason)
      }
    } catch (error) {
      Alert.alert(t('alerts.errorTitle'), error instanceof Error ? error.message : t('alerts.enableFailed'))
    } finally {
      setSyncingPush(false)
    }
  }

  const handleDisablePush = async () => {
    setSyncingPush(true)
    try {
      await unregisterPushTokenFromServer()
      Alert.alert(t('alerts.unlinkedTitle'), t('alerts.unlinkedBody'))
    } catch (error) {
      Alert.alert(t('alerts.errorTitle'), error instanceof Error ? error.message : t('alerts.unlinkFailed'))
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
            <Text style={styles.cardTitle}>{t('permission.title')}</Text>
            <Text style={[styles.statusPill, { color: permissionInfo.color, borderColor: permissionInfo.color }]}> 
              {permissionInfo.title}
            </Text>
          </View>
          <Text style={styles.cardDescription}>{permissionInfo.description}</Text>

          <View style={styles.statusActions}>
            <Button
              title={t('actions.enablePush')}
              onPress={handleEnablePush}
              loading={syncingPush}
              style={styles.statusButton}
            />
            <Button
              title={t('actions.unlinkDevice')}
              variant="ghost"
              onPress={handleDisablePush}
              disabled={syncingPush}
              style={styles.statusButton}
            />
          </View>

          {permission === 'denied' ? (
            <TouchableOpacity onPress={() => Linking.openSettings()}>
              <Text style={styles.settingsLink}>{t('permission.openSettings')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.prefCard}>
          <Text style={styles.cardTitle}>{t('preferences.title')}</Text>
          <Text style={styles.cardDescription}>{t('preferences.description')}</Text>

          {CATEGORIES.map((category) => (
            <View key={category} style={styles.prefRow}>
              <Text style={styles.categoryLabel}>{t(`categories.${category}`)}</Text>
              <View style={styles.channelRow}>
                {CHANNELS.map((channel) => {
                  const enabled = getEnabled(channel, category)
                  return (
                    <TouchableOpacity
                      key={`${category}-${channel}`}
                      style={[styles.channelToggle, enabled ? styles.channelToggleOn : styles.channelToggleOff]}
                      onPress={() => togglePreference(channel, category)}
                    >
                      <Ionicons
                        name={enabled ? 'checkmark-circle' : 'ellipse-outline'}
                        size={14}
                        color={enabled ? '#ffffff' : COLORS.textSecondary}
                      />
                      <Text style={[styles.channelText, enabled && styles.channelTextOn]}>{t(`channels.${CHANNEL_LABEL_KEYS[channel]}`)}</Text>
                    </TouchableOpacity>
                  )
                })}
              </View>
            </View>
          ))}

          <Button
            title={loading ? t('actions.loading') : t('actions.savePreferences')}
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
    fontSize: FONT.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardDescription: {
    fontSize: FONT['sm+'],
    color: COLORS.textSecondary,
  },
  statusPill: {
    fontSize: FONT.sm,
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
    fontSize: FONT['sm+'],
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
    fontSize: FONT.base,
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
    fontSize: FONT.sm,
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
