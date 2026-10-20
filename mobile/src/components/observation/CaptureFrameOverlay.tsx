import React, {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  AccessibilityInfo,
  Animated,
  Platform,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import * as ScreenOrientation from 'expo-screen-orientation'

import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import type { CaptureMessageKey } from '../../hooks/useCaptureAssistance'
import type {
  BrightnessCondition,
  LiveFrameQuality,
  LiveGateStatus,
} from '../../utils/liveFrameQuality'

type IoniconName = keyof typeof Ionicons.glyphMap

type ViewType =
  | 'dorsal'
  | 'ventral'
  | 'carapace-closeup'

export type ShakeLevel =
  | 'none'
  | 'slight'
  | 'heavy'

const CRAB_OUTLINE = require('../../../assets/images/crab-outline.png')

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

/** National-ID style status palette. */
const STATUS_COLORS = {
  pass: '#22c55e',
  warn: '#f59e0b',
  fail: '#ef4444',
} as const

/** Softer translucent variants used for the frame border. */
const STATUS_COLORS_SOFT = {
  pass: 'rgba(34,197,94,0.55)',
  warn: 'rgba(245,158,11,0.5)',
  fail: 'rgba(239,68,68,0.5)',
} as const

/** Neutral grey used before the first live sample is available. */
const NEUTRAL_COLOR = '#9ca3af'
const NEUTRAL_COLOR_SOFT = 'rgba(156,163,175,0.5)'

/** Readiness pill backgrounds using the same status model as the frame. */
const PILL_COLORS = {
  pass: 'rgba(34, 197, 94, 0.85)',
  warn: 'rgba(245, 158, 11, 0.85)',
  fail: 'rgba(239, 68, 68, 0.85)',
  neutral: 'rgba(107, 114, 128, 0.85)',
} as const

const LIGHTING_COLOR = '#f97316'
const DIM_COLOR = 'rgba(0, 0, 0, 0.45)'

/* ------------------------------------------------------------------ */
/* Layout constants                                                    */
/* ------------------------------------------------------------------ */

const FRAME_ASPECT = 0.75
const FRAME_RADIUS = 18

/** Reserved space for the camera screen's header or step title. */
const HEADER_RESERVE = 60

/** Portrait hint-bar height plus the gap above the frame. */
const HINT_BAR_SPACE = 72

/** Portrait readiness-pill distance from the bottom. */
const PILL_BOTTOM = 30

/** Reserved portrait space for quality chips, warnings, and status pill. */
const STACK_MIN_HEIGHT = 120

/** Width of the landscape hint and status column. */
const SIDE_PANEL_WIDTH = 220

/** Full-height strip reserved for landscape camera controls. */
const SIDE_CONTROL_RESERVE = 108

const EDGE = 16

const MAX_VISIBLE_WARNINGS = 2
const READY_ANNOUNCEMENT_DELAY_MS = 500

/* ------------------------------------------------------------------ */
/* Typed configuration maps                                            */
/* ------------------------------------------------------------------ */

const VIEW_CONFIG = {
  dorsal: {
    icon: 'eye-outline',
    hintKey: 'overlayHints.dorsal',
  },
  ventral: {
    icon: 'swap-horizontal-outline',
    hintKey: 'overlayHints.ventral',
  },
  'carapace-closeup': {
    icon: 'expand-outline',
    hintKey: 'overlayHints.closeup',
  },
} as const satisfies Record<
  ViewType,
  {
    icon: IoniconName
    hintKey: string
  }
>

type MessageStyle = {
  icon: IoniconName
  color: string
}

/**
 * Icon and colour for each capture-assistance message.
 *
 * Unknown keys intentionally use a neutral information icon instead of
 * displaying a potentially misleading success indicator.
 */
const MESSAGE_STYLE: Partial<
  Record<CaptureMessageKey, MessageStyle>
> = {
  holdStill: {
    icon: 'warning',
    color: STATUS_COLORS.warn,
  },
  holdSteadier: {
    icon: 'warning',
    color: STATUS_COLORS.warn,
  },
  lightingTooDark: {
    icon: 'moon',
    color: LIGHTING_COLOR,
  },
  lightingLow: {
    icon: 'partly-sunny',
    color: LIGHTING_COLOR,
  },
  lightingTooBright: {
    icon: 'sunny',
    color: LIGHTING_COLOR,
  },
}

const DEFAULT_MESSAGE_STYLE: MessageStyle = {
  icon: 'information-circle',
  color: '#ffffff',
}

/**
 * Brightness thresholds remain owned by liveFrameQuality.
 * The overlay maps only the semantic brightness condition to an icon.
 */
const BRIGHTNESS_ICONS = {
  dark: 'moon-outline',
  normal: 'partly-sunny-outline',
  bright: 'sunny-outline',
} as const satisfies Record<
  BrightnessCondition,
  IoniconName
>

/* ------------------------------------------------------------------ */
/* Component types                                                     */
/* ------------------------------------------------------------------ */

interface CaptureFrameOverlayProps {
  viewType: ViewType
  isReady: boolean
  shakeLevel: ShakeLevel
  isFocused: boolean
  messages: CaptureMessageKey[]
  liveQuality: LiveFrameQuality | null

  /** Fallback size used only until the overlay measures itself. */
  dimensions: {
    width: number
    height: number
  }

  orientation: ScreenOrientation.Orientation
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

type OverlayLayout = {
  isLandscape: boolean
  frameWidth: number
  frameHeight: number
  frameLeft: number
  frameTop: number
  panel: {
    left: number
    width: number
    top: number
    bottom: number
  } | null
}

/**
 * Portrait:
 * - Hint above the frame.
 * - Quality chips, warnings, and readiness pill below the frame.
 * - Frame is sized so the reserved status stack fits.
 *
 * Landscape:
 * - One edge is reserved for full-height camera controls.
 * - The status panel occupies the opposite edge.
 * - The frame is centred in the remaining gap.
 */
function computeLayout(
  width: number,
  height: number,
  controlsOnLeft: boolean,
): OverlayLayout {
  if (width > height) {
    const panelWidth = Math.min(
      SIDE_PANEL_WIDTH,
      width * 0.3,
    )

    const regionTop = HEADER_RESERVE

    const controlLeft = controlsOnLeft
      ? 0
      : width - SIDE_CONTROL_RESERVE

    const controlRight =
      controlLeft + SIDE_CONTROL_RESERVE

    const panelLeft = controlsOnLeft
      ? width - EDGE - panelWidth
      : EDGE

    const panelRight =
      panelLeft + panelWidth

    const gapLeft = controlsOnLeft
      ? controlRight
      : panelRight

    const gapRight = controlsOnLeft
      ? panelLeft
      : controlLeft

    const availableWidth = Math.max(
      gapRight - gapLeft - EDGE * 2,
      0,
    )

    const availableHeight = Math.max(
      height - EDGE - regionTop,
      0,
    )

    const frameWidth = Math.min(
      availableWidth,
      availableHeight / FRAME_ASPECT,
    )

    const frameHeight =
      frameWidth * FRAME_ASPECT

    return {
      isLandscape: true,
      frameWidth,
      frameHeight,
      frameLeft:
        gapLeft +
        EDGE +
        (availableWidth - frameWidth) / 2,
      frameTop:
        regionTop +
        (availableHeight - frameHeight) / 2,
      panel: {
        left: panelLeft,
        width: panelWidth,
        top: regionTop,
        bottom: EDGE,
      },
    }
  }

  const regionTop =
    HEADER_RESERVE + HINT_BAR_SPACE

  const regionBottom =
    height -
    PILL_BOTTOM -
    STACK_MIN_HEIGHT

  const availableHeight = Math.max(
    regionBottom - regionTop,
    0,
  )

  const frameWidth = Math.min(
    width * 0.9,
    availableHeight / FRAME_ASPECT,
  )

  const frameHeight =
    frameWidth * FRAME_ASPECT

  return {
    isLandscape: false,
    frameWidth,
    frameHeight,
    frameLeft:
      (width - frameWidth) / 2,
    frameTop:
      regionTop +
      (availableHeight - frameHeight) / 2,
    panel: null,
  }
}

/* ------------------------------------------------------------------ */
/* Status and orientation helpers                                      */
/* ------------------------------------------------------------------ */

/**
 * Resolves the display status for the frame and readiness pill.
 *
 * Live frame quality is advisory. When the capture gate reports ready,
 * the frame remains green even if an individual live-quality chip still
 * displays a warning or failure.
 */
export function getEffectiveStatus(
  isReady: boolean,
  shakeLevel: ShakeLevel,
  liveStatus: LiveGateStatus | null,
): LiveGateStatus | null {
  if (shakeLevel === 'heavy') {
    return 'fail'
  }

  if (isReady) {
    return 'pass'
  }

  if (liveStatus === 'pass') {
    return 'warn'
  }

  return liveStatus
}

function isLandscapeOrientation(
  orientation: ScreenOrientation.Orientation,
): boolean {
  return (
    orientation ===
      ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
    orientation ===
      ScreenOrientation.Orientation.LANDSCAPE_RIGHT
  )
}

/**
 * Converts Expo's orientation value into this camera screen's physical
 * control position.
 *
 * If the camera-screen control placement changes, update this helper or
 * replace the orientation prop with `controlsSide: 'left' | 'right'`.
 */
function areCameraControlsOnLeft(
  orientation: ScreenOrientation.Orientation,
): boolean {
  return (
    orientation ===
    ScreenOrientation.Orientation.LANDSCAPE_RIGHT
  )
}

/* ------------------------------------------------------------------ */
/* Subcomponents                                                       */
/* ------------------------------------------------------------------ */

/**
 * A single advisory live-quality chip.
 *
 * The chip is informational and does not independently block capture.
 */
const LiveChip = memo(function LiveChip({
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

type Corner =
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
function CornerMask({
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
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export const CaptureFrameOverlay = memo(
  function CaptureFrameOverlay({
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

    const readyAnim = useRef(
      new Animated.Value(0),
    ).current

    const shakeX = useRef(
      new Animated.Value(0),
    ).current

    const readyAnnouncementTimer =
      useRef<ReturnType<typeof setTimeout> | null>(
        null,
      )

    /* -------------------------------------------------------------- */
    /* Overlay measurement                                            */
    /* -------------------------------------------------------------- */

    const [measured, setMeasured] = useState<{
      width: number
      height: number
    } | null>(null)

    const onLayout = useCallback(
      (event: LayoutChangeEvent) => {
        const {
          width,
          height,
        } = event.nativeEvent.layout

        setMeasured((previous) => {
          if (
            previous &&
            previous.width === width &&
            previous.height === height
          ) {
            return previous
          }

          return {
            width,
            height,
          }
        })
      },
      [],
    )

    const orientationIsLandscape =
      isLandscapeOrientation(orientation)

    /**
     * Normalize the external dimensions for the first frame only.
     *
     * After onLayout runs, the overlay's measured dimensions become the
     * authoritative source for deciding portrait versus landscape layout.
     */
    const shouldSwapFallback =
      orientationIsLandscape &&
      dimensions.height > dimensions.width

    const screenWidth =
      measured?.width ??
      (shouldSwapFallback
        ? dimensions.height
        : dimensions.width)

    const screenHeight =
      measured?.height ??
      (shouldSwapFallback
        ? dimensions.width
        : dimensions.height)

    const layoutIsLandscape =
      screenWidth > screenHeight

    /**
     * Actual dimensions determine whether landscape layout is active.
     * The Expo orientation value determines which physical edge contains
     * the camera controls.
     */
    const controlsOnLeft =
      layoutIsLandscape &&
      areCameraControlsOnLeft(orientation)

    const {
      isLandscape,
      frameWidth,
      frameHeight,
      frameLeft,
      frameTop,
      panel,
    } = computeLayout(
      screenWidth,
      screenHeight,
      controlsOnLeft,
    )

    const frameBottom =
      frameTop + frameHeight

    const frameRight =
      frameLeft + frameWidth

    /* -------------------------------------------------------------- */
    /* Animations                                                      */
    /* -------------------------------------------------------------- */

    useEffect(() => {
      const animation = Animated.timing(
        readyAnim,
        {
          toValue: isReady ? 1 : 0,
          duration: 300,
          useNativeDriver: true,
        },
      )

      animation.start()

      return () => {
        animation.stop()
      }
    }, [isReady, readyAnim])

    useEffect(() => {
      if (shakeLevel !== 'heavy') {
        shakeX.stopAnimation()
        shakeX.setValue(0)
        return
      }

      shakeX.stopAnimation()
      shakeX.setValue(0)

      const animation = Animated.sequence(
        [6, -6, 4, -4, 0].map(
          (toValue) =>
            Animated.timing(shakeX, {
              toValue,
              duration: 50,
              useNativeDriver: true,
            }),
        ),
      )

      animation.start()

      return () => {
        animation.stop()
      }
    }, [shakeLevel, shakeX])

    /* -------------------------------------------------------------- */
    /* Accessibility announcements                                    */
    /* -------------------------------------------------------------- */

    /**
     * iOS does not support accessibilityLiveRegion in the same way as
     * Android. Wait briefly before announcing readiness so rapidly
     * fluctuating camera quality does not repeatedly announce "ready".
     */
    useEffect(() => {
      if (readyAnnouncementTimer.current) {
        clearTimeout(
          readyAnnouncementTimer.current,
        )

        readyAnnouncementTimer.current = null
      }

      if (
        Platform.OS !== 'ios' ||
        !isReady
      ) {
        return
      }

      readyAnnouncementTimer.current =
        setTimeout(() => {
          AccessibilityInfo.announceForAccessibility(
            t('overlayStatus.ready'),
          )

          readyAnnouncementTimer.current = null
        }, READY_ANNOUNCEMENT_DELAY_MS)

      return () => {
        if (
          readyAnnouncementTimer.current
        ) {
          clearTimeout(
            readyAnnouncementTimer.current,
          )

          readyAnnouncementTimer.current = null
        }
      }
    }, [isReady, t])

    /* -------------------------------------------------------------- */
    /* Effective status                                               */
    /* -------------------------------------------------------------- */

    const liveStatus:
      | LiveGateStatus
      | null =
      liveQuality?.overallStatus ?? null

    const effectiveStatus =
      getEffectiveStatus(
        isReady,
        shakeLevel,
        liveStatus,
      )

    const accentColor = effectiveStatus
      ? STATUS_COLORS[effectiveStatus]
      : NEUTRAL_COLOR

    const borderColor = effectiveStatus
      ? STATUS_COLORS_SOFT[effectiveStatus]
      : NEUTRAL_COLOR_SOFT

    const pillColor =
      PILL_COLORS[
        effectiveStatus ?? 'neutral'
      ]

    const pillIcon: IoniconName =
      isReady
        ? 'checkmark-circle'
        : shakeLevel === 'heavy'
          ? 'close-circle'
          : 'time'

    const pillText = isReady
      ? t('overlayStatus.ready')
      : shakeLevel === 'heavy'
        ? t('overlayStatus.holdStill')
        : t('overlayStatus.align')

    const instructions =
      VIEW_CONFIG[viewType]

    /* -------------------------------------------------------------- */
    /* Reusable status elements                                       */
    /* -------------------------------------------------------------- */

    const hintBar = (
      <View
        style={[
          styles.hintBar,
          !isLandscape && [
            styles.hintBarPortrait,
            {
              top: Math.max(
                frameTop - HINT_BAR_SPACE,
                12,
              ),
            },
          ],
        ]}
      >
        <Ionicons
          name={instructions.icon}
          size={22}
          color={COLORS.primaryLight}
        />

        <Text
          style={styles.hintText}
          maxFontSizeMultiplier={1.5}
        >
          {t(instructions.hintKey)}
        </Text>
      </View>
    )

    const brightnessIcon:
      | IoniconName
      | null = liveQuality
      ? BRIGHTNESS_ICONS[
          liveQuality.brightnessCondition
        ]
      : null

    const liveChips =
      liveQuality && brightnessIcon ? (
        <View style={styles.liveChips}>
          <LiveChip
            icon="scan-outline"
            label={t('live.blur')}
            status={liveQuality.blurStatus}
          />

          <LiveChip
            icon={brightnessIcon}
            label={t('live.brightness')}
            status={
              liveQuality.brightnessStatus
            }
          />

          <LiveChip
            icon="crop-outline"
            label={t('live.framing')}
            status={
              liveQuality.framingStatus
            }
          />
        </View>
      ) : null

    /**
     * Avoid rendering an unbounded warning list over a short camera
     * viewport. The message order supplied by useCaptureAssistance should
     * therefore also represent message priority.
     */
    const visibleMessages =
      messages.slice(
        0,
        MAX_VISIBLE_WARNINGS,
      )

    const warnings =
      visibleMessages.length > 0 ? (
        <View style={styles.warnings}>
          {visibleMessages.map(
            (message) => {
              const {
                icon,
                color,
              } =
                MESSAGE_STYLE[message] ??
                DEFAULT_MESSAGE_STYLE

              return (
                <View
                  key={message}
                  style={
                    styles.warningChip
                  }
                >
                  <Ionicons
                    name={icon}
                    size={14}
                    color={color}
                  />

                  <Text
                    style={
                      styles.warningText
                    }
                    maxFontSizeMultiplier={
                      1.5
                    }
                  >
                    {t(
                      `assistMessages.${message}`,
                    )}
                  </Text>
                </View>
              )
            },
          )}
        </View>
      ) : null

    const pill = (
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor: pillColor,
            transform: [
              {
                translateX: shakeX,
              },
            ],
          },
        ]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={pillText}
      >
        <Ionicons
          name={pillIcon}
          size={18}
          color="#ffffff"
          accessible={false}
        />

        <Text
          style={styles.pillText}
          accessibilityLiveRegion="polite"
          maxFontSizeMultiplier={1.5}
        >
          {pillText}
        </Text>
      </Animated.View>
    )

    /* -------------------------------------------------------------- */
    /* Render                                                         */
    /* -------------------------------------------------------------- */

    return (
      <View
        style={styles.overlay}
        pointerEvents="none"
        onLayout={onLayout}
      >
        {/* Dimmed surround */}
        <View
          style={[
            styles.dim,
            {
              top: 0,
              left: 0,
              right: 0,
              height: frameTop,
            },
          ]}
        />

        <View
          style={[
            styles.dim,
            {
              top: frameBottom,
              left: 0,
              right: 0,
              bottom: 0,
            },
          ]}
        />

        <View
          style={[
            styles.dim,
            {
              top: frameTop,
              left: 0,
              width: frameLeft,
              height: frameHeight,
            },
          ]}
        />

        <View
          style={[
            styles.dim,
            {
              top: frameTop,
              left: frameRight,
              right: 0,
              height: frameHeight,
            },
          ]}
        />

        {/* Capture frame */}
        <View
          style={[
            styles.frame,
            {
              top: frameTop,
              left: frameLeft,
              width: frameWidth,
              height: frameHeight,
            },
          ]}
        >
          {/* Rounded-corner masks */}
          <CornerMask corner="tl" />
          <CornerMask corner="tr" />
          <CornerMask corner="bl" />
          <CornerMask corner="br" />

          {/* Crab silhouette */}
          <Animated.Image
            source={CRAB_OUTLINE}
            resizeMode="contain"
            accessible={false}
            style={[
              styles.crabOutline,
              {
                tintColor: accentColor,
                transform: [
                  {
                    scale: isLandscape
                      ? 0.85
                      : 0.8,
                  },
                ],
                opacity:
                  readyAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [
                      0.1,
                      0.22,
                    ],
                  }),
              },
            ]}
          />

          {/* Centre crosshair */}
          <View style={styles.crosshairH} />
          <View style={styles.crosshairV} />

          {/* Frame border */}
          <View
            style={[
              styles.frameBorder,
              {
                borderColor,
              },
            ]}
          />

          {/* Corner brackets */}
          <View
            style={[
              styles.corner,
              styles.cornerTL,
              {
                borderColor: accentColor,
              },
            ]}
          />

          <View
            style={[
              styles.corner,
              styles.cornerTR,
              {
                borderColor: accentColor,
              },
            ]}
          />

          <View
            style={[
              styles.corner,
              styles.cornerBL,
              {
                borderColor: accentColor,
              },
            ]}
          />

          <View
            style={[
              styles.corner,
              styles.cornerBR,
              {
                borderColor: accentColor,
              },
            ]}
          />

          {/* Focus indicator */}
          {isFocused && (
            <View style={styles.focusRing}>
              <Ionicons
                name="checkmark"
                size={16}
                color={COLORS.success}
              />
            </View>
          )}

          {/* Coin/reference-object zone */}
          {viewType !==
            'carapace-closeup' && (
            <View style={styles.coinZone}>
              <Ionicons
                name="pricetag-outline"
                size={18}
                color="rgba(255,255,255,0.7)"
              />
            </View>
          )}
        </View>

        {panel ? (
          <View
            style={[
              styles.sidePanel,
              {
                left: panel.left,
                width: panel.width,
                top: panel.top,
                bottom: panel.bottom,
              },
            ]}
          >
            {hintBar}
            {liveChips}
            {warnings}
            {pill}
          </View>
        ) : (
          <>
            {hintBar}

            <View
              style={[
                styles.bottomStack,
                {
                  top:
                    frameBottom + 12,
                  bottom: PILL_BOTTOM,
                },
              ]}
            >
              {liveChips}

              <View
                style={styles.spacer}
              />

              {warnings}
              {pill}
            </View>
          </>
        )}
      </View>
    )
  },
)

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },

  dim: {
    position: 'absolute',
    backgroundColor: DIM_COLOR,
  },

  /* Hint bar */

  hintBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },

  hintBarPortrait: {
    position: 'absolute',
    left: 12,
    right: 12,
  },

  hintText: {
    flexShrink: 1,
    fontSize: FONT.sm,
    color:
      'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },

  /* Frame */

  frame: {
    position: 'absolute',
  },

  frameBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderRadius: FRAME_RADIUS,
  },

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

  crabOutline: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    bottom: 12,
    width: undefined,
    height: undefined,
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
    borderTopLeftRadius:
      FRAME_RADIUS,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },

  cornerTR: {
    top: -2,
    right: -2,
    borderTopRightRadius:
      FRAME_RADIUS,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },

  cornerBL: {
    bottom: -2,
    left: -2,
    borderBottomLeftRadius:
      FRAME_RADIUS,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },

  cornerBR: {
    bottom: -2,
    right: -2,
    borderBottomRightRadius:
      FRAME_RADIUS,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },

  crosshairH: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 1,
    backgroundColor:
      'rgba(255, 255, 255, 0.15)',
  },

  crosshairV: {
    position: 'absolute',
    left: '50%',
    top: 10,
    bottom: 10,
    width: 1,
    backgroundColor:
      'rgba(255, 255, 255, 0.15)',
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
    backgroundColor:
      'rgba(34, 197, 94, 0.2)',
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
    borderColor:
      'rgba(255, 255, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor:
      'rgba(0, 0, 0, 0.3)',
  },

  /* Status containers */

  bottomStack: {
    position: 'absolute',
    left: EDGE,
    right: EDGE,
    alignItems: 'center',
    gap: 8,
  },

  sidePanel: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 10,
  },

  spacer: {
    flex: 1,
  },

  /* Live-quality chips */

  liveChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },

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

  /* Assistance warnings */

  warnings: {
    alignItems: 'center',
    gap: 6,
  },

  warningChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor:
      'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    maxWidth: '100%',
  },

  warningText: {
    flexShrink: 1,
    fontSize: FONT.sm,
    color: '#ffffff',
    fontWeight: '500',
  },

  /* Readiness pill */

  pill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },

  pillText: {
    fontSize: FONT['sm+'],
    color: '#ffffff',
    fontWeight: '600',
  },
})
