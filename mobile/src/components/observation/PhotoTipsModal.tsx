import React from 'react'
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'

export function PhotoTipsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useTranslation('capture')

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('photoGuide')}</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('closeExamples')}
            >
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.example}>
              <Image
                source={require('../../../assets/images/dorsal-example.jpg')}
                style={styles.image}
                contentFit="contain"
              />
              <Text style={styles.label}>{t('dorsalExample')}</Text>
            </View>

            <View style={styles.example}>
              <Image
                source={require('../../../assets/images/ventral-example.jpg')}
                style={styles.image}
                contentFit="contain"
              />
              <Text style={styles.label}>{t('ventralExample')}</Text>
            </View>

            <View style={styles.example}>
              <Image
                source={require('../../../assets/images/closeup-example.png')}
                style={styles.image}
                contentFit="contain"
              />
              <Text style={styles.label}>{t('closeupExample')}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    width: '100%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONT.base,
    fontWeight: '700',
    color: COLORS.text,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  example: {
    alignItems: 'center',
    gap: 6,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  label: {
    fontSize: FONT['sm+'],
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
})
