import { Platform, PixelRatio } from 'react-native'

const fontScale = PixelRatio.getFontScale()
const maxScale = 2

const clampScale = (scale: number) => Math.min(scale, maxScale)

export function dynamicFontSize(baseSize: number, cap: number = 32): number {
  if (Platform.OS === 'ios') {
    const scaled = baseSize * clampScale(fontScale)
    return Math.min(scaled, cap)
  }
  return baseSize
}

export const FONT = {
  xs: dynamicFontSize(12, 18),
  sm: dynamicFontSize(14, 20),
  base: dynamicFontSize(16, 24),
  lg: dynamicFontSize(18, 28),
  xl: dynamicFontSize(20, 32),
  '2xl': dynamicFontSize(24, 36),
  '3xl': dynamicFontSize(30, 42),
  '4xl': dynamicFontSize(36, 48),
}
