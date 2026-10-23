import React, { memo } from 'react'
import {
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { FONT } from '../../utils/fonts'
import { FRAME_RADIUS } from './overlayLayout'
import {
  DIM_COLOR,
  STATUS_COLORS,
  type IoniconName,
} from './overlayStatus'
import type {
  LiveGateStatus,
} from '../../utils/liveFrameQuality'

/* ------------------------------------------------------------------ */
/* LiveChip                                                            */
/* ------------------------------------------------------------------ */

/**
 * A single advisory live-quality chip.
 *
 * The chip is informational and does not independently block capture.
 */
export const LiveChip = memo(function LiveChip({
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
      <View
        style={[
          styles.liveChipDot,
          {
            backgroundColor: color,
          },
        ]}
      />

      <Ionicons
        name={icon}
        size={13}
        color={color}
      />

      <Text
        style={[
          styles.liveChipText,
          {
            color,
          },
        ]}
        maxFontSizeMultiplier={1.5}
      >
        {label}
      </Text>
    </View>
  )
})

/* ------------------------------------------------------------------ */
/* CornerMask                                                          */
/* ------------------------------------------------------------------ */

export type Corner =
  | 'tl'
  | 'tr'
  | 'bl'
  | 'br'

const R = FRAME_RADIUS

const CORNER_POS = {
  tl: {
    mask: {
      top: 0,
      left: 0,
    },
    ring: {
      top: -R,
      left: -R,
    },
  },
  tr: {
    mask: {
      top: 0,
      right: 0,
    },
    ring: {
      top: -R,
      right: -R,
    },
  },
  bl: {
    mask: {
      bottom: 0,
      left: 0,
    },
    ring: {
      bottom: -R,
      left: -R,
    },
  },
  br: {
    mask: {
      bottom: 0,
      right: 0,
    },
    ring: {
      bottom: -R,
      right: -R,
    },
  },
} as const

/**
 * Fills the undimmed sliver between the square dim cutout and the
 * frame's rounded corner.
 */
export function CornerMask({
  corner,
}: {
  corner: Corner
}) {
  const position = CORNER_POS[corner]

  return (
    <View
      style={[
        styles.cornerMask,
        position.mask,
      ]}
    >
      <View
        style={[
          styles.cornerMaskRing,
          position.ring,
        ]}
      />
    </View>
  )
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  /* Live-quality chips */

  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      'rgba(0, 0, 0, 0.7)',
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

  /* Corner masks */

  cornerMask: {
    position: 'absolute',
    width: FRAME_RADIUS,
    height: FRAME_RADIUS,
    overflow: 'hidden',
  },

  cornerMaskRing: {
    position: 'absolute',
    width: FRAME_RADIUS * 4,
    height: FRAME_RADIUS * 4,
    borderRadius: FRAME_RADIUS * 2,
    borderWidth: FRAME_RADIUS,
    borderColor: DIM_COLOR,
  },
})
