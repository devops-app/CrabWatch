import { Ionicons } from '@expo/vector-icons'

import type { CaptureMessageKey } from '../../hooks/useCaptureAssistance'
import type {
  BrightnessCondition,
  LiveGateStatus,
} from '../../utils/liveFrameQuality'

export type IoniconName = keyof typeof Ionicons.glyphMap

export type ViewType =
  | 'dorsal'
  | 'ventral'
  | 'carapace-closeup'

export type ShakeLevel =
  | 'none'
  | 'slight'
  | 'heavy'

/* ------------------------------------------------------------------ */
/* Palette                                                             */
/* ------------------------------------------------------------------ */

/** National-ID style status palette. */
export const STATUS_COLORS = {
  pass: '#22c55e',
  warn: '#f59e0b',
  fail: '#ef4444',
} as const

/** Softer translucent variants used for the frame border. */
export const STATUS_COLORS_SOFT = {
  pass: 'rgba(34,197,94,0.55)',
  warn: 'rgba(245,158,11,0.5)',
  fail: 'rgba(239,68,68,0.5)',
} as const

/** Neutral grey used before the first live sample is available. */
export const NEUTRAL_COLOR = '#9ca3af'
export const NEUTRAL_COLOR_SOFT = 'rgba(156,163,175,0.5)'

/** Readiness pill backgrounds using the same status model as the frame. */
export const PILL_COLORS = {
  pass: 'rgba(34, 197, 94, 0.85)',
  warn: 'rgba(245, 158, 11, 0.85)',
  fail: 'rgba(239, 68, 68, 0.85)',
  neutral: 'rgba(107, 114, 128, 0.85)',
} as const

export const LIGHTING_COLOR = '#f97316'
export const DIM_COLOR = 'rgba(0, 0, 0, 0.45)'

/* ------------------------------------------------------------------ */
/* Typed configuration maps                                            */
/* ------------------------------------------------------------------ */

export const VIEW_CONFIG = {
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
 * Typed as `Partial<Record<CaptureMessageKey, MessageStyle>>` so a typo in a
 * key is a compile error (excess-property check) while keys intentionally
 * omitted (e.g. `focusLocked`) fall back to `DEFAULT_MESSAGE_STYLE` — a
 * neutral information icon rather than a misleading success indicator.
 */
export const MESSAGE_STYLE: Partial<
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

export const DEFAULT_MESSAGE_STYLE: MessageStyle = {
  icon: 'information-circle',
  color: '#ffffff',
}

/**
 * Brightness thresholds remain owned by liveFrameQuality.
 * The overlay maps only the semantic brightness condition to an icon.
 */
export const BRIGHTNESS_ICONS = {
  dark: 'moon-outline',
  normal: 'partly-sunny-outline',
  bright: 'sunny-outline',
} as const satisfies Record<
  BrightnessCondition,
  IoniconName
>

/* ------------------------------------------------------------------ */
/* Status helpers                                                      */
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
