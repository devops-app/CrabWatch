import React, { useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../../utils/constants'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')
const FRAME_WIDTH = SCREEN_WIDTH * 0.72
const FRAME_HEIGHT = FRAME_WIDTH * 0.75
const CORNER_LENGTH = 40
const CORNER_THICKNESS = 4

interface CaptureFrameOverlayProps {
  viewType: 'dorsal' | 'ventral' | 'carapace-closeup'
  isReady: boolean
  shakeLevel: 'none' | 'slight' | 'heavy'
  brightnessLevel: 'dark' | 'low' | 'good' | 'bright'
  isFocused: boolean
  messages: string[]
}

export function CaptureFrameOverlay({
  viewType,
  isReady,
  shakeLevel,
  brightnessLevel,
  isFocused,
  messages,
}: CaptureFrameOverlayProps) {
  const cornerAnim = useState(new Animated.Value(0))[0]
  const [pulseKey, setPulseKey] = useState(0)

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
          title: 'Dorsal View',
          hint: 'Center crab + coin in the frame',
        }
      case 'ventral':
        return {
          icon: 'swap-horizontal-outline',
          title: 'Ventral View',
          hint: 'Show the underside clearly',
        }
      case 'carapace-closeup':
        return {
          icon: 'expand-outline',
          title: 'Shell Close-up',
          hint: 'Zoom in on shell pattern',
        }
    }
  }

  const instructions = getInstructions()

  return (
    <View style={styles.overlay} pointerEvents="none">
      {/* Top instruction bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarRow}>
          <Ionicons name={instructions.icon as any} size={22} color={COLORS.primaryLight} />
          <Text style={styles.topBarTitle}>{instructions.title}</Text>
        </View>
        <Text style={styles.topBarHint}>{instructions.hint}</Text>
      </View>

      {/* Frame area */}
      <View style={styles.frameContainer}>
        {/* Semi-transparent outside area */}
        <View style={styles.topDim} />
        <View style={styles.bottomDim} />
        <View style={styles.leftDim} />
        <View style={styles.rightDim} />

        {/* Frame border */}
        <View style={[styles.frameBorder, { borderColor }]}>
          {/* Corners */}
          <Animated.View
            style={[
              styles.corner,
              styles.cornerTL,
              {
                borderTopColor: cornerColor,
                borderLeftColor: cornerColor,
                opacity: cornerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.corner,
              styles.cornerTR,
              {
                borderTopColor: cornerColor,
                borderRightColor: cornerColor,
                opacity: cornerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.corner,
              styles.cornerBL,
              {
                borderBottomColor: cornerColor,
                borderLeftColor: cornerColor,
                opacity: cornerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.corner,
              styles.cornerBR,
              {
                borderBottomColor: cornerColor,
                borderRightColor: cornerColor,
                opacity: cornerAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 1],
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

          {/* Coin zone indicator — bottom center of frame */}
          {viewType !== 'carapace-closeup' && (
            <View style={styles.coinZone}>
              <Ionicons name="pricetag-outline" size={18} color="rgba(255,255,255,0.7)" />
            </View>
          )}
        </View>
      </View>

      {/* Bottom quality warnings */}
      {messages.length > 0 && (
        <View style={styles.warningsContainer} key={pulseKey}>
          {messages.map((msg, i) => {
            const isWarning = msg.includes('Hold') || msg.includes('steadier') || msg.includes('movement')
            const isDark = msg.includes('dark')
            const isLow = msg.includes('low')
            const iconColor = isWarning ? '#f59e0b' : isDark || isLow ? '#f97316' : COLORS.success
            const iconName = isWarning
              ? 'warning'
              : isDark
              ? 'moon'
              : isLow
              ? 'partly-sunny'
              : 'checkmark-circle'

            return (
              <View key={i} style={styles.warningChip}>
                <Ionicons name={iconName as any} size={14} color={iconColor} />
                <Text style={styles.warningText}>{msg}</Text>
              </View>
            )
          })}
        </View>
      )}

      {/* Readiness indicator */}
      <View
        style={[
          styles.readinessIndicator,
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
          {isReady ? 'Ready' : shakeLevel === 'heavy' ? 'Hold Still' : 'Align'}
        </Text>
      </View>

  
    </View>
  )
}

const FRAME_TOP = SCREEN_HEIGHT * 0.15
const FRAME_LEFT = (SCREEN_WIDTH - FRAME_WIDTH) / 2

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    position: 'absolute',
    top: FRAME_TOP - 72,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  topBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  topBarHint: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  
  frameContainer: {
    position: 'absolute',
    top: FRAME_TOP,
    left: FRAME_LEFT,
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
  },
  topDim: {
    position: 'absolute',
    top: -FRAME_TOP,
    left: -FRAME_LEFT,
    right: -FRAME_LEFT,
    height: FRAME_TOP,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  bottomDim: {
    position: 'absolute',
    bottom: -SCREEN_HEIGHT + FRAME_TOP + FRAME_HEIGHT,
    left: -FRAME_LEFT,
    right: -FRAME_LEFT,
    height: SCREEN_HEIGHT - FRAME_TOP - FRAME_HEIGHT,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  leftDim: {
    position: 'absolute',
    top: 0,
    left: -FRAME_LEFT,
    width: FRAME_LEFT,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  rightDim: {
    position: 'absolute',
    top: 0,
    right: -FRAME_LEFT,
    width: FRAME_LEFT,
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  frameBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(125, 211, 252, 0.35)',
  },
  corner: {
    position: 'absolute',
    width: CORNER_LENGTH,
    height: CORNER_LENGTH,
  },
  cornerTL: {
    top: -2,
    left: -2,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerTR: {
    top: -2,
    right: -2,
    borderTopWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
  },
  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: CORNER_THICKNESS,
    borderLeftWidth: CORNER_THICKNESS,
  },
  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: CORNER_THICKNESS,
    borderRightWidth: CORNER_THICKNESS,
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
    fontSize: 12,
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
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  
})
