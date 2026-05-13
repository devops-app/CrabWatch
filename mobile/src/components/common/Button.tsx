import React from 'react'
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type TouchableOpacityProps,
} from 'react-native'
import { COLORS } from '../../utils/constants'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant
  loading?: boolean
  title: string
}

const VARIANT_STYLES: Record<ButtonVariant, { bg: string; color: string; border?: string }> = {
  primary: { bg: COLORS.primary, color: '#ffffff' },
  secondary: { bg: COLORS.secondary, color: '#ffffff' },
  danger: { bg: COLORS.error, color: '#ffffff' },
  ghost: { bg: 'transparent', color: COLORS.primary, border: COLORS.primary },
}

export function Button({
  variant = 'primary',
  loading = false,
  title,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const variantStyle = VARIANT_STYLES[variant]

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: variantStyle.bg, borderColor: variantStyle.border },
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.7}
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
    borderRadius: 12,
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
