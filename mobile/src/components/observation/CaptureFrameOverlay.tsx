import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Animated, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
type IoniconName = keyof typeof Ionicons.glyphMap
import { useTranslation } from 'react-i18next'
import * as ScreenOrientation from 'expo-screen-orientation'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import type { CaptureMessageKey } from '../../hooks/useCaptureAssistance'
import type { LiveFrameQuality, LiveGateStatus } from '../../utils/liveFrameQuality'

const CRAB_OUTLINE = require('../../../assets/images/crab-outline.png')

/** National-ID style status palette. */
const STATUS_COLORS = {
  pass: '#22c55e',
  warn: '#f59e0b',
  fail: '#ef4444',
} as const

/**
 * A single advisory live-quality chip (blur / brightness / framing).
 * Tinted green / amber / red by its status. Purely informational — it never
 * blocks capture.
 */
function LiveChip({
  icon,
  label,
  status,
}: {
  icon: IoniconName
  label: string
  status: LiveGateStatus
}) {
  const color = STATUS_COLORS[status]
  return (
    <View style={styles.liveChip}>
      <View style={[styles.liveChipDot, { backgroundColor: color }]} />
      <Ionicons name={icon} size={13} color={color} />
      <Text style={[styles.liveChipText, { color }]}>{label}</Text>
    </View>
  )
}

interface CaptureFrameOverlayProps {
  viewType: 'dorsal' | 'ventral' | 'carapace-closeup'
  isReady: boolean
  shakeLevel: 'none' | 'slight' | 'heavy'
  isFocused: boolean
  messages: CaptureMessageKey[]
  liveQuality: LiveFrameQuality | null
  dimensions: { width: number; height: number }
  orientation: ScreenOrientation.Orientation
}

