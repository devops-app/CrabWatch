import React, { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { View, Text, ActivityIndicator } from 'react-native'
import { AppNavigator } from './src/navigation/AppNavigator'
import { initAuth } from './src/store/authStore'
import { usePendingObservationSync } from './src/hooks/usePendingObservationSync'

export default function App() {
  usePendingObservationSync()

  const [isInitialized, setIsInitialized] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    const initialize = async () => {
      try {
        await initAuth()
        setIsInitialized(true)
      } catch (error) {
        console.error('Failed to initialize auth:', error)
        setInitError(error instanceof Error ? error.message : 'Initialization failed')
        setIsInitialized(true) // Still proceed to avoid blank screen
      }
    }

    initialize()
  }, [])

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f9ff' }}>
        <ActivityIndicator size="large" color="#0284c7" />
      </View>
    )
  }

  if (initError) {
    console.error('Init error:', initError)
  }

  return (
    <NavigationContainer>
      <AppNavigator />
    </NavigationContainer>
  )
}
