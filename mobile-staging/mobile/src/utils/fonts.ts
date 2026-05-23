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
  '3xs': dynamicFontSize(9, 14),
  '2xs': dynamicFontSize(10, 16),
  xs: dynamicFontSize(11, 18),
  sm: dynamicFontSize(12, 20),
  'sm+': dynamicFontSize(13, 22),
  base: dynamicFontSize(14, 24),
  md: dynamicFontSize(15, 24),
  lg: dynamicFontSize(16, 28),
  xl: dynamicFontSize(18, 32),
  '2xl': dynamicFontSize(20, 36),
  '3xl': dynamicFontSize(22, 40),
  '4xl': dynamicFontSize(24, 40),
  '5xl': dynamicFontSize(28, 44),
  '6xl': dynamicFontSize(32, 48),
  '7xl': dynamicFontSize(48, 64),
}
