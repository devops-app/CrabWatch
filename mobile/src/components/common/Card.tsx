import React from 'react'
import { View, StyleSheet, type ViewProps, TouchableOpacity } from 'react-native'
import { COLORS } from '../../utils/constants'

interface CardProps extends ViewProps {
  onPress?: () => void
  padding?: number
  elevation?: number
}

export function Card({
  onPress,
  padding = 16,
  elevation = 2,
  style,
  children,
  ...props
}: CardProps) {
  const content = (
    <View
      style={[
        styles.card,
        { padding, elevation },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  )

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.wrapper}
      >
        {content}
      </TouchableOpacity>
    )
  }

  return content
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 8,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
})
