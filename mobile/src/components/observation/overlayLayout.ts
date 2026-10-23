import * as ScreenOrientation from 'expo-screen-orientation'

/* ------------------------------------------------------------------ */
/* Layout constants                                                    */
/* ------------------------------------------------------------------ */

export const FRAME_ASPECT = 0.75
export const FRAME_RADIUS = 18

/** Reserved space for the camera screen's header or step title. */
export const HEADER_RESERVE = 60

/** Portrait hint-bar height plus the gap above the frame. */
export const HINT_BAR_SPACE = 72

/** Portrait readiness-pill distance from the bottom. */
export const PILL_BOTTOM = 30

/** Reserved portrait space for quality chips, warnings, and status pill. */
export const STACK_MIN_HEIGHT = 120

/** Width of the landscape hint and status column. */
export const SIDE_PANEL_WIDTH = 220

/** Full-height strip reserved for landscape camera controls. */
export const SIDE_CONTROL_RESERVE = 108

export const EDGE = 16

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export type OverlayLayout = {
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
export function computeLayout(
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
/* Orientation helpers                                                 */
/* ------------------------------------------------------------------ */

export function isLandscapeOrientation(
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
export function areCameraControlsOnLeft(
  orientation: ScreenOrientation.Orientation,
): boolean {
  return (
    orientation ===
    ScreenOrientation.Orientation.LANDSCAPE_RIGHT
  )
}