export function CaptureFrameOverlay({
  viewType,
  isReady,
  shakeLevel,
  isFocused,
  messages,
  liveQuality,
  dimensions,
  orientation,
}: CaptureFrameOverlayProps) {
  const { t } = useTranslation('capture')
  const cornerAnim = useState(new Animated.Value(0))[0]
  const [pulseKey, setPulseKey] = useState(0)
  const isLandscapeOrientation =
    orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT
    || orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT
  const shouldSwapDimensions = isLandscapeOrientation && dimensions.height > dimensions.width
  const screenWidth = shouldSwapDimensions ? dimensions.height : dimensions.width
  const screenHeight = shouldSwapDimensions ? dimensions.width : dimensions.height

  const isLandscape = screenWidth > screenHeight
  const frameWidth = isLandscape
    ? Math.min(screenWidth * 0.78, screenHeight * 1.02)
    : Math.min(screenWidth * 0.9, screenHeight * 1.0)
  const frameHeight = frameWidth * 0.75
  const frameTop = Math.max((screenHeight - frameHeight) / 2 - 20, 60)
  const frameLeft = Math.max((screenWidth - frameWidth) / 2, 0)
  const bottomDimHeight = Math.max(screenHeight - frameTop - frameHeight, 0)
  const topBarTop = Math.max(frameTop - 72, 12)

  useEffect(() => {
    if (isReady) {
      Animated.sequence([
        Animated.timing(cornerAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start()
    } else {
      Animated.sequence([
        Animated.timing(cornerAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start()
    }
  }, [isReady, cornerAnim])

  useEffect(() => {
    if (shakeLevel === 'heavy') {
      setPulseKey((k) => k + 1)
    }
  }, [shakeLevel])

  // National-ID style: the frame glow + corner brackets are driven by the
  // live frame quality (advisory). A hard shake overrides to red. When no live
  // sample is available yet (camera warming up), fall back to the neutral
  // "align" state.
  const liveStatus: LiveGateStatus | null = liveQuality?.overallStatus ?? null
  const effectiveStatus: LiveGateStatus =
    shakeLevel === 'heavy' ? 'fail' : liveStatus ?? 'warn'
  const cornerColor = STATUS_COLORS[effectiveStatus]
  const borderColor =
    effectiveStatus === 'pass'
      ? 'rgba(34,197,94,0.55)'
      : effectiveStatus === 'warn'
      ? 'rgba(245,158,11,0.5)'
      : 'rgba(239,68,68,0.5)'

  const getInstructions = () => {
    switch (viewType) {
      case 'dorsal':
        return {
          icon: 'eye-outline',
          title: t('steps.dorsal.label'),
          hint: t('overlayHints.dorsal'),
        }
      case 'ventral':
        return {
          icon: 'swap-horizontal-outline',
          title: t('steps.ventral.label'),
          hint: t('overlayHints.ventral'),
        }
      case 'carapace-closeup':
        return {
          icon: 'expand-outline',
          title: t('steps.closeup.label'),
          hint: t('overlayHints.closeup'),
        }
    }
  }

  const instructions = getInstructions()

  return (
    <View style={styles.overlay} pointerEvents="none">
     {/* Top instruction bar */}
      <View
        style={[
          styles.topBar,
          { top: topBarTop },
          isLandscape && styles.topBarLandscape,
        ]}
      >
        <View style={styles.topBarRow}>
          <Ionicons name={instructions.icon as IoniconName} size={22} color={COLORS.primaryLight} />
          <Text style={[styles.topBarTitle, isLandscape && styles.topBarTitleLandscape]}>{instructions.title}</Text>
        </View>
        {!isLandscape && <Text style={styles.topBarHint}>{instructions.hint}</Text>}
      </View>

      {/* Frame area with crab silhouette */}
      <View style={[styles.frameContainer, { top: frameTop, left: frameLeft, width: frameWidth, height: frameHeight }]}>
        {/* Semi-transparent outside area */}
        <View style={[styles.topDim, { top: -frameTop, left: -frameLeft, right: -frameLeft, height: frameTop }]} />
        <View
          style={[
            styles.bottomDim,
            {
              bottom: -bottomDimHeight,
              left: -frameLeft,
              right: -frameLeft,
              height: bottomDimHeight,
            },
          ]}
        />
        <View style={[styles.leftDim, { left: -frameLeft, width: frameLeft }]} />
        <View style={[styles.rightDim, { right: -frameLeft, width: frameLeft }]} />

        {/* National-ID style frame border + corner brackets, tinted by status */}
        <View style={[styles.frameBorder, { borderColor }]} />
        <View style={[styles.corner, styles.cornerTL, { borderColor: cornerColor }]} />
        <View style={[styles.corner, styles.cornerTR, { borderColor: cornerColor }]} />
        <View style={[styles.corner, styles.cornerBL, { borderColor: cornerColor }]} />
        <View style={[styles.corner, styles.cornerBR, { borderColor: cornerColor }]} />

        {/* Crab silhouette — user-provided outline, tinted by live status */}
        <Animated.Image
          source={CRAB_OUTLINE}
          resizeMode="contain"
          style={[
            styles.crabOutline,
            {
              transform: [{ scale: isLandscape ? 1.08 : 1 }],
              opacity: cornerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.45, 0.95],
              }),
            },
          ]}
        />

        {/* Center crosshair */}
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />

        {/* Focus indicator */}
        {isFocused && (
          <View style={styles.focusRing}>
            <Ionicons name="checkmark" size={16} color={COLORS.success} />
          </View>
        )}

        {/* Coin zone indicator */}
        {viewType !== 'carapace-closeup' && (
          <View style={styles.coinZone}>
            <Ionicons name="pricetag-outline" size={18} color="rgba(255,255,255,0.7)" />
          </View>
        )}
      </View>

      {/* Live quality chips (advisory) — blur / brightness / framing */}
      {liveQuality && (
        <View
          style={[
            styles.liveChips,
            { top: frameTop + frameHeight + 12 },
            isLandscape && styles.liveChipsLandscape,
          ]}
        >
          <LiveChip
            icon="scan-outline"
            label={t('live.blur')}
            status={liveQuality.blurStatus}
          />
          <LiveChip
            icon={
              liveQuality.brightness < 0.4
                ? 'moon-outline'
                : liveQuality.brightness > 0.8
                ? 'sunny-outline'
                : 'partly-sunny-outline'
            }
            label={t('live.brightness')}
            status={liveQuality.brightnessStatus}
          />
          <LiveChip
            icon="crop-outline"
            label={t('live.framing')}
            status={liveQuality.framingStatus}
          />
        </View>
      )}

     {/* Bottom quality warnings */}
       {messages.length > 0 && (
        <View
          style={[
            styles.warningsContainer,
            isLandscape && styles.warningsContainerLandscape,
          ]}
          key={pulseKey}
        >
          {messages.map((msg, i) => {
            const isWarning = msg === 'holdStill' || msg === 'holdSteadier'
            const isDark = msg === 'lightingTooDark'
            const isLow = msg === 'lightingLow'
            const isBright = msg === 'lightingTooBright'
            const iconColor = isWarning ? '#f59e0b' : isDark || isLow || isBright ? '#f97316' : COLORS.success
            const iconName = isWarning
              ? 'warning'
              : isDark
              ? 'moon'
              : isLow
              ? 'partly-sunny'
              : isBright
              ? 'sunny'
              : 'checkmark-circle'

            return (
              <View key={i} style={styles.warningChip}>
                <Ionicons name={iconName as IoniconName} size={14} color={iconColor} />
                <Text style={styles.warningText}>{t(`assistMessages.${msg}`)}</Text>
              </View>
            )
          })}
        </View>
      )}

    {/* Readiness indicator */}
       <View
          style={[
            styles.readinessIndicator,
            isLandscape && styles.readinessIndicatorLandscape,
            {
              backgroundColor: isReady
                ? 'rgba(34, 197, 94, 0.85)'
               : shakeLevel === 'heavy'
               ? 'rgba(239, 68, 68, 0.85)'
               : 'rgba(245, 158, 11, 0.85)',
           },
         ]}
       >
        <Ionicons
          name={isReady ? 'checkmark-circle' : shakeLevel === 'heavy' ? 'close-circle' : 'time'}
          size={18}
          color="#ffffff"
        />
        <Text style={styles.readinessText}>
          {isReady ? t('overlayStatus.ready') : shakeLevel === 'heavy' ? t('overlayStatus.holdStill') : t('overlayStatus.align')}
        </Text>
      </View>

  
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
    borderRadius: 14,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarTitle: {
    fontSize: FONT.xl,
    fontWeight: '700',
    color: '#ffffff',
  },
  topBarHint: {
    fontSize: FONT.sm,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  
  frameContainer: {
    position: 'absolute',
  },
  topDim: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  bottomDim: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  leftDim: {
    position: 'absolute',
    top: 0,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  rightDim: {
    position: 'absolute',
    top: 0,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  /* Crab silhouette — user-provided outline image, centered in the frame */
  crabOutline: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  /* National-ID style frame border */
  frameBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderRadius: 18,
  },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderWidth: 3,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopLeftRadius: 18,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopRightRadius: 18,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomLeftRadius: 18,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomRightRadius: 18,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  /* Live quality chips row */
  liveChips: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
  },
  liveChipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveChipText: {
    fontSize: FONT.xs,
    fontWeight: '600',
  },
  crosshairH: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  crosshairV: {
    position: 'absolute',
    left: '50%',
    top: 10,
    bottom: 10,
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  focusRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -14,
    marginTop: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.success,
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinZone: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    width: 44,
    height: 44,
    marginLeft: -22,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  warningsContainer: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    alignItems: 'center',
    gap: 6,
  },
  warningChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  warningText: {
    fontSize: FONT.sm,
    color: '#ffffff',
    fontWeight: '500',
  },
  readinessIndicator: {
    position: 'absolute',
    bottom: 30,
    left: '50%',
    marginLeft: -50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  readinessText: {
    fontSize: FONT['sm+'],
    color: '#ffffff',
    fontWeight: '600',
  },
  topBarLandscape: {
    left: 20,
    right: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  topBarTitleLandscape: {
    fontSize: FONT.lg,
  },
  liveChipsLandscape: {
    left: 20,
    right: 20,
  },
  warningsContainerLandscape: {
    bottom: 80,
  },
  readinessIndicatorLandscape: {
    bottom: 20,
  },
  
})
