import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Keyboard,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import { COUNTRIES, CountryOption } from '@crabwatch/shared'

interface CountryPickerProps {
  label: string
  selectedCode: string
  onSelect: (country: CountryOption) => void
  error?: string
}

export function CountryPicker({ label, selectedCode, onSelect, error }: CountryPickerProps) {
  const [visible, setVisible] = useState(false)
  const selected = COUNTRIES.find((c) => c.code === selectedCode) || COUNTRIES.find((c) => c.name === selectedCode)

  return (
    <>
      <TouchableOpacity
        style={[styles.container, error && styles.errorBorder]}
        onPress={() => {
          Keyboard.dismiss()
          setVisible(true)
        }}
      >
        <Text style={styles.label}>{label}</Text>
        <View style={styles.valueRow}>
          <Text style={[styles.value, !selected && styles.placeholder]}>
            {selected ? selected.name : 'Select country'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
        </View>
        {error && <Text style={styles.errorText}>{error}</Text>}
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    selectedCode === item.code && styles.countryItemSelected,
                  ]}
                  onPress={() => {
                    onSelect(item)
                    setVisible(false)
                  }}
                >
                  <Text
                    style={[
                      styles.countryName,
                      selectedCode === item.code && styles.countryNameSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.countryCode,
                      selectedCode === item.code && styles.countryCodeSelected,
                    ]}
                  >
                    {item.phoneCode}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  errorBorder: {
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
  },
  label: {
    fontSize: FONT.base,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  value: {
    fontSize: FONT.lg,
    color: COLORS.text,
  },
  placeholder: {
    color: COLORS.textLight,
  },
  errorText: {
    fontSize: FONT.sm,
    color: '#ef4444',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT.xl,
    fontWeight: '700',
    color: COLORS.text,
  },
  countryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  countryItemSelected: {
    backgroundColor: COLORS.primary + '15',
  },
  countryName: {
    fontSize: FONT.lg,
    color: COLORS.text,
  },
  countryNameSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  countryCode: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
  },
  countryCodeSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
})
