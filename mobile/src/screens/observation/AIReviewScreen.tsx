import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Modal,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFocusEffect } from '@react-navigation/native'
import {
  observationSchema,
  type ObservationFormValues,
} from '../../utils/validators'
import { useObservation } from '../../hooks/useObservation'
import { useSpeciesStore } from '../../store/speciesStore'
import { api } from '../../services/api'
import {
  GENDER_OPTIONS,
  MATURATION_OPTIONS,
  COLORS,
  CW_MAX,
  BW_MAX,
} from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import { Input } from '../../components/common/Input'
import { PickerWithAlert } from '../../components/common/Picker'
import { Button } from '../../components/common/Button'
import { GPSCapture } from '../../components/observation/GPSCapture'
import { CrabAnalysisResult, PhotoView } from '@crabwatch/shared'

interface AIReviewRouteParams {
  analysis: CrabAnalysisResult
  photos: string[]
  views: PhotoView[]
  sessionId: string
  coinType?: string
  blobUrls?: string[]
  isManualFallback?: boolean
}

interface FormValues extends ObservationFormValues {}

function extractCoinDenomination(value: string | null | undefined): string {
  if (!value) return ''
  const normalized = value.toLowerCase()
  if (normalized.includes('50 sen')) return '50 sen'
  if (normalized.includes('20 sen')) return '20 sen'
  if (normalized.includes('10 sen')) return '10 sen'
  if (normalized.includes('5 sen')) return '5 sen'
  return normalized.trim()
}

function AIBadge({ label }: { label: string }) {
  return (
    <View style={styles.aiBadge}>
      <Ionicons name="sparkles" size={10} color={COLORS.accent} />
      <Text style={styles.aiBadgeText}>{label}</Text>
    </View>
  )
}

