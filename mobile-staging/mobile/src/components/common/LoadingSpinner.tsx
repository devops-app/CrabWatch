import React from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { COLORS } from '../../utils/constants'

interface LoadingSpinnerProps {
  size?: 'small' | 'large'
  color?: string
  fullScreen?: boolean
}

export function LoadingSpinner({
  size = 'large',
  color = COLORS.primary,
  fullScreen = false,
}: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <View style={styles.fullScreen}>
        <ActivityIndicator size={size} color={color} />
      </View>
    )
  }

  return <ActivityIndicator size={size} color={color} />
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
})
