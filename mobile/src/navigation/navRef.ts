import { CommonActions, createNavigationContainerRef } from '@react-navigation/native'
import type { RootStackParamList } from './types'

const ref = createNavigationContainerRef<RootStackParamList>()

export { ref as navRef }

export function resetToLogin() {
  const containerRef = (ref as any).current ?? ref
  if (containerRef?.isReady?.()) {
    containerRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    )
  }
}

export function resetToMainTabs() {
  const containerRef = (ref as any).current ?? ref
  if (containerRef?.isReady?.()) {
    containerRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      })
    )
  }
}
