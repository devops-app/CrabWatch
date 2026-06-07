import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  PanResponder,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useIsFocused } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ScreenOrientation from 'expo-screen-orientation'
import { photoService } from '../../services/photoService'
import { analysisService } from '../../services/analysisService'
import { api } from '../../services/api'
import { COLORS, FOCUS_SAMPLE_COOLDOWN_MS, QUALITY_GATE_MODES } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import { Button } from '../../components/common/Button'
import { CaptureFrameOverlay } from '../../components/observation/CaptureFrameOverlay'
import { useCaptureAssistance } from '../../hooks/useCaptureAssistance'
import { analyzeView } from '../../utils/viewAnalysis'
import { PhotoView, applyGateModeToStatus, isGateBlocking, isGateOverridable } from '@crabwatch/shared'
import { PhotoTipsModal } from '../../components/observation/PhotoTipsModal'
import {
  MobileQualityAssessment,
  QualityGateCard,
  QualityOverrideState,
} from '../../components/observation/QualityGateCard'

function CameraOverlay({
  capturingView,
  quality,
  dimensions,
  orientation,
}: {
  capturingView: PhotoView
  quality: ReturnType<typeof useCaptureAssistance>['quality']
  dimensions: { width: number; height: number }
  orientation: ScreenOrientation.Orientation
}) {
  if (dimensions.width === 0 || dimensions.height === 0) return null

  return (
    <CaptureFrameOverlay
      viewType={capturingView}
      isReady={quality.overallReady}
      shakeLevel={quality.shakeLevel}
      isFocused={quality.isFocused}
      messages={quality.messages}
      dimensions={dimensions}
      orientation={orientation}
    />
  )
}

function CameraModalContent({
  capturingView,
  quality,
  capturing,
  cameraRef,
  panHandlers,
  CAPTURE_STEPS,
  currentStepLabel,
  t,
  handleCaptureFromCamera,
  onClose,
}: {
  capturingView: PhotoView
  quality: ReturnType<typeof useCaptureAssistance>['quality']
  capturing: boolean
  cameraRef: React.RefObject<CameraView | null>
  panHandlers: ReturnType<typeof PanResponder.create>['panHandlers']
  CAPTURE_STEPS: { key: PhotoView; icon: string; label: string }[]
  currentStepLabel: string
  t: (key: string) => string
  handleCaptureFromCamera: () => void
  onClose: () => void
}) {
  const dims = useWindowDimensions()
  const [orientation, setOrientation] = useState<ScreenOrientation.Orientation>(ScreenOrientation.Orientation.PORTRAIT_UP)

  useEffect(() => {
    let mounted = true

    ScreenOrientation.getOrientationAsync()
      .then((value) => {
        if (!mounted || value === ScreenOrientation.Orientation.UNKNOWN) return
        setOrientation(value)
      })
      .catch(() => {
        // Keep default orientation when unavailable
      })

    const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
      const nextOrientation = event.orientationInfo.orientation
      if (nextOrientation === ScreenOrientation.Orientation.UNKNOWN) return
      setOrientation(nextOrientation)
    })

    return () => {
      mounted = false
      ScreenOrientation.removeOrientationChangeListener(subscription)
    }
  }, [])

  const isLandscape =
    orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT
    || orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT
  const isLandscapeLeft = orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT
  const currentCaptureStep = CAPTURE_STEPS.find((step) => step.key === capturingView)
  const currentCaptureLabel = currentCaptureStep?.label || currentStepLabel
  const currentCaptureIcon = (currentCaptureStep?.icon ?? 'camera') as keyof typeof Ionicons.glyphMap

  return (
    <SafeAreaView style={styles.cameraScreen}>
      {!isLandscape ? (
        <>
          <View style={styles.cameraHeader}>
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel={t('closeCameraA11y')}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={28} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.cameraTitleCenter}>{currentCaptureLabel}</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.cameraBanner}>
            <Ionicons name="resize-outline" size={16} color="rgba(255,255,255,0.85)" />
            <Text style={styles.cameraBannerText}>{t('cameraBanner')}</Text>
          </View>
        </>
      ) : (
        <>
          <View style={styles.cameraModeChip}>
            <Ionicons name={currentCaptureIcon} size={16} color="#ffffff" />
            <Text style={styles.cameraModeChipText}>{currentCaptureLabel}</Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            accessibilityLabel={t('closeCameraA11y')}
            style={[
              styles.closeButton,
              styles.closeButtonLandscapeNative,
              isLandscapeLeft ? styles.closeButtonLandscapeLeft : styles.closeButtonLandscapeRight,
            ]}
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
        </>
      )}

      <View
        style={styles.cameraBody}
        {...panHandlers}
      >
        <CameraView ref={cameraRef} style={styles.cameraPreview} facing="back" />
        <CameraOverlay
          capturingView={capturingView}
          quality={quality}
          dimensions={dims}
          orientation={orientation}
        />
      </View>

      <View
        style={[
          styles.cameraFooter,
          isLandscape && styles.cameraFooterLandscape,
          isLandscape && (isLandscapeLeft ? styles.cameraFooterLandscapeRight : styles.cameraFooterLandscapeLeft),
        ]}
      >
        <TouchableOpacity
          style={[
            styles.captureButton,
            isLandscape && styles.captureButtonLandscape,
            !quality.overallReady && styles.captureButtonDimmed,
          ]}
          onPress={handleCaptureFromCamera}
          disabled={capturing}
          accessibilityLabel={t('takePhotoA11y')}
        >
          <View
            style={[
              styles.captureButtonInner,
              quality.overallReady && styles.captureButtonInnerReady,
            ]}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const COIN_SERIES_RAW = {
  'Third Series (Current)': [
    { labelKey: 'coins.third5', value: '5 sen (Third Series, 17.78 mm)' },
    { labelKey: 'coins.third10', value: '10 sen (Third Series, 18.80 mm)' },
    { labelKey: 'coins.third20', value: '20 sen (Third Series, 20.60 mm)' },
    { labelKey: 'coins.third50', value: '50 sen (Third Series, 22.65 mm)' },
  ],
  'Second Series (1989-2011)': [
    { labelKey: 'coins.second5', value: '5 sen (Second Series, 16.20 mm)' },
    { labelKey: 'coins.second10', value: '10 sen (Second Series, 19.40 mm)' },
    { labelKey: 'coins.second20', value: '20 sen (Second Series, 23.59 mm)' },
    { labelKey: 'coins.second50', value: '50 sen (Second Series, 27.76 mm)' },
  ],
}

