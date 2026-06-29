import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { Image } from 'expo-image'
import * as Print from 'expo-print'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useTranslation } from 'react-i18next'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { COLORS, STATUS_COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import { useFormatters } from '../../hooks/useFormatters'
import { useAuthStore } from '../../store/authStore'
import { getCoinKey } from '@crabwatch/shared'
import { api } from '../../services/api'
import type { RootStackParamList } from '../../navigation/types'

type ObservationDetailRouteProp = RouteProp<RootStackParamList, 'ObservationDetail'>

export function ObservationDetailScreen() {
  const { t } = useTranslation('observation')
  const { formatDate, formatNumber, formatCoordinates, formatConditionFactor } = useFormatters()
  const route = useRoute<ObservationDetailRouteProp>()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const observation = route.params?.observation
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const user = useAuthStore(state => state.user)
  const isOwner = user?.id === observation?.userId
  const canEdit = isOwner && observation?.status !== 'approved'
  const canDelete = isOwner && (observation?.status === 'pending' || observation?.status === 'rejected')
  const canResubmit = isOwner && observation?.status === 'rejected'

  if (!observation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text>{t('notFound')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  const cf = observation.bw != null ? formatConditionFactor(observation.cw, observation.bw) : 'N/A'
  const statusColor = STATUS_COLORS[observation.status] || COLORS.textSecondary

  const formatLocalizedStatus = (status: string) => {
    if (status === 'approved' || status === 'pending' || status === 'rejected') {
      return t(status)
    }
    return status
  }

  const formatLocalizedGender = (gender: string) => {
    const key = gender.toLowerCase()
    if (key === 'male' || key === 'female' || key === 'unknown') {
      return t(`genderValue.${key}`)
    }
    return gender
  }

  const formatLocalizedMaturation = (status: string) => {
    const key = status.toLowerCase()
    if (key === 'mature' || key === 'immature' || key === 'unknown') {
      return t(`maturationValue.${key}`)
    }
    return status
  }

  const handlePrint = async () => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: #1a1a1a; }
          h1 { font-size: 22px; margin: 0 0 4px; color: #1e3a5f; }
          .sci { font-size: 14px; color: #6b7280; font-style: italic; margin-bottom: 8px; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-bottom: 16px; }
          .status-${observation.status} { background: ${observation.status === 'approved' ? '#dcfce7' : observation.status === 'rejected' ? '#fee2e2' : '#fef9c3'}; color: ${observation.status === 'approved' ? '#166534' : observation.status === 'rejected' ? '#991b1b' : '#854d0e'}; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
          td:first-child { color: #6b7280; width: 40%; }
          td:last-child { font-weight: 500; }
          .section-title { font-size: 16px; font-weight: 600; margin: 16px 0 8px; color: #1e3a5f; }
          .photos { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
          .photos img { width: 150px; height: 150px; object-fit: cover; border-radius: 8px; border: 1px solid #e5e7eb; }
          .notes { background: #f9fafb; padding: 12px; border-radius: 8px; font-size: 14px; line-height: 1.5; }
          .footer { margin-top: 24px; font-size: 11px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
        </style>
      </head>
      <body>
        <h1>${observation.species.commonName}</h1>
        <div class="sci">${observation.species.scientificName}</div>
        <div class="status status-${observation.status}">${formatLocalizedStatus(observation.status)}</div>

        <div class="section-title">${t('measurements')}</div>
        <table>
          <tr><td>${t('carapaceWidth')}</td><td>${formatNumber(observation.cw, 2)} cm</td></tr>
          <tr><td>${t('bodyWeight')}</td><td>${formatNumber(observation.bw, 1)} g</td></tr>
          <tr><td>${t('conditionFactor')}</td><td>${cf}</td></tr>
        </table>

        <div class="section-title">${t('biologicalData')}</div>
        <table>
          <tr><td>${t('gender')}</td><td>${formatLocalizedGender(observation.gender)}</td></tr>
          <tr><td>${t('maturation')}</td><td>${formatLocalizedMaturation(observation.maturationStatus)}</td></tr>
          ${observation.detectedCoin ? `<tr><td>${t('referenceCoin')}</td><td>${t(`capture:coins.${getCoinKey(observation.detectedCoin)}`) || observation.detectedCoin}</td></tr>` : ''}
        </table>

        <div class="section-title">${t('location')}</div>
        <table>
          <tr><td>${t('coordinates')}</td><td>${formatCoordinates(observation.lat, observation.lng)}</td></tr>
          <tr><td>${t('method')}</td><td>${observation.locationMethod === 'gps' ? t('gps') : t('manual')}</td></tr>
        </table>

        ${observation.photos.length > 0 ? `
          <div class="section-title">${t('photos')}</div>
          <div class="photos">
            ${observation.photos.map((url: string) => `<img src="${url}" alt="${t('photos')}">`).join('')}
          </div>
        ` : ''}

        ${observation.notes ? `<div class="section-title">${t('notes')}</div><div class="notes">${observation.notes}</div>` : ''}

        <div class="footer">
          ${t('submitted')}: ${formatDate(observation.createdAt)} | ${t('submittedBy')}: ${observation.user.name}
          ${observation.validatedAt ? ` | ${t('validated')}: ${formatDate(observation.validatedAt)}` : ''}
          <br>Generated by CrabWatch
        </div>
      </body>
      </html>
    `

    try {
      if (Platform.OS === 'ios') {
        await Print.printAsync({ html })
      } else {
        await Print.printToFileAsync({ html })
        Alert.alert(t('printSaved'), t('printSavedBody'))
      }
    } catch (error) {
      Alert.alert(t('printFailed'), t('printFailedBody'))
    }
  }

  const handleDelete = () => {
    Alert.alert(
      t('confirmDeleteTitle'),
      t('confirmDelete'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            setProcessing(true)
            try {
              await api.deleteObservation(observation.id)
              Alert.alert(t('deleteSuccess'))
              navigation.goBack()
            } catch {
              Alert.alert(t('deleteFailed'))
            } finally {
              setProcessing(false)
            }
          },
        },
      ]
    )
  }

  const handleResubmit = () => {
    Alert.alert(
      t('confirmResubmitTitle'),
      t('confirmResubmit'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('resubmit'),
          onPress: async () => {
            setProcessing(true)
            try {
              await api.updateObservation(observation.id, { status: 'PENDING' })
              Alert.alert(t('resubmitSuccess'))
              navigation.goBack()
            } catch {
              Alert.alert(t('resubmitFailed'))
            } finally {
              setProcessing(false)
            }
          },
        },
      ]
    )
  }

  const handleEdit = () => {
    navigation.navigate('EditObservation', { observationId: observation.id })
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.speciesName}>{observation.species.scientificName}</Text>
        <Text style={styles.commonName}>{observation.species.commonName}</Text>

        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.statusText}>{formatLocalizedStatus(observation.status)}</Text>
        </View>

       <Card padding={16}>
          <Text style={styles.cardTitle}>{t('measurements')}</Text>
          <DetailRow label={t('carapaceWidth')} value={`${formatNumber(observation.cw, 2)} cm`} />
          <DetailRow label={t('bodyWeight')} value={`${formatNumber(observation.bw, 1)} g`} />
          <DetailRow label={t('conditionFactor')} value={cf} />
        </Card>

       <Card padding={16}>
          <Text style={styles.cardTitle}>{t('biologicalData')}</Text>
          <DetailRow label={t('gender')} value={formatLocalizedGender(observation.gender)} />
          <DetailRow label={t('maturation')} value={formatLocalizedMaturation(observation.maturationStatus)} />
        </Card>

      {observation.detectedCoin && (
          <Card padding={16}>
            <Text style={styles.cardTitle}>{t('referenceCoin')}</Text>
            <DetailRow label={t('coin')} value={t(`capture:coins.${getCoinKey(observation.detectedCoin)}`) || observation.detectedCoin} />
          </Card>
        )}

      <Card padding={16}>
          <Text style={styles.cardTitle}>{t('location')}</Text>
          <DetailRow label={t('coordinates')} value={formatCoordinates(observation.lat, observation.lng)} />
          <DetailRow label={t('method')} value={observation.locationMethod === 'gps' ? t('gps') : t('manual')} />
        </Card>

      {observation.photos.length > 0 && (
          <Card padding={16}>
            <Text style={styles.cardTitle}>{t('photos')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {observation.photos.map((url: string, i: number) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setFullscreenPhoto(url)}
                  activeOpacity={0.7}
                >
                  <Image source={{ uri: url }} style={styles.photo} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Card>
        )}

      {observation.notes && (
          <Card padding={16}>
            <Text style={styles.cardTitle}>{t('notes')}</Text>
            <Text style={styles.notesText}>{observation.notes}</Text>
          </Card>
        )}

     <Card padding={16}>
          <Text style={styles.cardTitle}>{t('submissionInfo')}</Text>
          <DetailRow label={t('submitted')} value={formatDate(observation.createdAt)} />
          <DetailRow label={t('submittedBy')} value={observation.user.name} />
          {observation.validatedAt && (
            <DetailRow label={t('validated')} value={formatDate(observation.validatedAt)} />
          )}
          {observation.rejectionReason && (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionLabel}>{t('rejectionReason')}</Text>
              <Text style={styles.rejectionText}>{observation.rejectionReason}</Text>
            </View>
          )}
        </Card>

      <View style={styles.actionRow}>
          <Button
            title={t('back')}
            variant="secondary"
            onPress={() => navigation.goBack()}
            style={styles.actionBtn}
            disabled={processing}
          />
          <Button
            title={t('print')}
            variant="secondary"
            onPress={handlePrint}
            style={styles.actionBtn}
            disabled={processing}
          />
        </View>
        {(canEdit || canDelete || canResubmit) && (
          <View style={styles.actionRow}>
            {canEdit && (
              <Button
                title={t('edit')}
                variant="primary"
                onPress={handleEdit}
                style={styles.actionBtn}
                disabled={processing}
              />
            )}
            {canResubmit && (
              <Button
                title={t('resubmit')}
                variant="primary"
                onPress={handleResubmit}
                style={styles.actionBtn}
                disabled={processing}
              />
            )}
            {canDelete && (
              <Button
                title={t('delete')}
                variant="danger"
                onPress={handleDelete}
                style={styles.actionBtn}
                disabled={processing}
              />
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={fullscreenPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenPhoto(null)}
      >
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setFullscreenPhoto(null)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Image
            source={{ uri: fullscreenPhoto! }}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </SafeAreaView>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
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
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speciesName: {
    fontSize: FONT['2xl'],
    fontWeight: '700',
    color: COLORS.text,
    fontStyle: 'italic',
  },
  commonName: {
    fontSize: FONT.lg,
    color: COLORS.textSecondary,
    marginTop: 2,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: FONT.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardTitle: {
    fontSize: FONT.base,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowLabel: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
  },
  rowValue: {
    fontSize: FONT.base,
    color: COLORS.text,
    fontWeight: '500',
  },
  photoScroll: {
    marginTop: 4,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: COLORS.border,
  },
  notesText: {
    fontSize: FONT.base,
    color: COLORS.text,
    lineHeight: 20,
  },
  rejectionBox: {
    backgroundColor: COLORS.errorLight,
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  rejectionLabel: {
    fontSize: FONT['sm+'],
    fontWeight: '600',
    color: COLORS.error,
  },
  rejectionText: {
    fontSize: FONT['sm+'],
    color: COLORS.error,
    marginTop: 2,
  },
  backBtn: {
    marginTop: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
  fullscreenClose: {
    position: 'absolute',
    top: 48,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
