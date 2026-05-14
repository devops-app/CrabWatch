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
import { COUNTRIES } from '@crabwatch/shared'

type PhoneCodeOption = {
  phoneCode: string
  countryName: string
}

const PHONE_CODES: PhoneCodeOption[] = COUNTRIES.map((c) => ({
  phoneCode: c.phoneCode,
  countryName: c.name,
}))

interface PhoneCodePickerProps {
  label?: string
  selectedCode: string
  onSelect: (code: string) => void
  error?: string
}

export function PhoneCodePicker({ label, selectedCode, onSelect, error }: PhoneCodePickerProps) {
  const [visible, setVisible] = useState(false)

  return (
    <>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity
        style={[styles.container, error && styles.errorBorder]}
        onPress={() => {
          Keyboard.dismiss()
          setVisible(true)
        }}
      >
        <View style={styles.valueRow}>
          <Text style={[styles.value, !selectedCode && styles.placeholder]}>
            {selectedCode || '+60'}
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
              <Text style={styles.modalTitle}>Phone Code</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={PHONE_CODES}
              keyExtractor={(item) => item.phoneCode}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    selectedCode === item.phoneCode && styles.countryItemSelected,
                  ]}
                  onPress={() => {
                    onSelect(item.phoneCode)
                    setVisible(false)
                  }}
                >
                  <Text
                    style={[
                      styles.countryName,
                      selectedCode === item.phoneCode && styles.countryNameSelected,
                    ]}
                  >
                    {item.countryName}
                  </Text>
                  <Text
                    style={[
                      styles.countryCode,
                      selectedCode === item.phoneCode && styles.countryCodeSelected,
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  container: {
    marginBottom: 16,
  },
  errorBorder: {
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
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
    fontSize: 16,
    color: COLORS.text,
  },
  placeholder: {
    color: COLORS.textLight,
  },
  errorText: {
    fontSize: 12,
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
    fontSize: 18,
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
    fontSize: 16,
    color: COLORS.text,
  },
  countryNameSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  countryCode: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  countryCodeSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
})
