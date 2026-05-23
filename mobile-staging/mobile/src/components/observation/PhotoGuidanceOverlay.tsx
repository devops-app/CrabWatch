import React from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const GUIDE_SIZE = SCREEN_WIDTH * 0.7
const COIN_ZONE_SIZE = 60

interface PhotoGuidanceOverlayProps {
  viewType: 'dorsal' | 'ventral' | 'carapace-closeup'
  coinSelected: boolean
  onCoinTap?: () => void
}

export function PhotoGuidanceOverlay({ viewType, coinSelected, onCoinTap }: PhotoGuidanceOverlayProps) {
  const getViewInstructions = () => {
    switch (viewType) {
      case 'dorsal':
        return {
          title: 'Dorsal View (Top)',
          steps: [
            'Place crab on flat surface, shell facing up',
            'Position coin beside the crab',
            'Hold phone directly above crab',
            'Keep crab centered in frame',
          ],
        }
      case 'ventral':
        return {
          title: 'Ventral View (Underside)',
          steps: [
            'Gently flip crab onto its back',
            'Keep coin in same position',
            'Photograph the underside',
            'Look for abdomen shape (gender ID)',
          ],
        }
      case 'carapace-closeup':
        return {
          title: 'Shell Close-up',
          steps: [
            'Zoom in on the carapace (shell)',
            'Focus on shell pattern & texture',
            'Good lighting helps species ID',
            'Coin not required for this shot',
          ],
        }
    }
  }

  const instructions = getViewInstructions()

  return (
    <View style={styles.overlay}>
      <View style={styles.instructionsPanel}>
        <Text style={styles.instructionsTitle}>{instructions.title}</Text>
        {instructions.steps.map((step, i) => (
          <Text key={i} style={styles.instructionText}>
            {i + 1}. {step}
          </Text>
        ))}
      </View>

      <View style={styles.frameGuide}>
        <View style={styles.cornerTopLeft} />
        <View style={styles.cornerTopRight} />
        <View style={styles.cornerBottomLeft} />
        <View style={styles.cornerBottomRight} />

        <View style={styles.centerLineHorizontal} />
        <View style={styles.centerLineVertical} />

        {(viewType === 'dorsal' || viewType === 'ventral') && (
          <View
            style={[
              styles.coinZone,
              coinSelected ? styles.coinZoneFilled : styles.coinZoneEmpty,
            ]}
          >
            <Ionicons
              name={coinSelected ? 'checkmark-circle' : 'help-circle-outline'}
              size={24}
              color={coinSelected ? COLORS.success : COLORS.warning}
            />
            <Text style={styles.coinZoneText}>
              {coinSelected ? 'Coin ✓' : 'Coin here'}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.tipsRow}>
          <View style={styles.tipItem}>
            <Ionicons name="flash" size={16} color={COLORS.accent} />
            <Text style={styles.tipText}>Good light</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="resize" size={16} color={COLORS.primary} />
            <Text style={styles.tipText}>Hold steady</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="eye" size={16} color={COLORS.secondary} />
            <Text style={styles.tipText}>Fill frame</Text>
          </View>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'none',
  },
  instructionsPanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 0,
    marginTop: 40,
    marginHorizontal: 16,
  },
  instructionsTitle: {
    fontSize: FONT.lg,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  instructionText: {
    fontSize: FONT['sm+'],
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 18,
  },
  frameGuide: {
    position: 'absolute',
    width: GUIDE_SIZE,
    height: GUIDE_SIZE,
    top: '35%',
    left: (SCREEN_WIDTH - GUIDE_SIZE) / 2,
    marginTop: -(GUIDE_SIZE / 2),
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: COLORS.primaryLight,
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: COLORS.primaryLight,
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: COLORS.primaryLight,
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: COLORS.primaryLight,
  },
  centerLineHorizontal: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: 'rgba(125, 211, 252, 0.3)',
  },
  centerLineVertical: {
    position: 'absolute',
    left: '50%',
    top: 10,
    bottom: 10,
    width: 1,
    backgroundColor: 'rgba(125, 211, 252, 0.3)',
  },
  coinZone: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: COIN_ZONE_SIZE,
    height: COIN_ZONE_SIZE,
    borderRadius: COIN_ZONE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  coinZoneFilled: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: COLORS.success,
  },
  coinZoneEmpty: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: COLORS.warning,
  },
  coinZoneText: {
    fontSize: FONT['3xs'],
    color: '#ffffff',
    marginTop: 2,
    fontWeight: '600',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tipsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  tipText: {
    fontSize: FONT.sm,
    color: '#ffffff',
    marginLeft: 4,
  },
})
