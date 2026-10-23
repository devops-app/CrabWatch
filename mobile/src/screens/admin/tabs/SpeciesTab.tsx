import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useIsFocused, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { api } from '../../../services/api'
import { Button } from '../../../components/common/Button'
import type { RootStackParamList } from '../../../navigation/types'
import type { SpeciesResponse } from '@crabwatch/shared'
import { styles } from './styles'

interface SpeciesTabProps {
  flash: (msg: string, type: 'error' | 'success') => void
}

export function SpeciesTab({ flash }: SpeciesTabProps) {
  const { t } = useTranslation('admin')
  const navigation = useNavigation()
  const isFocused = useIsFocused()

  const [species, setSpecies] = useState<SpeciesResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const data = await api.listSpecies()
      setSpecies(data)
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

  const handleDeleteSpecies = (s: SpeciesResponse) => {
    Alert.alert(
      t('alerts.deleteSpecies.title'),
      t('alerts.deleteSpecies.message', { name: s.commonName }),
      [
        { text: t('cancel', { ns: 'common' }), style: 'cancel' },
        {
          text: t('alerts.deleteSpecies.confirm'),
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.deleteSpecies(s.id)
              flash(t('flash.speciesDeleted'), 'success')
              loadData()
            } catch (err) {
              flash(err instanceof Error ? err.message : t('flash.speciesDeleteFailed'), 'error')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleAddSpecies = () => {
    const stackNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()
    stackNav?.navigate({ name: 'SpeciesForm', params: {} })
  }

  const handleEditSpecies = (s: SpeciesResponse) => {
    const stackNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()
    stackNav?.navigate({ name: 'SpeciesForm', params: { speciesId: s.id } })
  }

  const renderSpecies = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.toolbar}>
        <Button
          title={t('species.addTitle')}
          onPress={handleAddSpecies}
        />
      </View>

      <FlatList
        data={species}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.speciesName}>{item.commonName}</Text>
                <Text style={styles.speciesScientific}>{item.scientificName}</Text>
              </View>
              <View style={styles.inlineActions}>
                <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => handleEditSpecies(item)}>
                  <Text style={styles.actionBtnText}>{t('edit', { ns: 'common' })}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => handleDeleteSpecies(item)}
                >
                  <Text style={styles.actionBtnText}>{t('delete', { ns: 'common' })}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {item.description && (
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
            )}
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

  return renderSpecies()
}
