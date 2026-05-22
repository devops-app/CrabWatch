import React from 'react'
import { View, StyleSheet, type ViewProps, TouchableOpacity } from 'react-native'
import { COLORS, ELEVATION } from '../../utils/constants'

interface CardProps extends ViewProps {
  onPress?: () => void
  padding?: number
  elevation?: 1 | 2 | 3 | 4 | 5
  accessibilityLabel?: string
}

export function Card({
  onPress,
  padding = 16,
  elevation = 2,
  style,
  children,
  accessibilityLabel,
  ...props
}: CardProps) {
  const content = (
    <View
      style={[
        styles.card,
        ELEVATION[elevation],
        { padding },
        style,
      ]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
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
        onAccessibilityEscape={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
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
  },
})