export function AIReviewScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { analysis, photos, sessionId, coinType, blobUrls, isManualFallback } = route.params as AIReviewRouteParams
  const displayPhotos = blobUrls || photos

  const { submitObservation, submitting, error: submitError } = useObservation()
  const { species, loadSpecies, getSpeciesById } = useSpeciesStore()

  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [manualLocation, setManualLocation] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null)

  const findMatchingSpecies = (): string => {
    if (!analysis.speciesId || analysis.speciesId === 'unknown') return ''
    const found = species.find(
      (s) => s.id === analysis.speciesId || s.scientificName.toLowerCase().includes(analysis.speciesId.replace('-', ' '))
    )
    return found?.id || ''
  }

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(observationSchema),
    defaultValues: {
      speciesId: '',
      cw: analysis.estimatedCW || 0,
      bw: undefined,
      gender: analysis.gender || 'unknown',
      maturationStatus: analysis.maturationStatus || 'unknown',
      lat: 0,
      lng: 0,
      locationMethod: 'gps',
      photos: photos,
      notes: '',
    },
  })

  useFocusEffect(
    React.useCallback(() => {
      loadSpecies()
    }, [loadSpecies])
  )

  React.useEffect(() => {
    if (species.length > 0 && analysis.speciesId) {
      const matchId = findMatchingSpecies()
      if (matchId) {
        reset((prev) => ({ ...prev, speciesId: matchId }))
      }
    }
  }, [species, analysis.speciesId, reset])

  const handleLocationCapture = (lat: number, lng: number) => {
    setLatitude(lat)
    setLongitude(lng)
  }

  const handlePhotoPress = (uri: string) => {
    setFullscreenPhoto(uri)
    setShowFullscreen(true)
  }

  const onSubmit = async (data: FormValues) => {
    if (latitude == null || longitude == null) {
      Alert.alert('Location Required', 'Please capture your GPS location.')
      return
    }

    const payload = {
      ...data,
      bw: data.bw ?? null,
      lat: latitude,
      lng: longitude,
      locationMethod: (manualLocation ? 'manual' : 'gps') as 'manual' | 'gps',
      photos: blobUrls || photos,
      uploadSessionId: sessionId,
      detectedCoin: coinType || analysis.detectedCoin || null,
    }

    let previousLevel: number | null = null
    let previousXP: number | null = null

    try {
      const stats = await api.getMyStats()
      previousLevel = stats.stats.level
      previousXP = stats.stats.totalXP
    } catch { /* non-blocking */ }

    const result = await submitObservation(payload)

    if (result) {
      try {
        const newStats = await api.getMyStats()
        if (previousLevel !== null && newStats.stats.level > previousLevel) {
          Alert.alert(
            'Level Up!',
            `You're now level ${newStats.stats.level} (${newStats.stats.title})`,
            [{ text: 'Awesome!' }]
          )
        } else if (previousXP !== null && newStats.stats.totalXP > previousXP) {
          const xpEarned = newStats.stats.totalXP - previousXP
          Alert.alert('XP Earned', `+${xpEarned} XP earned!`, [{ text: 'OK' }])
        }
      } catch { /* non-blocking */ }

      setShowSuccess(true)
    } else {
      Alert.alert(
        'Offline Queued',
        'No network connection. Observation saved locally and will sync later.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Home'),
          },
        ]
      )
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return COLORS.success
    if (confidence >= 0.5) return COLORS.warning
    return COLORS.error
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High'
    if (confidence >= 0.5) return 'Medium'
    return 'Low'
  }

  if (showSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={72} color={COLORS.success} />
          <Text style={styles.successTitle}>Observation Submitted</Text>
          <Text style={styles.successMessage}>
            Your AI-assisted observation has been queued for review.
          </Text>
          <Button
            title="Capture Another"
            onPress={() => {
              setShowSuccess(false)
              navigation.navigate('New')
            }}
            style={styles.successButton}
            accessibilityLabel="Capture another observation"
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isManualFallback ? 'Manual Entry' : 'Review AI Results'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {!isManualFallback && (
            <View style={styles.aiSummary}>
              <View style={styles.aiSummaryHeader}>
                <Ionicons name="sparkles" size={20} color={COLORS.accent} />
                <Text style={styles.aiSummaryTitle}>AI Analysis Results</Text>
                <View style={styles.confidenceBadge}>
                  <Text style={[
                    styles.confidenceText,
                    { color: getConfidenceColor(analysis.confidence) }
                  ]}>
                    {getConfidenceLabel(analysis.confidence)} confidence
                  </Text>
                </View>
              </View>

              <Text style={styles.aiSpeciesName}>{analysis.speciesName}</Text>

              {analysis.rawAnalysis && (
                <Text style={styles.aiRawAnalysis}>{analysis.rawAnalysis}</Text>
              )}

              {analysis.suggestions?.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {analysis.suggestions.map((suggestion, i) => (
                    <View key={i} style={styles.suggestionRow}>
                      <Ionicons name="information-circle" size={16} color={COLORS.primary} />
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {isManualFallback && (
            <View style={styles.manualFallbackCard}>
              <Ionicons name="alert-circle" size={20} color={COLORS.warning} />
              <Text style={styles.manualFallbackText}>
                AI analysis unavailable. Please fill in all fields manually.
              </Text>
            </View>
          )}

          {displayPhotos.length > 0 && (
            <View style={styles.photoStrip}>
              {displayPhotos.map((uri, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => handlePhotoPress(uri)}
                  accessibilityLabel={`View photo ${i + 1} in fullscreen`}
                >
                  <Image source={{ uri }} style={styles.photoStripImage} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {coinType !== undefined && (
            <View style={styles.coinInfo}>
              <Ionicons name="pricetag" size={16} color={COLORS.accent} />
              <Text style={styles.coinInfoText}>
                Reference coin: {coinType || 'AI detected'}
                {analysis.detectedCoin &&
                  extractCoinDenomination(analysis.detectedCoin) !== extractCoinDenomination(coinType) && (
                  <Text>
                    {' '}
                    (AI detected: {analysis.detectedCoin})
                  </Text>
                  )}
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Species</Text>
          <Controller
            control={control}
            name="speciesId"
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldWithBadge}>
                <PickerWithAlert
                  label="Species"
                  options={[
                    { label: 'Select species...', value: '' },
                    ...species.map((s) => ({
                      label: `${s.commonName} (${s.scientificName})`,
                      value: s.id,
                    })),
                  ]}
                  selectedValue={value}
                  onValueChange={onChange}
                  error={errors.speciesId?.message}
                />
                {!isManualFallback && analysis.speciesId && <AIBadge label="AI" />}
              </View>
            )}
          />

          <Text style={styles.sectionTitle}>Measurements</Text>
          <Controller
            control={control}
            name="cw"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.fieldWithBadge}>
                <Input
                  label={`Carapace Width (cm)`}
                  placeholder="e.g. 8.5"
                  keyboardType="decimal-pad"
                  value={value?.toString() || ''}
                  onBlur={onBlur}
                  onChangeText={(v) => onChange(parseFloat(v) || 0)}
                  error={errors.cw?.message}
                />
                {!isManualFallback && analysis.estimatedCW && <AIBadge label={`AI: ${analysis.estimatedCW} cm`} />}
              </View>
            )}
          />

          <Controller
            control={control}
            name="bw"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Body Weight (g)"
                placeholder="Optional — weigh manually"
                keyboardType="decimal-pad"
                value={value?.toString() || ''}
                onBlur={onBlur}
                onChangeText={(v) => onChange(v === '' ? undefined : parseFloat(v) || 0)}
                error={errors.bw?.message}
              />
            )}
          />

          <Text style={styles.sectionTitle}>Biological Data</Text>
          <Controller
            control={control}
            name="gender"
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldWithBadge}>
                <PickerWithAlert
                  label="Gender"
                  options={GENDER_OPTIONS}
                  selectedValue={value}
                  onValueChange={onChange}
                  error={errors.gender?.message}
                />
                {!isManualFallback && analysis.gender && analysis.gender !== 'unknown' && <AIBadge label={`AI: ${analysis.gender}`} />}
              </View>
            )}
          />

          <Controller
            control={control}
            name="maturationStatus"
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldWithBadge}>
                <PickerWithAlert
                  label="Maturation"
                  options={MATURATION_OPTIONS}
                  selectedValue={value}
                  onValueChange={onChange}
                  error={errors.maturationStatus?.message}
                />
                {!isManualFallback && analysis.maturationStatus && analysis.maturationStatus !== 'unknown' && <AIBadge label={`AI: ${analysis.maturationStatus}`} />}
              </View>
            )}
          />

          <Text style={styles.sectionTitle}>Location</Text>
          <GPSCapture
            latitude={latitude}
            longitude={longitude}
            onLocationCapture={handleLocationCapture}
            manualMode={manualLocation}
            onManualToggle={() => setManualLocation((v) => !v)}
          />

          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                placeholder="Add any additional notes..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={value || ''}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.notes?.message}
                style={styles.notesInput}
              />
            )}
          />

          {submitError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{submitError}</Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <Button
              title="Retake Photos"
              variant="ghost"
              onPress={() => navigation.goBack()}
              style={styles.actionButton}
              accessibilityLabel="Go back and retake photos"
            />
            <Button
              title="Submit"
              loading={submitting}
              onPress={handleSubmit(onSubmit)}
              style={styles.actionButton}
              accessibilityLabel="Submit observation"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showFullscreen}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFullscreen(false)}
      >
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setShowFullscreen(false)}
            accessibilityLabel="Close fullscreen image"
          >
            <Ionicons name="close-circle" size={32} color="#ffffff" />
          </TouchableOpacity>
          <Image
            source={fullscreenPhoto ? { uri: fullscreenPhoto } : undefined}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: FONT.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  inner: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  aiSummary: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderLeftWidth: 4,
  },
  aiSummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aiSummaryTitle: {
    flex: 1,
    fontSize: FONT.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  confidenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  confidenceText: {
    fontSize: FONT.sm,
    fontWeight: '600',
  },
  aiSpeciesName: {
    fontSize: FONT.xl,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 8,
  },
  aiRawAnalysis: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  suggestionsContainer: {
    gap: 6,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  suggestionText: {
    flex: 1,
    fontSize: FONT['sm+'],
    color: COLORS.primary,
    lineHeight: 18,
  },
  manualFallbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.warningLight,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.warning,
  },
  manualFallbackText: {
    flex: 1,
    fontSize: FONT.base,
    color: COLORS.text,
    lineHeight: 20,
  },
  photoStrip: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  photoStripImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  coinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningLight,
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    gap: 6,
  },
  coinInfoText: {
    flex: 1,
    fontSize: FONT['sm+'],
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: FONT.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  fieldWithBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#fffbeb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.accent,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  aiBadgeText: {
    fontSize: FONT.xs,
    color: COLORS.accent,
    fontWeight: '600',
  },
  notesInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  errorBox: {
    backgroundColor: COLORS.errorLight,
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  errorText: {
    fontSize: FONT.base,
    color: COLORS.error,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successTitle: {
    fontSize: FONT['2xl'],
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  successMessage: {
    fontSize: FONT.lg,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  successButton: {
    minWidth: 200,
  },
  fullscreenOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },
})
