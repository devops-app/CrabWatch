import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
type IoniconName = keyof typeof Ionicons.glyphMap
import { useTranslation } from 'react-i18next'
import { analysisService, AnalysisProgress, AnalysisResult } from '../../services/analysisService'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import { Button } from '../../components/common/Button'
import { PhotoView } from '@crabwatch/shared'

interface AnalysisLoadingRouteParams {
  photos: string[]
  views: PhotoView[]
  sessionId: string
  coinType?: string
  qualityOverrides?: Partial<Record<PhotoView, { approved: boolean; reason?: string }>>
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export function AnalysisLoadingScreen() {
  const navigation = useNavigation<any>()
  const route = useRoute<any>()
  const { photos, views, sessionId, coinType, qualityOverrides } = route.params as AnalysisLoadingRouteParams
  const { t } = useTranslation('analysis')

  const steps = useMemo(() => [
    { key: 'uploading', label: t('steps.uploading'), icon: 'cloud-upload-outline' },
    { key: 'identifying', label: t('steps.identifying'), icon: 'search' },
    { key: 'estimating', label: t('steps.estimating'), icon: 'resize' },
    { key: 'complete', label: t('steps.complete'), icon: 'checkmark-circle' },
  ], [t])

  const [progress, setProgress] = useState<AnalysisProgress>({
    status: 'uploading',
    message: 'Starting analysis...',
    percentage: 0,
  })
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleProgress = useCallback((p: AnalysisProgress) => {
    setProgress(p)

    if (p.status === 'uploading') setCurrentStepIndex(0)
    else if (p.message?.includes('species') || p.message?.includes('Identifying')) setCurrentStepIndex(1)
    else if (p.message?.includes('size') || p.message?.includes('Estimating')) setCurrentStepIndex(2)
    else if (p.status === 'complete') setCurrentStepIndex(3)
  }, [])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1)
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const runAnalysis = async () => {
      try {
        const result = await analysisService.analyzeCrab(
          photos,
          views,
            sessionId,
            coinType,
            qualityOverrides,
            (p) => {
              if (!cancelled) handleProgress(p)
            }
          )

        if (!cancelled) {
          if (timerRef.current) clearInterval(timerRef.current)
          navigation.navigate('AIReview', {
            analysis: result.analysis,
            photos,
            views,
            sessionId,
            coinType,
            blobUrls: result.blobUrls,
          })
        }
      } catch (error: unknown) {
        if (cancelled) return
        if (timerRef.current) clearInterval(timerRef.current)
        const message = error instanceof Error ? error.message : 'Analysis failed'
        handleProgress({ status: 'error', message, percentage: 0 })
      }
    }

    runAnalysis()

