import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
type IoniconName = keyof typeof Ionicons.glyphMap
import { useTranslation } from 'react-i18next'
import * as ScreenOrientation from 'expo-screen-orientation'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import type { CaptureMessageKey } from '../../hooks/useCaptureAssistance'



interface CaptureFrameOverlayProps {
  viewType: 'dorsal' | 'ventral' | 'carapace-closeup'
  isReady: boolean
  shakeLevel: 'none' | 'slight' | 'heavy'
  isFocused: boolean
  messages: CaptureMessageKey[]
  dimensions: { width: number; height: number }
  orientation: ScreenOrientation.Orientation
}

export function CaptureFrameOverlay({
  viewType,
  isReady,
  shakeLevel,
  isFocused,
  messages,
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

  const cornerColor = isReady ? COLORS.success : shakeLevel === 'heavy' ? '#ef4444' : COLORS.primaryLight
  const borderColor = isReady ? COLORS.success : shakeLevel === 'heavy' ? 'rgba(239,68,68,0.4)' : 'rgba(125,211,252,0.35)'

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

        {/* Crab silhouette outline */}
        <Animated.View
          style={[
            styles.crabOutline,
            {
              transform: [{ scale: isLandscape ? 1.08 : 1 }],
              opacity: cornerAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1],
              }),
            },
          ]}
        >
          {/* Carapace (body) */}
          <View style={[styles.carapace, { borderColor }]}>
            <Animated.View style={[styles.carapaceGlow, { borderColor: cornerColor }]} />
          </View>

          {/* Left claw */}
          <View style={[styles.clawLeft, { borderColor }]}>
            <Animated.View style={[styles.clawTipLeft, { borderColor: cornerColor }]} />
          </View>

          {/* Right claw */}
          <View style={[styles.clawRight, { borderColor }]}>
            <Animated.View style={[styles.clawTipRight, { borderColor: cornerColor }]} />
          </View>

          {/* Left legs */}
          <View style={[styles.leg, styles.legL1, { borderColor }]} />
          <View style={[styles.leg, styles.legL2, { borderColor }]} />
          <View style={[styles.leg, styles.legL3, { borderColor }]} />

          {/* Right legs */}
          <View style={[styles.leg, styles.legR1, { borderColor }]} />
          <View style={[styles.leg, styles.legR2, { borderColor }]} />
          <View style={[styles.leg, styles.legR3, { borderColor }]} />

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
        </Animated.View>
      </View>

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
  /* Crab silhouette outline */
  crabOutline: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  carapace: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    top: '18%',
    bottom: '18%',
    borderWidth: 2.5,
    borderRadius: 100,
  },
  carapaceGlow: {
    position: 'absolute',
    left: 3,
    right: 3,
    top: 3,
    bottom: 3,
    borderWidth: 1,
    borderRadius: 100,
    opacity: 0.3,
  },
  clawLeft: {
    position: 'absolute',
    left: 0,
    top: '28%',
    width: '14%',
    height: '22%',
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderRadius: 12,
    transform: [{ rotate: '-20deg' }],
  },
  clawTipLeft: {
    position: 'absolute',
    right: -8,
    top: -4,
    width: 16,
    height: '100%',
    borderWidth: 2.5,
    borderRightWidth: 0,
    borderRadius: 8,
    opacity: 0.6,
  },
  clawRight: {
    position: 'absolute',
    right: 0,
    top: '28%',
    width: '14%',
    height: '22%',
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderRadius: 12,
    transform: [{ rotate: '20deg' }],
  },
  clawTipRight: {
    position: 'absolute',
    left: -8,
    top: -4,
    width: 16,
    height: '100%',
    borderWidth: 2.5,
    borderLeftWidth: 0,
    borderRadius: 8,
    opacity: 0.6,
  },
  leg: {
    position: 'absolute',
    width: '10%',
    height: 2,
    borderBottomWidth: 2.5,
    borderRadius: 2,
  },
  legL1: { left: 0, top: '38%', transform: [{ rotate: '30deg' }] },
  legL2: { left: 0, top: '50%', transform: [{ rotate: '15deg' }] },
  legL3: { left: 0, top: '62%', transform: [{ rotate: '0deg' }] },
  legR1: { right: 0, top: '38%', transform: [{ rotate: '-30deg' }] },
  legR2: { right: 0, top: '50%', transform: [{ rotate: '-15deg' }] },
  legR3: { right: 0, top: '62%', transform: [{ rotate: '0deg' }] },
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
  warningsContainerLandscape: {
    bottom: 80,
  },
  readinessIndicatorLandscape: {
    bottom: 20,
  },
  
})
