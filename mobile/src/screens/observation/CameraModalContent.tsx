import React, { useEffect, useMemo, useState } from 'react'
import {
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  Camera,
  useCameraDevice,
  usePhotoOutput,
} from 'react-native-vision-camera'
import type { CameraRef } from 'react-native-vision-camera'
import * as ScreenOrientation from 'expo-screen-orientation'
import type { TOptions } from 'i18next'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import { CaptureFrameOverlay } from '../../components/observation/CaptureFrameOverlay'
import type { CaptureQuality } from '../../hooks/useCaptureAssistance'
import { useLiveFrameQuality } from '../../hooks/useLiveFrameQuality'
import type { LiveFrameQuality } from '../../utils/liveFrameQuality'
import type { PhotoView } from '@crabwatch/shared'

/* ------------------------------------------------------------------ */
/* CameraOverlay                                                       */
/* ------------------------------------------------------------------ */

export function CameraOverlay({
  capturingView,
  quality,
  liveQuality,
  dimensions,
  orientation,
}: {
  capturingView: PhotoView
  quality: CaptureQuality
  liveQuality: LiveFrameQuality | null
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
      liveQuality={liveQuality}
      dimensions={dimensions}
      orientation={orientation}
    />
  )
}

/* ------------------------------------------------------------------ */
/* CameraModalContent                                                  */
/* ------------------------------------------------------------------ */

export function CameraModalContent({
  capturingView,
  quality,
  liveQuality,
  capturing,
  cameraRef,
  device,
  photoOutput,
  frameOutput,
  cameraActive,
  panHandlers,
  CAPTURE_STEPS,
  currentStepLabel,
  t,
  handleCaptureFromCamera,
  onClose,
}: {
  capturingView: PhotoView
  quality: CaptureQuality
  liveQuality: LiveFrameQuality | null
  capturing: boolean
  cameraRef: React.RefObject<CameraRef | null>
  device: ReturnType<typeof useCameraDevice>
  photoOutput: ReturnType<typeof usePhotoOutput>
  frameOutput: ReturnType<typeof useLiveFrameQuality>['frameOutput']
  cameraActive: boolean
  panHandlers: ReturnType<typeof PanResponder.create>['panHandlers']
  CAPTURE_STEPS: { key: PhotoView; icon: string; label: string }[]
  currentStepLabel: string
  t: (key: string, options?: TOptions) => string
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

  // Memoize the outputs array so its identity is stable across the ~3 Hz
  // live-quality re-renders. A fresh array literal on every render defeats
  // <Camera>'s React.memo and re-triggers VisionCamera's orientation effect,
  // which re-applies outputOrientation to the preview and causes flicker.
  const cameraOutputs = useMemo(() => [frameOutput, photoOutput], [frameOutput, photoOutput])

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
        {device ? (
          <Camera
            ref={cameraRef}
            style={styles.cameraPreview}
            device={device}
            outputs={cameraOutputs}
            isActive={cameraActive}
            orientationSource="interface"
            mirrorMode="off"
          />
        ) : (
          <View style={styles.cameraPreview} />
        )}
        <CameraOverlay
          capturingView={capturingView}
          quality={quality}
          liveQuality={liveQuality}
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

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
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