    return () => {
      cancelled = true
    }
  }, [photos, views, sessionId, coinType, qualityOverrides, navigation, handleProgress])

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    navigation.goBack()
  }

  const handleRetry = () => {
    setElapsed(0)
    setCurrentStepIndex(0)
    setProgress({ status: 'uploading', message: 'Retrying...', percentage: 0 })

    const runAnalysis = async () => {
      try {
        const result = await analysisService.retryAnalysis(
          photos,
            views,
            sessionId,
            coinType,
            qualityOverrides,
            handleProgress
          )

        if (timerRef.current) clearInterval(timerRef.current)
        navigation.navigate('AIReview', {
          analysis: result.analysis,
          photos,
          views,
          sessionId,
          coinType,
          blobUrls: result.blobUrls,
        })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Analysis failed'
        handleProgress({ status: 'error', message, percentage: 0 })
      }
    }

    runAnalysis()
  }

  const handleSubmitManually = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    navigation.navigate('AIReview', {
      analysis: {
        speciesId: 'unknown',
        speciesName: 'Unknown Species',
        confidence: 0,
        speciesConfidence: 0,
        estimatedCW: null,
        estimatedBW: null,
        gender: 'unknown',
        maturationStatus: 'unknown',
        detectedCoin: null,
        coinConfidence: 0,
        crabCount: 1,
        suggestions: ['AI analysis failed. Please fill in all fields manually.'],
        rawAnalysis: '',
      },
      photos,
      views,
      sessionId,
      coinType,
      isManualFallback: true,
    })
  }

  const isComplete = progress.status === 'complete'
  const isError = progress.status === 'error'

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{t('title')}</Text>
          {!isComplete && !isError && (
            <Text style={styles.elapsedTime}>
              <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
              {' '}{formatElapsed(elapsed)}
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={handleCancel}
          accessibilityLabel={t('cancelAnalysis')}
        >
          <Ionicons name="close-circle" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <View style={styles.photoThumbnails}>
          {photos.map((uri, i) => (
            <Image key={i} source={{ uri }} style={styles.thumbnail} />
          ))}
        </View>

        <View style={styles.stepsContainer}>
          {steps.map((step, i) => {
            const isDone = i < currentStepIndex || isComplete
            const isCurrent = i === currentStepIndex && !isComplete && !isError
            return (
              <View key={step.key} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepIcon,
                    isDone && styles.stepIconDone,
                    isCurrent && styles.stepIconCurrent,
                    isError && i >= currentStepIndex && styles.stepIconError,
                  ]}
                >
                  {isCurrent ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : isError && i >= currentStepIndex ? (
                    <Ionicons name="close" size={20} color={COLORS.textLight} />
                  ) : isDone ? (
                    <Ionicons name="checkmark" size={20} color={COLORS.surface} />
                  ) : (
                    <Ionicons name={step.icon as IoniconName} size={20} color={COLORS.textLight} />
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isDone && styles.stepLabelDone,
                    isCurrent && styles.stepLabelCurrent,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            )
          })}
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress.percentage}%` },
                isError && styles.progressFillError,
              ]}
            />
          </View>
          <Text style={styles.progressText}>{progress.percentage}%</Text>
        </View>

        {isError && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={24} color={COLORS.error} />
            <Text style={styles.errorTitle}>{t('analysisFailed')}</Text>
            <Text style={styles.errorMessage}>{progress.message}</Text>
            <View style={styles.errorActions}>
              <Button
                title={t('retry')}
                onPress={handleRetry}
                style={styles.retryButton}
                accessibilityLabel={t('retryAnalysis')}
              />
              <Button
                title={t('submitManually')}
                variant="secondary"
                onPress={handleSubmitManually}
                style={styles.manualButton}
                accessibilityLabel={t('submitManuallyA11y')}
              />
              <Button
                title={t('goBack')}
                variant="ghost"
                onPress={handleCancel}
                style={styles.backButton}
                accessibilityLabel={t('goBackA11y')}
              />
            </View>
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerTitle: {
    fontSize: FONT.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  elapsedTime: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    alignItems: 'center',
  },
  photoThumbnails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 32,
    justifyContent: 'center',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  stepsContainer: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepIconDone: {
    backgroundColor: COLORS.success,
  },
  stepIconCurrent: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  stepIconError: {
    backgroundColor: COLORS.errorLight,
  },
  stepLabel: {
    fontSize: FONT.base,
    color: COLORS.textLight,
  },
  stepLabelDone: {
    color: COLORS.text,
    fontWeight: '600',
  },
  stepLabelCurrent: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressFillError: {
    backgroundColor: COLORS.error,
  },
  progressText: {
    fontSize: FONT['sm+'],
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  errorCard: {
    width: '100%',
    backgroundColor: COLORS.errorLight,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: FONT.lg,
    fontWeight: '600',
    color: COLORS.error,
    marginTop: 8,
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorActions: {
    flexDirection: 'column',
    gap: 8,
    width: '100%',
  },
  retryButton: {
    flex: 1,
  },
  manualButton: {
    flex: 1,
  },
  backButton: {
    flex: 1,
  },
})