const CAPTURE_STEP_KEYS: { key: PhotoView; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'dorsal', icon: 'eye' },
  { key: 'ventral', icon: 'swap-horizontal' },
  { key: 'carapace-closeup', icon: 'expand' },
]

function createUploadSessionId(): string {
  const randomUuid = globalThis.crypto?.randomUUID?.()
  if (randomUuid) return randomUuid

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16)
    const value = char === 'x' ? random : (random & 0x3) | 0x8
    return value.toString(16)
  })
}

function createDefaultOverrides(): Record<PhotoView, QualityOverrideState> {
  return {
    dorsal: { approved: false, reason: '' },
    ventral: { approved: false, reason: '' },
    'carapace-closeup': { approved: false, reason: '' },
  }
}

export function GuidedCaptureScreen() {
  const { t } = useTranslation('capture')
  const navigation = useNavigation<any>()
  const cameraRef = useRef<CameraView | null>(null)
  const cameraVisibleRef = useRef(false)
  const focusSamplingInFlightRef = useRef(false)
  const lastFocusSampleAtRef = useRef(0)
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const [coinType, setCoinType] = useState<string>('')
  const [coinSelected, setCoinSelected] = useState(false)
  const [expandedSeries, setExpandedSeries] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const [cameraVisible, setCameraVisible] = useState(false)
  const [capturingView, setCapturingView] = useState<PhotoView>('dorsal')
  const [capturing, setCapturing] = useState(false)
  const [photos, setPhotos] = useState<Record<PhotoView, string | null>>({
    'dorsal': null,
    'ventral': null,
    'carapace-closeup': null,
  })
  const [usePicker, setUsePicker] = useState<Record<PhotoView, boolean>>({
    'dorsal': false,
    'ventral': false,
    'carapace-closeup': false,
  })
  const [showPreview, setShowPreview] = useState(false)
  const [showTipsModal, setShowTipsModal] = useState(false)
  const [viewWarnings, setViewWarnings] = useState<string[]>([])
  const [analyzingView, setAnalyzingView] = useState(false)
  const [qualityByView, setQualityByView] = useState<Partial<Record<PhotoView, MobileQualityAssessment>>>({})
  const [qualityOverrides, setQualityOverrides] = useState<Record<PhotoView, QualityOverrideState>>(createDefaultOverrides)
  const [analyzingQuality, setAnalyzingQuality] = useState(false)

  const { quality, sampleBrightnessFromUri } = useCaptureAssistance()

  const CAPTURE_STEPS = useMemo(() => CAPTURE_STEP_KEYS.map((s) => ({
    ...s,
    label: t(`steps.${s.key}.label`),
  })), [t])

  const COIN_SERIES = useMemo(() => {
    const result: Record<string, { label: string; value: string }[]> = {}
    for (const [seriesKey, options] of Object.entries(COIN_SERIES_RAW)) {
      const seriesLabel = t(`coins.${seriesKey === 'Third Series (Current)' ? 'thirdSeries' : 'secondSeries'}`)
      result[seriesLabel] = options.map((o) => ({
        label: t(o.labelKey),
        value: o.value,
      }))
    }
    return result
  }, [t])

  const isFocused = useIsFocused()

  useEffect(() => {
    cameraVisibleRef.current = cameraVisible
  }, [cameraVisible])

  useEffect(() => {
    if (!isFocused) return
    if (cameraVisibleRef.current) return
    setCoinType('')
    setCoinSelected(false)
    setExpandedSeries(null)
    setCurrentStep(0)
    setCameraVisible(false)
    setCapturingView('dorsal')
    setCapturing(false)
    setPhotos({
      'dorsal': null,
      'ventral': null,
      'carapace-closeup': null,
    })
    setUsePicker({
      'dorsal': false,
      'ventral': false,
      'carapace-closeup': false,
    })
    setShowPreview(false)
    setViewWarnings([])
    setAnalyzingView(false)
    setQualityByView({})
    setQualityOverrides(createDefaultOverrides())
    setAnalyzingQuality(false)
  }, [isFocused])

  const handleFocus = useCallback(async () => {
    if (!cameraRef.current || capturing) return

    const now = Date.now()
    if (focusSamplingInFlightRef.current) return
    if (now - lastFocusSampleAtRef.current < FOCUS_SAMPLE_COOLDOWN_MS) return

    focusSamplingInFlightRef.current = true
    lastFocusSampleAtRef.current = now

    try {
      const frame = await cameraRef.current.takePictureAsync({
        quality: 0.2,
        skipProcessing: true,
      })
      if (frame?.uri) {
        await sampleBrightnessFromUri(frame.uri)
      }
    } catch {
      // Ignore focus tap sampling errors to keep capture flow responsive
    } finally {
      focusSamplingInFlightRef.current = false
    }
  }, [capturing, sampleBrightnessFromUri])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => cameraVisible,
      onPanResponderRelease: () => {
        if (cameraVisible) handleFocus()
      },
    })
  ).current

 

 
  useEffect(() => {
    if (!cameraVisible || !cameraRef.current || capturing) return

    ;(async () => {
      try {
        const frame = await cameraRef.current!.takePictureAsync({
          quality: 0.2,
          skipProcessing: true,
        })
        if (frame?.uri) {
          await sampleBrightnessFromUri(frame.uri)
        }
      } catch {
        // Ignore initial brightness sampling errors
      }
    })()
  }, [cameraVisible, capturing, sampleBrightnessFromUri])

  const currentView = CAPTURE_STEP_KEYS[currentStep]?.key || 'dorsal'
  const isLastStep = currentStep === CAPTURE_STEP_KEYS.length - 1
  const currentStepLabel = CAPTURE_STEPS[currentStep]?.label || ''
  const currentQuality = qualityByView[currentView]
  const currentOverride = qualityOverrides[currentView]

  const handleCoinSelect = (value: string) => {
    setCoinType(value)
    setCoinSelected(true)
    setExpandedSeries(null)
  }

  const runQualityAssessment = useCallback(async (uri: string, view: PhotoView): Promise<MobileQualityAssessment> => {
    setAnalyzingQuality(true)
    try {
      const quality = await photoService.assessImageQuality(uri)
      let blurStatus = quality.blurStatus
      let brightnessStatus: 'fail' | 'warn' | 'pass' =
        quality.brightnessLevel === 'dark'
          ? 'fail'
          : quality.brightnessLevel === 'low' || quality.brightnessLevel === 'bright'
            ? 'warn'
            : 'pass'

      blurStatus = applyGateModeToStatus(blurStatus, QUALITY_GATE_MODES.blur)
      brightnessStatus = applyGateModeToStatus(brightnessStatus, QUALITY_GATE_MODES.brightness)

      const issues: string[] = []
      if (blurStatus === 'fail') issues.push('QUALITY_BLUR_FAIL')
      if (brightnessStatus === 'fail') issues.push('QUALITY_BRIGHTNESS_FAIL')

      const overallStatus: 'fail' | 'warn' | 'pass' =
        blurStatus === 'fail' || brightnessStatus === 'fail'
          ? 'fail'
          : blurStatus === 'warn' || brightnessStatus === 'warn'
            ? 'warn'
            : 'pass'

      const assessment: MobileQualityAssessment = {
        blurScore: quality.sharpnessScore,
        brightness: quality.brightness,
        brightnessLevel: quality.brightnessLevel,
        blurStatus,
        brightnessStatus,
        overallStatus,
        issues,
      }

      setQualityByView((prev) => ({ ...prev, [view]: assessment }))
      setQualityOverrides((prev) => ({ ...prev, [view]: { approved: false, reason: '' } }))

      // R-2: Emit quality gate telemetry to match web flow
      api.reportTelemetryError({
        message: '[QUALITY_GATE]',
        error: {
          qualityGateVersion: 'v1',
          platform: 'mobile',
          event: 'quality_result',
          view,
          inputSource: 'camera',
          result: overallStatus,
          issueCodes: issues,
          blurScore: quality.sharpnessScore,
          brightness: quality.brightness,
          timestamp: new Date().toISOString(),
        },
      })

      return assessment
    } finally {
      setAnalyzingQuality(false)
    }
  }, [])

  const hasBlockingFailure = useCallback((view: PhotoView) => {
    const assessment = qualityByView[view]
    if (!assessment) return false
    const override = qualityOverrides[view]
    const hasValidOverride = override.approved && override.reason.trim().length >= 5

    const blurBlocking = isGateBlocking(assessment.blurStatus, QUALITY_GATE_MODES.blur)
    const brightBlocking = isGateBlocking(assessment.brightnessStatus, QUALITY_GATE_MODES.brightness)
    const anyBlocking = blurBlocking || brightBlocking
    if (!anyBlocking) return false

    const anyOverridable = isGateOverridable(QUALITY_GATE_MODES.blur) || isGateOverridable(QUALITY_GATE_MODES.brightness)
    if (anyOverridable && hasValidOverride) return false

    return true
  }, [qualityByView, qualityOverrides])

  const handleTakePhoto = async (view: PhotoView) => {
    try {
      if (usePicker[view]) {
        const uri = await photoService.pickGuidedPhotoFromLibrary()
        if (uri) {
          const normalizedUri = await photoService.normalizeForAnalysis(uri)
          setPhotos((prev) => ({ ...prev, [view]: normalizedUri }))
          setShowPreview(true)
          await runQualityAssessment(normalizedUri, view)
        }
      } else {
        let granted = cameraPermission?.granted ?? false
        if (!granted) {
          const requested = await requestCameraPermission()
          granted = requested.granted
        }

        if (!granted) {
          Alert.alert(t('alertCameraTitle'), t('alertCameraMessage'))
          return
        }

        setCapturingView(view)
        try {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL)
        } catch {
          // Device doesn't support unlock, skip
        }
        setCameraVisible(true)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to open camera.'
      Alert.alert(t('alertCameraUnavailable'), message)
    }
  }

   const handleCaptureFromCamera = async () => {
    if (!cameraRef.current || capturing) return

    setCapturing(true)
    try {
      const captured = await cameraRef.current.takePictureAsync({ quality: 1 })
      if (captured?.uri) {
        const normalizedUri = await photoService.normalizeForAnalysis(captured.uri)

        setPhotos((prev) => ({ ...prev, [capturingView]: normalizedUri }))
        try {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT)
        } catch { /* ignore */ }
        setCameraVisible(false)
        setShowPreview(true)
        setAnalyzingView(true)
        setViewWarnings([])
        await runQualityAssessment(normalizedUri, capturingView)

        const warnings: string[] = []

        // Run local heuristics first (instant)
        const localAnalysis = await analyzeView(normalizedUri, capturingView)
        warnings.push(...localAnalysis.warnings)

        // R-2: Emit view detection telemetry
        api.reportTelemetryError({
          message: '[QUALITY_GATE]',
          error: {
            qualityGateVersion: 'v1',
            platform: 'mobile',
            event: 'quality_result',
            view: capturingView,
            inputSource: 'camera',
            result: warnings.length > 0 ? 'warn' : 'pass',
            issueCodes: warnings.length > 0 ? ['QUALITY_VIEW_MISMATCH'] : [],
            detail: {
              viewConfidence: localAnalysis.confidence,
              isLikelyDorsal: localAnalysis.isLikelyDorsal,
              isLikelyVentral: localAnalysis.isLikelyVentral,
            },
            timestamp: new Date().toISOString(),
          },
        })

        const localMismatch =
          (capturingView === 'dorsal' && !localAnalysis.isLikelyDorsal) ||
          (capturingView === 'ventral' && !localAnalysis.isLikelyVentral)

        const shouldRunAiFallback = localAnalysis.confidence < 0.7 || localMismatch

        // Run AI detection only when local heuristics are uncertain or mismatch
        if (shouldRunAiFallback) {
          try {
            const aiDetection = await analysisService.detectView(normalizedUri, capturingView)
            if (aiDetection.mismatch) {
              warnings.unshift(`⚠️ ${aiDetection.message}`)
            }
          } catch {
            // AI detection failed — keep local warnings only
          }
        }

        setViewWarnings(warnings)
        setAnalyzingView(false)
      }
    } catch {
      Alert.alert(t('alertCaptureFailed'), t('alertCaptureFailedMessage'))
    } finally {
      setCapturing(false)
    }
  }

  const handleRetakePhoto = (view: PhotoView) => {
    setPhotos((prev) => ({ ...prev, [view]: null }))
    setQualityByView((prev) => {
      const next = { ...prev }
      delete next[view]
      return next
    })
    setQualityOverrides((prev) => ({ ...prev, [view]: { approved: false, reason: '' } }))
    setShowPreview(false)
    setViewWarnings([])
    setAnalyzingView(false)
  }

  const handleConfirmPhoto = () => {
    setShowPreview(false)
  }

  const handleApproveOverride = (view: PhotoView) => {
    const override = qualityOverrides[view]
    if (override.reason.trim().length < 5) {
      Alert.alert(t('quality.reasonTitle'), t('quality.reasonRequired'))
      return
    }
    setQualityOverrides((prev) => ({
        ...prev,
        [view]: {
          ...prev[view],
          approved: true,
        },
      }))

      // R-2: Emit override telemetry
      const assessment = qualityByView[view]
      api.reportTelemetryError({
        message: '[QUALITY_GATE]',
        error: {
          qualityGateVersion: 'v1',
          platform: 'mobile',
          event: 'quality_override',
          view,
          inputSource: 'camera',
          overrideUsed: true,
          overrideReason: override.reason,
          issueCodes: assessment?.issues ?? [],
          timestamp: new Date().toISOString(),
        },
      })

      Alert.alert(t('quality.overrideSavedTitle'), t('quality.overrideSavedMessage'))
  }

  const handleClearOverride = (view: PhotoView) => {
    setQualityOverrides((prev) => ({
      ...prev,
      [view]: {
        ...prev[view],
        approved: false,
      },
    }))
  }

  const handleNext = () => {
    if (!photos[currentView] && currentView !== 'carapace-closeup') {
      Alert.alert(t('alertPhotoRequired'), t('alertPhotoRequiredMessage', { view: currentView }))
      return
    }

    if (currentView !== 'carapace-closeup' && !coinSelected) {
      Alert.alert(t('alertCoinRequired'), t('alertCoinRequiredMessage'))
      return
    }

    if (currentView !== 'carapace-closeup' && hasBlockingFailure(currentView)) {
      Alert.alert(t('quality.blockTitle'), t('quality.blockMessage'))
      return
    }

    if (currentStep < CAPTURE_STEP_KEYS.length - 1) {
      setCurrentStep((prev) => prev + 1)
      setShowPreview(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
      setShowPreview(false)
    }
  }

  const handleProceedToAnalysis = () => {
    const dorsalPhoto = photos['dorsal']
    const ventralPhoto = photos['ventral']
    const closeupPhoto = photos['carapace-closeup']

    if (!dorsalPhoto) {
      Alert.alert(t('alertPhotoRequired'), t('alertPhotoRequiredDorsal'))
      return
    }

    if (!coinSelected) {
      Alert.alert(t('alertCoinRequired'), t('alertCoinRequiredFinal'))
      return
    }

    if (hasBlockingFailure('dorsal') || hasBlockingFailure('ventral')) {
      Alert.alert(t('quality.blockTitle'), t('quality.blockAnalyzeMessage'))
      return
    }

    const photoList: string[] = []
    const viewList: PhotoView[] = []

    if (dorsalPhoto) { photoList.push(dorsalPhoto); viewList.push('dorsal') }
    if (ventralPhoto) { photoList.push(ventralPhoto); viewList.push('ventral') }
    if (closeupPhoto) { photoList.push(closeupPhoto); viewList.push('carapace-closeup') }

    navigation.navigate('AnalysisLoading', {
      photos: photoList,
      views: viewList,
      sessionId: createUploadSessionId(),
      coinType: coinType || undefined,
      qualityOverrides,
    })
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('headerTitle')}</Text>
        <Text style={styles.headerSubtitle}>
          {t('stepOf', { current: currentStep + 1, total: CAPTURE_STEP_KEYS.length })}
        </Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
{currentView !== 'carapace-closeup' && (
          <View style={[styles.tipsCard, { marginBottom: 16 }]}>
           <Text style={styles.tipsTitle}>{t('photoTips')}</Text>
              <Text style={styles.tipBullet}>• {t('tipCoin')}</Text>
              <Text style={styles.tipBullet}>• {t('tipFrame')}</Text>
              <Text style={styles.tipBullet}>• {t('tipLight')}</Text>
              <Text style={styles.tipBullet}>• {t('tipSteady')}</Text>
              <TouchableOpacity
                style={styles.viewExamplesButton}
                onPress={() => setShowTipsModal(true)}
                accessibilityRole="button"
                accessibilityLabel={t('viewExamples')}
              >
                <Ionicons name="image-outline" size={16} color={COLORS.primary} />
                <Text style={styles.viewExamplesText}>{t('viewExamples')}</Text>
              </TouchableOpacity>
           </View>
        )}
        {!coinSelected && currentStep === 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
             <Ionicons name="pricetag" size={18} color={COLORS.accent} /> {t('coinReference')}
             </Text>
             <Text style={styles.sectionDescription}>
               {t('coinDesc')}
             </Text>

            <TouchableOpacity
              style={[
                styles.coinButton,
                styles.aiDetectButton,
              ]}
              onPress={() => handleCoinSelect('')}
              accessibilityLabel={t('letAiDetectA11y')}
            >
              <Ionicons name="sparkles" size={18} color={COLORS.accent} />
              <Text style={[styles.coinButtonText, styles.aiDetectText]}>
                 {t('letAiDetect')}
               </Text>
            </TouchableOpacity>

            {Object.entries(COIN_SERIES).map(([series, options]) => (
              <View key={series} style={styles.seriesGroup}>
                <TouchableOpacity
                  style={styles.seriesHeader}
                  onPress={() => setExpandedSeries(expandedSeries === series ? null : series)}
                  accessibilityLabel={t('toggleCoinA11y', { series })}
                  accessibilityRole="button"
                >
                  <Text style={styles.seriesTitle}>{series}</Text>
                  <Ionicons
                    name={expandedSeries === series ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
                {expandedSeries === series && (
                  <View style={styles.seriesOptions}>
                    {options.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={styles.coinButton}
                        onPress={() => handleCoinSelect(option.value)}
                        accessibilityLabel={t('selectCoinA11y', { label: option.label })}
                      >
                        <Text style={styles.coinButtonText}>{option.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {coinSelected && currentStep === 0 && (
          <View style={styles.coinInfo}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.coinInfoText}>
               {coinType || t('aiWillDetect')}
             </Text>
            <TouchableOpacity
              onPress={() => {
                setCoinSelected(false)
                setExpandedSeries(null)
              }}
              accessibilityLabel={t('changeCoinA11y')}
            >
              <Text style={styles.changeLink}>{t('change')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <Ionicons
              name={CAPTURE_STEP_KEYS[currentStep]?.icon || 'camera'}
              size={18}
              color={COLORS.primary}
            /> {currentStepLabel}
          </Text>

          {photos[currentView] && showPreview ? (
            <View>
              <View style={styles.photoPreview}>
                <Image source={{ uri: photos[currentView]! }} style={styles.previewImage} />
                {analyzingView && (
                  <View style={styles.analyzingOverlay}>
                    <ActivityIndicator color="#ffffff" size="small" />
                    <Text style={styles.analyzingText}>{t('checkingView')}</Text>
                  </View>
                )}
                <View style={styles.previewActions}>
                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      viewWarnings.length > 0 && styles.confirmButtonWarning,
                    ]}
                    onPress={handleConfirmPhoto}
                    accessibilityLabel={t('confirmPhotoA11y')}
                  >
                    <Ionicons
                      name={viewWarnings.length > 0 ? 'warning' : 'checkmark-circle'}
                      size={20}
                      color="#ffffff"
                    />
                    <Text style={styles.confirmText}>{t('confirm')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.retakeButton}
                    onPress={() => handleRetakePhoto(currentView)}
                    accessibilityLabel={t('retakePhotoA11y')}
                  >
                    <Ionicons name="refresh" size={20} color="#ffffff" />
                    <Text style={styles.retakeText}>{t('retake')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {viewWarnings.length > 0 && (
                <View style={styles.viewWarningsCard}>
                  <Text style={styles.viewWarningsTitle}>
                    <Ionicons name="warning" size={16} color="#f59e0b" /> {t('possibleIssue')}
                  </Text>
                  {viewWarnings.map((warning, i) => (
                    <Text key={i} style={styles.viewWarningText}>• {warning}</Text>
                  ))}
                  <Text style={styles.viewWarningHint}>
                    {t('viewHint')}
                  </Text>
                </View>
              )}
            </View>
          ) : photos[currentView] && !showPreview ? (
            <View style={styles.photoPreview}>
              <Image source={{ uri: photos[currentView]! }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.retakeButton}
                onPress={() => handleRetakePhoto(currentView)}
                accessibilityLabel={t('retakePhotoA11y')}
              >
                <Ionicons name="refresh" size={20} color="#ffffff" />
                <Text style={styles.retakeText}>{t('retake')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.captureArea}>
              <View style={styles.capturePlaceholder}>
                <Ionicons name="camera-outline" size={48} color={COLORS.textLight} />
                <Text style={styles.capturePlaceholderText}>
                  {currentView === 'dorsal' && t('steps.dorsal.placeholder')}
                  {currentView === 'ventral' && t('steps.ventral.placeholder')}
                  {currentView === 'carapace-closeup' && t('steps.closeup.placeholder')}
                </Text>
              </View>

              <View style={styles.captureButtons}>
                <Button
                  title={usePicker[currentView] ? t('useLibrary') : t('useCamera')}
                  onPress={() => handleTakePhoto(currentView)}
                  style={styles.takePhotoButton}
                />

                <TouchableOpacity
                  style={styles.switchCaptureButton}
                  onPress={() =>
                    setUsePicker((prev) => ({ ...prev, [currentView]: !prev[currentView] }))
                  }
                  accessibilityLabel={t('switchA11y', { mode: usePicker[currentView] ? t('useCamera').toLowerCase() : t('useLibrary').toLowerCase() })}
                >
                  <Ionicons
                    name={usePicker[currentView] ? 'camera-outline' : 'image-outline'}
                    size={18}
                    color={COLORS.primary}
                  />
                 <Text style={styles.switchCaptureText}>
                     {usePicker[currentView] ? t('useCamera') : t('useLibrary')}
                   </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {photos[currentView] && currentQuality && (
            <QualityGateCard
              t={t}
              assessment={currentQuality}
              override={currentOverride}
              onReasonChange={(value) => setQualityOverrides((prev) => ({
                ...prev,
                [currentView]: {
                  ...prev[currentView],
                  reason: value,
                },
              }))}
              onApproveOverride={() => handleApproveOverride(currentView)}
              onClearOverride={() => handleClearOverride(currentView)}
              onRetake={() => handleRetakePhoto(currentView)}
              allowOverride={isGateOverridable(QUALITY_GATE_MODES.blur) || isGateOverridable(QUALITY_GATE_MODES.brightness)}
            />
          )}

          {analyzingQuality && (
            <Text style={styles.qualityCheckingText}>{t('quality.checking')}</Text>
          )}

         </View>
      </ScrollView>

      <View style={styles.footer}>
        {currentStep > 0 && (
          <Button
             title={t('back')}
             variant="ghost"
             onPress={handleBack}
             style={styles.navButton}
           />
        )}

        {isLastStep ? (
         <Button
              title={t('analyzeWithAI')}
              onPress={handleProceedToAnalysis}
              style={styles.analyzeButton}
              disabled={hasBlockingFailure('dorsal') || hasBlockingFailure('ventral')}
              accessibilityLabel={t('proceedA11y')}
            />
        ) : (
         <Button
              title={photos[currentView] ? t('next') : t('continue')}
              onPress={handleNext}
              style={styles.navButton}
              disabled={currentView !== 'carapace-closeup' && hasBlockingFailure(currentView)}
              accessibilityLabel={photos[currentView] ? t('nextA11y') : t('continueA11y')}
            />
        )}
      </View>

     <Modal
        visible={cameraVisible}
        animationType="slide"
        supportedOrientations={['portrait', 'landscape-left', 'landscape-right']}
        onRequestClose={async () => {
          try {
            await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT)
          } catch { /* ignore */ }
          setCameraVisible(false)
        }}
      >
        <CameraModalContent
          capturingView={capturingView}
          quality={quality}
          capturing={capturing}
          cameraRef={cameraRef}
          panHandlers={panResponder.panHandlers}
          CAPTURE_STEPS={CAPTURE_STEPS}
          currentStepLabel={currentStepLabel}
          t={t}
          handleCaptureFromCamera={handleCaptureFromCamera}
          onClose={async () => {
            try {
              await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT)
            } catch { /* ignore */ }
            setCameraVisible(false)
          }}
        />
      </Modal>
    <PhotoTipsModal visible={showTipsModal} onClose={() => setShowTipsModal(false)} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: FONT['2xl'],
    fontWeight: '700',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 0,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: FONT.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionDescription: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  seriesGroup: {
    marginBottom: 8,
  },
  seriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  seriesTitle: {
    fontSize: FONT.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  seriesOptions: {
    gap: 6,
    marginTop: 6,
    marginLeft: 12,
  },
  coinGrid: {
    gap: 8,
  },
  coinButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  aiDetectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    borderColor: COLORS.accent,
    borderWidth: 2,
    backgroundColor: '#fffbeb',
  },
  aiDetectText: {
    color: COLORS.accent,
    fontWeight: '600',
    fontSize: FONT.lg,
  },
  coinButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  coinButtonText: {
    fontSize: FONT.base,
    color: COLORS.text,
    fontWeight: '500',
  },
  coinButtonTextSelected: {
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  coinInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.successLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  coinInfoText: {
    flex: 1,
    fontSize: FONT.base,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  changeLink: {
    fontSize: FONT.base,
    color: COLORS.primary,
    fontWeight: '600',
  },
  photoPreview: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
  },
  previewActions: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 4,
  },
  confirmText: {
    fontSize: FONT['sm+'],
    color: '#ffffff',
    fontWeight: '600',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 4,
  },
  retakeText: {
    fontSize: FONT['sm+'],
    color: '#ffffff',
    fontWeight: '600',
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  analyzingText: {
    fontSize: FONT['sm+'],
    color: '#ffffff',
    fontWeight: '500',
  },
  confirmButtonWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
  },
  viewWarningsCard: {
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  viewWarningsTitle: {
    fontSize: FONT.base,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewWarningText: {
    fontSize: FONT['sm+'],
    color: '#78350f',
    lineHeight: 18,
  },
  viewWarningHint: {
    fontSize: FONT.sm,
    color: '#a16207',
    marginTop: 6,
    fontStyle: 'italic',
  },
  captureArea: {
    gap: 12,
  },
  capturePlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
  },
  capturePlaceholderText: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 24,
  },
  captureButtons: {
    gap: 8,
  },
  takePhotoButton: {
    marginBottom: 0,
  },
  switchCaptureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
  },
  switchCaptureText: {
    fontSize: FONT.base,
    color: COLORS.primary,
    fontWeight: '500',
  },
  tipsCard: {
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tipsTitle: {
    fontSize: FONT.base,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: FONT['sm+'],
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  viewExamplesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 60, 120, 0.06)',
  },
  viewExamplesText: {
    fontSize: FONT['sm+'],
    color: COLORS.primary,
    fontWeight: '600',
  },
  qualityCheckingText: {
    marginTop: 8,
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  debugText: {
    marginTop: 6,
    fontSize: FONT.xs,
    color: COLORS.textLight,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  navButton: {
    flex: 1,
  },
  analyzeButton: {
    flex: 1,
  },
  cameraScreen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    zIndex: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonLandscapeNative: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  closeButtonLandscapeLeft: {
    left: 14,
  },
  closeButtonLandscapeRight: {
    right: 14,
  },
  cameraTitleCenter: {
    color: '#ffffff',
    fontSize: FONT.base,
    fontWeight: '600',
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  cameraBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  cameraBannerText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: FONT['sm+'],
  },
  cameraModeChip: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    alignSelf: 'center',
    marginHorizontal: 56,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  cameraModeChipText: {
    color: '#ffffff',
    fontSize: FONT.base,
    fontWeight: '600',
  },
  cameraBody: {
    flex: 1,
  },
  cameraPreview: {
    ...StyleSheet.absoluteFillObject,
  },
  cameraFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 10,
    gap: 12,
  },
  cameraFooterLandscape: {
    top: 0,
    bottom: 0,
    width: 88,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  cameraFooterLandscapeRight: {
    right: 10,
    left: undefined,
  },
  cameraFooterLandscapeLeft: {
    left: 10,
    right: undefined,
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonLandscape: {
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  captureButtonDimmed: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
  },
  captureButtonInnerReady: {
    backgroundColor: COLORS.success,
  },
  captureHint: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: FONT['sm+'],
    textAlign: 'center',
  },
})
