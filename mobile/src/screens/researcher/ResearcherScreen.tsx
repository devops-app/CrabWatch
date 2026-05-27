import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  Image,
  RefreshControl,
  TextInput as RNTextInput,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useFormatters } from '../../hooks/useFormatters'
import { api } from '../../services/api'
import { Button } from '../../components/common/Button'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import type { ObservationResponse } from '@crabwatch/shared'

export function ResearcherScreen() {
  const { t } = useTranslation('researcher')
  const { formatDateTime, formatNumber, formatCoordinates } = useFormatters()
  const [observations, setObservations] = useState<ObservationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedObs, setSelectedObs] = useState<ObservationResponse | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const loadPending = useCallback(async () => {
    try {
      const data = await api.getPendingObservations()
      setObservations(data.observations)
    } catch (err) {
      console.error('Failed to load pending observations:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadPending()
  }, [loadPending])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadPending()
  }, [loadPending])

  const handleApprove = (obs: ObservationResponse) => {
    Alert.alert(
      t('approveTitle'),
      t('approveBody', { name: obs.user.name }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('validate'),
          onPress: () => validateObservation(obs, 'approved'),
        },
      ]
    )
  }

  const handleRejectConfirm = (obs: ObservationResponse) => {
    Alert.alert(
      t('rejectTitle'),
      t('rejectBody', { name: obs.user.name }),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('reject'),
          style: 'destructive',
          onPress: () => validateObservation(obs, 'rejected'),
        },
      ]
    )
  }

  const validateObservation = async (obs: ObservationResponse, status: 'approved' | 'rejected') => {
    setActionLoading(true)
    try {
      await api.validateObservation(obs.id, {
        status,
        rejectionReason: status === 'rejected' ? rejectionReason || undefined : undefined,
      })
      setSelectedObs(null)
      setRejectionReason('')
      Alert.alert(t('success'), status === 'approved' ? t('approvedSuccess') : t('rejectedSuccess'))
      loadPending()
    } catch (err) {
      Alert.alert(
        t('error'),
        err instanceof Error ? err.message : t('failedAction', { action: status })
      )
    } finally {
      setActionLoading(false)
    }
  }


  const renderItem = ({ item }: { item: ObservationResponse }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        setSelectedObs(item)
        setRejectionReason('')
      }}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.speciesName}>{item.species.commonName}</Text>
          <Text style={styles.speciesScientific}>{item.species.scientificName}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{t('pending').toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.cardRow}>
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>{t('submitter')}</Text>
          <Text style={styles.infoValue}>{item.user.name}</Text>
        </View>
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>{t('cw')}</Text>
          <Text style={styles.infoValue}>{formatNumber(item.cw, 1)} mm</Text>
        </View>
        <View style={styles.infoBlock}>
          <Text style={styles.infoLabel}>{t('gender')}</Text>
          <Text style={styles.infoValue}>{item.gender}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>{formatDateTime(item.createdAt)}</Text>
        <Text style={styles.photoCount}>{t('photoCount', { count: item.photos.length })}</Text>
      </View>
    </TouchableOpacity>
  )

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <View style={styles.container}>
      {observations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.emptyTitle}>{t('allCaughtUp')}</Text>
          <Text style={styles.emptyText}>{t('allCaughtUpHint')}</Text>
        </View>
      ) : (
        <FlatList
          data={observations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      <Modal
        visible={!!selectedObs}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedObs(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedObs && (
              <ScrollView style={styles.modalScroll}>
                <Text style={styles.modalTitle}>{t('reviewTitle')}</Text>

                <View style={styles.photoSection}>
                  <Text style={styles.sectionLabel}>{t('photos')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator>
                    {selectedObs.photos.map((photo, idx) => (
                      <Image
                        key={idx}
                        source={{ uri: photo }}
                        style={styles.photo}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>
                </View>

       <View style={styles.detailSection}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('species')}</Text>
            <Text style={styles.detailValue}>{selectedObs.species.commonName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('scientificName')}</Text>
            <Text style={styles.detailValue}>{selectedObs.species.scientificName}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('submitter')}</Text>
            <Text style={styles.detailValue}>{selectedObs.user.name}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('carapaceWidth')}</Text>
            <Text style={styles.detailValue}>{formatNumber(selectedObs.cw, 1)} mm</Text>
          </View>
          {selectedObs.bw != null && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('bodyWeight')}</Text>
              <Text style={styles.detailValue}>{formatNumber(selectedObs.bw, 1)} g</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('gender')}</Text>
            <Text style={styles.detailValue}>{selectedObs.gender}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('maturation')}</Text>
            <Text style={styles.detailValue}>{selectedObs.maturationStatus}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('location')}</Text>
            <Text style={styles.detailValue}>
              {formatCoordinates(selectedObs.lat, selectedObs.lng)}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('locationMethod')}</Text>
            <Text style={styles.detailValue}>{selectedObs.locationMethod}</Text>
          </View>
          {selectedObs.detectedCoin && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('coinReference')}</Text>
              <Text style={styles.detailValue}>{selectedObs.detectedCoin}</Text>
            </View>
          )}
          {selectedObs.notes && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('notes')}</Text>
              <Text style={styles.detailValue}>{selectedObs.notes}</Text>
            </View>
          )}
        </View>

      <View style={styles.rejectSection}>
                <Text style={styles.sectionLabel}>{t('rejectionReason')}</Text>
                <RNTextInput
                  style={styles.rejectInput}
                  placeholder={t('rejectionPlaceholder')}
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

       <View style={styles.modalActions}>
              <Button
                title={t('validate')}
                onPress={() => handleApprove(selectedObs)}
                loading={actionLoading}
                style={styles.approveBtn}
              />
              <Button
                title={t('reject')}
                onPress={() => handleRejectConfirm(selectedObs)}
                loading={actionLoading}
                variant="danger"
                style={styles.rejectBtn}
              />
            </View>

            <TouchableOpacity
              onPress={() => setSelectedObs(null)}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>{t('close')}</Text>
            </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  speciesName: {
    fontSize: FONT.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  speciesScientific: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  statusBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: FONT['2xs'],
    fontWeight: '700',
    color: '#92400e',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  infoBlock: {
    flex: 1,
  },
  infoLabel: {
    fontSize: FONT['2xs'],
    color: COLORS.textLight,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: FONT['sm+'],
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  dateText: {
    fontSize: FONT.xs,
    color: COLORS.textSecondary,
  },
  photoCount: {
    fontSize: FONT.xs,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: FONT['7xl'],
    color: COLORS.primary,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: FONT.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalScroll: {
    padding: 20,
  },
  modalTitle: {
    fontSize: FONT.xl,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  photoSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: FONT['sm+'],
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: FONT['sm+'],
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: FONT['sm+'],
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  rejectSection: {
    marginBottom: 16,
  },
  rejectInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: FONT.base,
    color: COLORS.text,
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  approveBtn: {
    flex: 1,
  },
  rejectBtn: {
    flex: 1,
  },
  closeBtn: {
    alignItems: 'center',
    padding: 12,
  },
  closeBtnText: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
  },
})
