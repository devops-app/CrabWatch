import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { View, ActivityIndicator, Platform, Linking } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import * as LinkingModule from 'expo-linking'
import { I18nextProvider } from 'react-i18next'
import { AppNavigator } from './src/navigation/AppNavigator'
import { initAuth } from './src/store/authStore'
import { useLocaleStore } from './src/store/localeStore'
import { usePendingObservationSync } from './src/hooks/usePendingObservationSync'
import { useTheme } from './src/hooks/useTheme'
import { ErrorBoundary } from './src/components/common/ErrorBoundary'
import i18n from './src/lib/i18n'

export default function App() {
  usePendingObservationSync()
  const { colors } = useTheme()
  const initLocale = useLocaleStore((state) => state.init)

  const [isInitialized, setIsInitialized] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const [deepLinkToken, setDeepLinkToken] = useState<string | null>(null)

  useEffect(() => {
    const initialize = async () => {
      try {
        const url = await Linking.getInitialURL()
        if (url) {
          extractToken(url)
        }

        await initLocale()
        await initAuth()
        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize auth:', error)
        setInitError(error instanceof Error ? error.message : 'Initialization failed')
        setIsInitialized(true)
      }
    }

    initialize()

    const subscription = Linking.addEventListener('url', (event) => {
      extractToken(event.url)
    })

    return () => subscription.remove()
  }, [])

  const extractToken = (url: string) => {
    console.log('Deep link received:', url)
    if (!url) return

    const parsed = LinkingModule.parse(url)
    const path = parsed.path || ''

    const resetMatch = path.match(/^\/reset-password\/(.+)$/)
    if (resetMatch) {
      const token = decodeURIComponent(resetMatch[1])
      setDeepLinkToken(token)
    }
  }

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (initError) {
    console.error('Init error:', initError)
  }

  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <StatusBar style={Platform.OS === 'ios' ? 'dark' : 'auto'} />
        <NavigationContainer>
          <AppNavigator deepLinkToken={deepLinkToken} />
        </NavigationContainer>
      </I18nextProvider>
    </ErrorBoundary>
  )
}
