import React, { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
  Image as RNImage,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useIsFocused } from '@react-navigation/native'
import {
  observationSchema,
  type ObservationFormValues,
} from '../../utils/validators'
import { useObservation } from '../../hooks/useObservation'
import { useSpeciesStore } from '../../store/speciesStore'
import { api } from '../../services/api'
import {
  COLORS,
  CW_MAX,
  BW_MAX,
} from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import { Input } from '../../components/common/Input'
import { PickerWithAlert } from '../../components/common/Picker'
import { Button } from '../../components/common/Button'
import { GPSCapture } from '../../components/observation/GPSCapture'
import { CrabAnalysisResult, PhotoView, SpeciesTranslation } from '@crabwatch/shared'

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

function sanitizeDecimalInput(value: string): string {
  const normalized = value.replace(',', '.').replace(/[^\d.]/g, '')
  const [intPart = '', ...fractionParts] = normalized.split('.')
  if (fractionParts.length === 0) return intPart
  const fraction = fractionParts.join('').slice(0, 2)
  return `${intPart}.${fraction}`
}

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

  const { t, i18n } = useTranslation('review')
  const { submitObservation, submitting, error: submitError } = useObservation()
  const { species, loadSpecies, getSpeciesById } = useSpeciesStore()
  const [translation, setTranslation] = useState<SpeciesTranslation | null>(null)
  const [translating, setTranslating] = useState(false)
  const needsTranslation = i18n.language !== 'en'

  const GENDER_OPTIONS = useMemo(
    () => [
      { label: t('genderOptions.male'), value: 'male' },
      { label: t('genderOptions.female'), value: 'female' },
      { label: t('genderOptions.unknown'), value: 'unknown' },
    ],
    [t]
  )

  const MATURATION_OPTIONS = useMemo(
    () => [
      { label: t('maturationOptions.mature'), value: 'mature' },
      { label: t('maturationOptions.immature'), value: 'immature' },
      { label: t('maturationOptions.unknown'), value: 'unknown' },
    ],
    [t]
  )

  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [manualLocation, setManualLocation] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [fullscreenPhoto, setFullscreenPhoto] = useState<string | null>(null)
  const [fullscreenLayout, setFullscreenLayout] = useState({ width: 0, height: 0 })
  const [fullscreenNaturalSize, setFullscreenNaturalSize] = useState<{ width: number; height: number } | null>(null)
  const [rawCW, setRawCW] = useState(analysis.estimatedCW?.toString() || '')
  const [rawBW, setRawBW] = useState('')
  const coveragePct = analysis.crabCoveragePct
  const hasLowCoverage = typeof coveragePct === 'number' && coveragePct < 35
  const autoCrop = analysis.autoCropBoundingBox
  const hasAutoCrop = Boolean(
    autoCrop
    && Number.isFinite(autoCrop.x)
    && Number.isFinite(autoCrop.y)
    && Number.isFinite(autoCrop.width)
    && Number.isFinite(autoCrop.height)
    && autoCrop.width > 0
    && autoCrop.height > 0
  )

  const cropBoxStyle = hasAutoCrop
    ? {
      left: 70 * Math.max(0, Math.min(1, autoCrop!.x)),
      top: 70 * Math.max(0, Math.min(1, autoCrop!.y)),
      width: 70 * Math.max(0, Math.min(1, autoCrop!.width)),
      height: 70 * Math.max(0, Math.min(1, autoCrop!.height)),
    }
    : null

  const fullscreenCropTargetUri = displayPhotos[0] ?? null
  const fullscreenCropBoxStyle = useMemo(() => {
    if (!hasAutoCrop || !autoCrop || !fullscreenPhoto || !fullscreenNaturalSize) return null
    if (fullscreenPhoto !== fullscreenCropTargetUri) return null
    if (fullscreenLayout.width <= 0 || fullscreenLayout.height <= 0) return null

    const imageAspect = fullscreenNaturalSize.width / fullscreenNaturalSize.height
    const viewportAspect = fullscreenLayout.width / fullscreenLayout.height

    let renderedWidth = fullscreenLayout.width
    let renderedHeight = fullscreenLayout.height
    if (imageAspect > viewportAspect) {
      renderedHeight = renderedWidth / imageAspect
    } else {
      renderedWidth = renderedHeight * imageAspect
    }

    const offsetLeft = (fullscreenLayout.width - renderedWidth) / 2
    const offsetTop = (fullscreenLayout.height - renderedHeight) / 2

    return {
      left: offsetLeft + renderedWidth * Math.max(0, Math.min(1, autoCrop.x)),
      top: offsetTop + renderedHeight * Math.max(0, Math.min(1, autoCrop.y)),
      width: renderedWidth * Math.max(0, Math.min(1, autoCrop.width)),
      height: renderedHeight * Math.max(0, Math.min(1, autoCrop.height)),
    }
  }, [autoCrop, fullscreenCropTargetUri, fullscreenLayout.height, fullscreenLayout.width, fullscreenNaturalSize, fullscreenPhoto, hasAutoCrop])

  React.useEffect(() => {
    if (!showFullscreen || !fullscreenPhoto) return
    RNImage.getSize(
      fullscreenPhoto,
      (width, height) => setFullscreenNaturalSize({ width, height }),
      () => setFullscreenNaturalSize(null)
    )
  }, [fullscreenPhoto, showFullscreen])

  useEffect(() => {
    if (!analysis.speciesId || !needsTranslation) {
      setTranslation(null)
      return
    }
    let cancelled = false
    setTranslating(true)
    api.translateSpecies(analysis.speciesId, i18n.language)
      .then((data) => {
        if (!cancelled) setTranslation(data)
      })
      .catch(() => {
        if (!cancelled) setTranslation(null)
      })
      .finally(() => {
        if (!cancelled) setTranslating(false)
      })
    return () => { cancelled = true }
  }, [analysis.speciesId, needsTranslation, i18n.language])

  const displayName = useMemo(() => {
    if (translation && needsTranslation) return translation.commonName
    return analysis.speciesName
  }, [analysis.speciesName, translation, needsTranslation])

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

  const isFocused = useIsFocused()

  useEffect(() => {
    if (isFocused) {
      loadSpecies()
    }
  }, [isFocused, loadSpecies])

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
      Alert.alert(t('alertLocationTitle'), t('alertLocationMessage'))
      return
    }

    const payload = {
      ...data,
      cw: parseFloat(sanitizeDecimalInput(rawCW)) || 0,
      bw: rawBW === '' ? null : parseFloat(sanitizeDecimalInput(rawBW)) || null,
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
            t('levelUpTitle'),
            t('levelUpMessage', { level: newStats.stats.level, title: newStats.stats.title }),
            [{ text: t('awesome') }]
          )
        } else if (previousXP !== null && newStats.stats.totalXP > previousXP) {
          const xpEarned = newStats.stats.totalXP - previousXP
          Alert.alert(t('xpEarnedTitle'), t('xpEarnedMessage', { xp: xpEarned }), [{ text: t('ok') }])
        }
      } catch { /* non-blocking */ }

      setShowSuccess(true)
    } else {
      Alert.alert(
        t('offlineQueuedTitle'),
        t('offlineQueuedMessage'),
        [
          {
            text: t('ok'),
            onPress: () => navigation.navigate('MainTabs', { screen: 'Home' }),
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
    if (confidence >= 0.8) return t('high')
    if (confidence >= 0.5) return t('medium')
    return t('low')
  }

  if (showSuccess) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={72} color={COLORS.success} />
          <Text style={styles.successTitle}>{t('observationSubmitted')}</Text>
          <Text style={styles.successMessage}>
            {t('submittedMessage')}
          </Text>
          <Button
            title={t('captureAnother')}
            onPress={() => {
              setShowSuccess(false)
              navigation.navigate('MainTabs', { screen: 'New' })
            }}
            style={styles.successButton}
            accessibilityLabel={t('captureAnotherA11y')}
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
          accessibilityLabel={t('goBackA11y')}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isManualFallback ? t('manualEntry') : t('reviewAIResults')}
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
                <Text style={styles.aiSummaryTitle}>{t('aiAnalysisResults')}</Text>
                {analysis.secondPassApplied && (
                  <View style={styles.secondPassBadge}>
                    <Ionicons name="scan" size={11} color="#0e7490" />
                    <Text style={styles.secondPassBadgeText}>{t('enhancedByCrop')}</Text>
                  </View>
                )}
                <View style={styles.confidenceBadge}>
                  <Text style={[
                    styles.confidenceText,
                    { color: getConfidenceColor(analysis.confidence) }
                  ]}>
                    {t('confidenceLabel', { level: getConfidenceLabel(analysis.confidence) })}
                  </Text>
                </View>
              </View>

              <Text style={styles.aiSpeciesName}>{translating ? `${t('common.loading')}...` : displayName}</Text>

              {typeof coveragePct === 'number' && (
                <View style={styles.coverageRow}>
                  <Text style={styles.coverageLabel}>{t('crabCoverage')}:</Text>
                  <Text style={styles.coverageValue}>{coveragePct.toFixed(1)}%</Text>
                  {hasLowCoverage && (
                    <View style={styles.coverageChip}>
                      <Ionicons name="warning" size={12} color={COLORS.warning} />
                      <Text style={styles.coverageChipText}>{t('coverageWarningChip')}</Text>
                    </View>
                  )}
                </View>
              )}

              {hasLowCoverage && (
                <View style={styles.coverageWarnBox}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.warning} />
                  <View style={styles.coverageWarnContent}>
                    <Text style={styles.coverageWarnText}>
                      {t('coverageWarningMessage', { coverage: coveragePct?.toFixed(1) || '0' })}
                    </Text>
                    <TouchableOpacity
                      style={styles.coverageRetakeBtn}
                      onPress={() => navigation.goBack()}
                      accessibilityRole="button"
                      accessibilityLabel={t('retakeRecommendedA11y')}
                    >
                      <Text style={styles.coverageRetakeText}>{t('retakeRecommended')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

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
                {t('manualFallback')}
              </Text>
            </View>
          )}

          {displayPhotos.length > 0 && (
            <View style={styles.photoStrip}>
              {displayPhotos.map((uri, i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => handlePhotoPress(uri)}
                  accessibilityLabel={t('viewPhotoA11y', { index: i + 1 })}
                  style={styles.photoThumbWrap}
                >
                  <Image source={{ uri }} style={styles.photoStripImage} />
                  {hasAutoCrop && i === 0 && cropBoxStyle && (
                    <>
                      <View style={[styles.cropOverlayBox, cropBoxStyle]} pointerEvents="none" />
                      <View style={styles.cropOverlayChip} pointerEvents="none">
                        <Text style={styles.cropOverlayChipText}>{t('suggestedCrop')}</Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {hasAutoCrop && (
            <Text style={styles.cropHintText}>{t('suggestedCropHint')}</Text>
          )}

          {coinType !== undefined && (
            <View style={styles.coinInfo}>
              <Ionicons name="pricetag" size={16} color={COLORS.accent} />
              <Text style={styles.coinInfoText}>
                {t('referenceCoin')} {coinType || t('aiDetected')}
                {analysis.detectedCoin &&
                  extractCoinDenomination(analysis.detectedCoin) !== extractCoinDenomination(coinType) && (
                  <Text>
                    {' '}
                    ({t('aiDetectedLabel', { coin: analysis.detectedCoin })})
                  </Text>
                  )}
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>{t('speciesSection')}</Text>
          <Controller
            control={control}
            name="speciesId"
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldWithBadge}>
                <PickerWithAlert
                  label={t('species')}
                  options={[
                    { label: t('selectSpecies'), value: '' },
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

          <Text style={styles.sectionTitle}>{t('measurements')}</Text>
          <Controller
            control={control}
            name="cw"
            render={({ field: { onChange, onBlur, value } }) => (
              <View style={styles.fieldWithBadge}>
                <Input
                  label={t('carapaceWidth')}
                  placeholder={t('cwPlaceholder')}
                  keyboardType="decimal-pad"
                  value={rawCW}
                  onBlur={() => {
                    onChange(parseFloat(sanitizeDecimalInput(rawCW)) || 0)
                    onBlur()
                  }}
                  onChangeText={(v) => {
                    const sanitized = sanitizeDecimalInput(v)
                    setRawCW(sanitized)
                    onChange(parseFloat(sanitized) || 0)
                  }}
                  error={errors.cw?.message}
                />
                {!isManualFallback && analysis.estimatedCW && <AIBadge label={t('aiCW', { cw: analysis.estimatedCW })} />}
              </View>
            )}
          />

          <Controller
            control={control}
            name="bw"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('bodyWeight')}
                placeholder={t('bwPlaceholder')}
                keyboardType="decimal-pad"
                value={rawBW}
                onBlur={() => {
                  const sanitized = sanitizeDecimalInput(rawBW)
                  onChange(sanitized === '' ? undefined : parseFloat(sanitized) || 0)
                  onBlur()
                }}
                onChangeText={(v) => {
                  const sanitized = sanitizeDecimalInput(v)
                  setRawBW(sanitized)
                  onChange(sanitized === '' ? undefined : parseFloat(sanitized) || 0)
                }}
                error={errors.bw?.message}
              />
            )}
          />

          <Text style={styles.sectionTitle}>{t('biologicalData')}</Text>
          <Controller
            control={control}
            name="gender"
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldWithBadge}>
                <PickerWithAlert
                  label={t('gender')}
                  options={GENDER_OPTIONS}
                  selectedValue={value}
                  onValueChange={onChange}
                  error={errors.gender?.message}
                />
                {!isManualFallback && analysis.gender && analysis.gender !== 'unknown' && <AIBadge label={t('aiGender', { gender: analysis.gender })} />}
              </View>
            )}
          />

          <Controller
            control={control}
            name="maturationStatus"
            render={({ field: { onChange, value } }) => (
              <View style={styles.fieldWithBadge}>
                <PickerWithAlert
                  label={t('maturation')}
                  options={MATURATION_OPTIONS}
                  selectedValue={value}
                  onValueChange={onChange}
                  error={errors.maturationStatus?.message}
                />
                {!isManualFallback && analysis.maturationStatus && analysis.maturationStatus !== 'unknown' && <AIBadge label={t('aiMaturation', { status: analysis.maturationStatus })} />}
              </View>
            )}
          />

          <Text style={styles.sectionTitle}>{t('location')}</Text>
          <GPSCapture
            latitude={latitude}
            longitude={longitude}
            onLocationCapture={handleLocationCapture}
            manualMode={manualLocation}
            onManualToggle={() => setManualLocation((v) => !v)}
          />

          <Text style={styles.sectionTitle}>{t('notes')}</Text>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                placeholder={t('notesPlaceholder')}
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
              title={t('retakePhotos')}
              variant="ghost"
              onPress={() => navigation.goBack()}
              style={styles.actionButton}
              accessibilityLabel={t('retakePhotosA11y')}
            />
            <Button
              title={t('submit')}
              loading={submitting}
              onPress={handleSubmit(onSubmit)}
              style={styles.actionButton}
              accessibilityLabel={t('submitObservationA11y')}
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
        <View
          style={styles.fullscreenOverlay}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout
            setFullscreenLayout({ width, height })
          }}
        >
          <TouchableOpacity
            style={styles.fullscreenClose}
            onPress={() => setShowFullscreen(false)}
            accessibilityLabel={t('closeFullscreenA11y')}
          >
            <Ionicons name="close-circle" size={32} color="#ffffff" />
          </TouchableOpacity>
          <Image
            source={fullscreenPhoto ? { uri: fullscreenPhoto } : undefined}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
          {fullscreenCropBoxStyle && (
            <>
              <View
                style={[
                  styles.fullscreenCropMask,
                  { left: 0, top: 0, width: '100%', height: fullscreenCropBoxStyle.top },
                ]}
                pointerEvents="none"
              />
              <View
                style={[
                  styles.fullscreenCropMask,
                  {
                    left: 0,
                    top: fullscreenCropBoxStyle.top,
                    width: fullscreenCropBoxStyle.left,
                    height: fullscreenCropBoxStyle.height,
                  },
                ]}
                pointerEvents="none"
              />
              <View
                style={[
                  styles.fullscreenCropMask,
                  {
                    left: fullscreenCropBoxStyle.left + fullscreenCropBoxStyle.width,
                    top: fullscreenCropBoxStyle.top,
                    width: Math.max(0, fullscreenLayout.width - (fullscreenCropBoxStyle.left + fullscreenCropBoxStyle.width)),
                    height: fullscreenCropBoxStyle.height,
                  },
                ]}
                pointerEvents="none"
              />
              <View
                style={[
                  styles.fullscreenCropMask,
                  {
                    left: 0,
                    top: fullscreenCropBoxStyle.top + fullscreenCropBoxStyle.height,
                    width: '100%',
                    height: Math.max(0, fullscreenLayout.height - (fullscreenCropBoxStyle.top + fullscreenCropBoxStyle.height)),
                  },
                ]}
                pointerEvents="none"
              />
              <View style={[styles.fullscreenCropBox, fullscreenCropBoxStyle]} pointerEvents="none" />
              <View
                style={[
                  styles.fullscreenCropChip,
                  {
                    left: fullscreenCropBoxStyle.left,
                    top: Math.max(8, fullscreenCropBoxStyle.top - 30),
                  },
                ]}
                pointerEvents="none"
              >
                <Text style={styles.fullscreenCropChipText}>{t('suggestedCrop')}</Text>
              </View>
            </>
          )}
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
  secondPassBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#ecfeff',
    borderWidth: 1,
    borderColor: '#a5f3fc',
  },
  secondPassBadgeText: {
    fontSize: FONT.xs,
    color: '#0e7490',
    fontWeight: '700',
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
  coverageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  coverageLabel: {
    fontSize: FONT['sm+'],
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  coverageValue: {
    fontSize: FONT['sm+'],
    color: COLORS.text,
    fontWeight: '700',
  },
  coverageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.warning,
    backgroundColor: COLORS.warningLight,
  },
  coverageChipText: {
    fontSize: FONT.xs,
    color: '#92400e',
    fontWeight: '700',
  },
  coverageWarnBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.warningLight,
    borderWidth: 1,
    borderColor: COLORS.warning,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  coverageWarnContent: {
    flex: 1,
    gap: 8,
  },
  coverageWarnText: {
    fontSize: FONT['sm+'],
    color: '#78350f',
    lineHeight: 18,
  },
  coverageRetakeBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f59e0b',
  },
  coverageRetakeText: {
    fontSize: FONT.sm,
    color: '#ffffff',
    fontWeight: '700',
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
  photoThumbWrap: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photoStripImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
  },
  cropOverlayBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#22d3ee',
    borderRadius: 2,
  },
  cropOverlayChip: {
    position: 'absolute',
    left: 3,
    top: 3,
    backgroundColor: '#06b6d4',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  cropOverlayChipText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '700',
  },
  cropHintText: {
    marginTop: -10,
    marginBottom: 10,
    fontSize: FONT.xs,
    color: '#0e7490',
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
  fullscreenCropBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#22d3ee',
    borderRadius: 3,
  },
  fullscreenCropMask: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  fullscreenCropChip: {
    position: 'absolute',
    backgroundColor: '#06b6d4',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fullscreenCropChipText: {
    color: '#ffffff',
    fontSize: FONT.xs,
    fontWeight: '700',
  },
})
