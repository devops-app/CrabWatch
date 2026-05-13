import React, { useState } from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Card } from '../../components/common/Card'
import { Button } from '../../components/common/Button'
import { COLORS, STATUS_COLORS } from '../../utils/constants'
import {
  formatDate,
  formatCoordinates,
  formatGender,
  formatMaturationStatus,
  formatStatus,
  formatNumber,
  formatConditionFactor,
} from '../../utils/formatters'
import type { RootStackParamList } from '../../navigation/types'

type ObservationDetailRouteProp = RouteProp<RootStackParamList, 'ObservationDetail'>

export function ObservationDetailScreen() {
  const route = useRoute<ObservationDetailRouteProp>()
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const observation = route.params?.observation
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null)

  if (!observation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text>Observation not found</Text>
        </View>
      </SafeAreaView>
    )
  }

  const cf = observation.bw != null ? formatConditionFactor(observation.cw, observation.bw) : 'N/A'
  const statusColor = STATUS_COLORS[observation.status] || COLORS.textSecondary

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.speciesName}>{observation.species.scientificName}</Text>
        <Text style={styles.commonName}>{observation.species.commonName}</Text>

        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.statusText}>{formatStatus(observation.status)}</Text>
        </View>

        <Card padding={16}>
          <Text style={styles.cardTitle}>Measurements</Text>
          <DetailRow label="Carapace Width" value={`${formatNumber(observation.cw, 2)} cm`} />
          <DetailRow label="Body Weight" value={`${formatNumber(observation.bw, 1)} g`} />
          <DetailRow label="Condition Factor" value={cf} />
        </Card>

        <Card padding={16}>
          <Text style={styles.cardTitle}>Biological Data</Text>
          <DetailRow label="Gender" value={formatGender(observation.gender)} />
          <DetailRow label="Maturation" value={formatMaturationStatus(observation.maturationStatus)} />
        </Card>

        {observation.detectedCoin && (
          <Card padding={16}>
            <Text style={styles.cardTitle}>Reference Coin</Text>
            <DetailRow label="Coin" value={observation.detectedCoin} />
          </Card>
        )}

        <Card padding={16}>
          <Text style={styles.cardTitle}>Location</Text>
          <DetailRow label="Coordinates" value={formatCoordinates(observation.lat, observation.lng)} />
          <DetailRow label="Method" value={observation.locationMethod === 'gps' ? 'GPS' : 'Manual'} />
        </Card>

        {observation.photos.length > 0 && (
          <Card padding={16}>
            <Text style={styles.cardTitle}>Photos</Text>
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
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.notesText}>{observation.notes}</Text>
          </Card>
        )}

        <Card padding={16}>
          <Text style={styles.cardTitle}>Submission Info</Text>
          <DetailRow label="Submitted" value={formatDate(observation.createdAt)} />
          <DetailRow label="Submitted By" value={observation.user.name} />
          {observation.validatedAt && (
            <DetailRow label="Validated" value={formatDate(observation.validatedAt)} />
          )}
          {observation.rejectionReason && (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
              <Text style={styles.rejectionText}>{observation.rejectionReason}</Text>
            </View>
          )}
        </Card>

        <Button
          title="Back"
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        />
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
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    fontStyle: 'italic',
  },
  commonName: {
    fontSize: 16,
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
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardTitle: {
    fontSize: 15,
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
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  rowValue: {
    fontSize: 14,
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
    fontSize: 14,
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
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.error,
  },
  rejectionText: {
    fontSize: 13,
    color: COLORS.error,
    marginTop: 2,
  },
  backBtn: {
    marginTop: 8,
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
