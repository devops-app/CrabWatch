import { useColorScheme } from 'react-native'
import { COLORS, DARK_COLORS } from '../utils/constants'

export function useTheme() {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'

  return {
    colors: isDark ? DARK_COLORS : COLORS,
    isDark,
    scheme,
  }
}
