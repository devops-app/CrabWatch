import React from 'react'
import { View, Text, StyleSheet, Alert } from 'react-native'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'

interface PickerOption {
  label: string
  value: string
}

interface PickerProps {
  label?: string
  options: readonly PickerOption[]
  selectedValue: string
  onValueChange: (value: string) => void
  placeholder?: string
  error?: string
}

export function Picker({
  label,
  options,
  selectedValue,
  onValueChange: _onValueChange,
  placeholder = 'Select...',
  error,
}: PickerProps) {
  const displayValue = options.find((o) => o.value === selectedValue)?.label || placeholder

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.picker, error ? styles.pickerError : undefined]}>
        <Text style={styles.pickerText}>{displayValue}</Text>
        <Text style={styles.chevron}>▼</Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

export function PickerWithAlert({
  label,
  options,
  selectedValue,
  onValueChange,
  placeholder = 'Select...',
  error,
}: PickerProps) {
  const displayValue = options.find((o) => o.value === selectedValue)?.label || placeholder

  const handlePress = () => {
    Alert.alert(label || 'Select', '', [
      ...options.map((option) => ({
        text: option.label,
        onPress: () => onValueChange(option.value),
      })),
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[styles.picker, error ? styles.pickerError : undefined]}
        onTouchEnd={handlePress}
      >
        <Text style={styles.pickerText}>{displayValue}</Text>
        <Text style={styles.chevron}>▼</Text>
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
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
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
  },
  pickerError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.errorLight,
  },
  pickerText: {
    fontSize: FONT.lg,
    color: COLORS.text,
  },
  chevron: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
  },
  error: {
    fontSize: FONT['sm+'],
    color: COLORS.error,
    marginTop: 4,
  },
})
