import React from 'react'
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
  type TouchableOpacityProps,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { COLORS } from '../../utils/constants'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant
  loading?: boolean
  title: string
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; color: string; border?: string; radius: number }> = {
  primary: { bg: COLORS.primary, color: '#ffffff', radius: Platform.OS === 'android' ? 4 : 12 },
  secondary: { bg: COLORS.secondary, color: '#ffffff', radius: Platform.OS === 'android' ? 16 : 12 },
  danger: { bg: COLORS.error, color: '#ffffff', radius: Platform.OS === 'android' ? 4 : 12 },
  ghost: { bg: 'transparent', color: COLORS.primary, border: COLORS.primary, radius: Platform.OS === 'android' ? 100 : 12 },
}

export function Button({
  variant = 'primary',
  loading = false,
  title,
  disabled,
  style,
  onPress,
  ...props
}: ButtonProps) {
  const variantStyle = VARIANT_STYLES[variant]

  const handlePress = (e: any) => {
    if (!disabled && !loading) {
      Haptics.selectionAsync()
    }
    onPress?.(e)
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: variantStyle.bg, borderColor: variantStyle.border, borderRadius: variantStyle.radius },
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      onPress={handlePress}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.color} />
      ) : (
        <Text style={[styles.text, { color: variantStyle.color }]}>{title}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderWidth: 0,
    minWidth: 120,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
})
