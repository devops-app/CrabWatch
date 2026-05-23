import React from 'react'
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
  type StyleProp,
} from 'react-native'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'

interface InputProps extends Omit<TextInputProps, 'ref'> {
  label?: string
  error?: string
  containerStyle?: StyleProp<ViewStyle>
}

export function Input({
  label,
  error,
  style,
  containerStyle,
  placeholder,
  ...props
}: InputProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          error ? styles.inputError : undefined,
          style,
        ]}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        allowFontScaling
        accessibilityLabel={label ? `${label}${error ? `, ${error}` : ''}` : undefined}
        {...props}
      />
      {error && (
        <Text
          style={styles.error}
          accessibilityLiveRegion="polite"
          role="alert"
        >
          {error}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    fontSize: FONT.base,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: FONT.lg,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  inputError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorLight,
  },
  error: {
    fontSize: FONT['sm+'],
    color: COLORS.error,
    marginTop: 4,
  },
})
