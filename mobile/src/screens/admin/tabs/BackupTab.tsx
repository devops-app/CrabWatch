import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, Alert, RefreshControl } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useIsFocused } from '@react-navigation/native'
import { api } from '../../../services/api'
import { Button } from '../../../components/common/Button'
import { useFormatters } from '../../../hooks/useFormatters'
import { styles } from './styles'

interface BackupTabProps {
  flash: (msg: string, type: 'error' | 'success') => void
}

export function BackupTab({ flash }: BackupTabProps) {
  const { t } = useTranslation('admin')
  const { formatDate, formatFileSize } = useFormatters()
  const isFocused = useIsFocused()

  const [backups, setBackups] = useState<{ fileName: string; size: number; timestamp: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const data = await api.listBackups()
      setBackups(data)
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to load data', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [flash])

  useEffect(() => {
    setLoading(true)
    loadData()
  }, [loadData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
  }, [loadData])

  useEffect(() => {
    if (isFocused) {
      loadData()
    }
  }, [isFocused, loadData])

  const handleBackup = () => {
    Alert.alert(
      t('alerts.backup.title'),
      t('alerts.backup.message'),
      [
        { text: t('cancel', { ns: 'common' }), style: 'cancel' },
        {
          text: t('alerts.backup.confirm'),
          onPress: async () => {
            setActionLoading(true)
            try {
              const result = await api.backupDatabase()
              flash(t('flash.backupCreated', { file: result.fileName }), 'success')
              loadData()
            } catch (err) {
              flash(err instanceof Error ? err.message : t('flash.backupFailed'), 'error')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleExportCsv = () => {
    Alert.alert(
      t('backup.exportCsv'),
      t('backup.selectTable'),
      [
        { text: t('cancel', { ns: 'common' }), style: 'cancel' },
        {
          text: t('backup.observations'),
          onPress: () => runExportCsv('observations'),
        },
        {
          text: t('backup.species'),
          onPress: () => runExportCsv('species'),
        },
        {
          text: t('backup.users'),
          onPress: () => runExportCsv('users'),
        },
      ]
    )
  }

  const runExportCsv = async (table: 'observations' | 'species' | 'users') => {
    setActionLoading(true)
    try {
      await api.exportCsv(table)
      flash(t('backup.exportSuccess'), 'success')
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : t('backup.exportFailed'), 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const renderBackup = () => (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={{ flexDirection: 'row', gap: 8, flex: 1 }}>
          <Button
            title={t('backup.create')}
            onPress={handleBackup}
            loading={actionLoading}
            style={{ flex: 1 }}
          />
          <Button
            title={t('backup.exportCsv')}
            onPress={handleExportCsv}
            loading={actionLoading}
            variant="secondary"
            style={{ flex: 1 }}
          />
        </View>
      </View>
      <FlatList
        data={backups}
        keyExtractor={(item) => item.fileName}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.fileName}>{item.fileName}</Text>
                <Text style={styles.fileMeta}>
                  {formatFileSize(item.size)} • {formatDate(item.timestamp)}
                </Text>
              </View>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  )

  if (loading) {
    return null
  }

  return renderBackup()
}
