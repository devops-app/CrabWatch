import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTranslation } from 'react-i18next'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'

const APP_VERSION = '1.0.0'

export function AboutScreen() {
  const { t } = useTranslation()

  const handleEmailPress = () => {
    Linking.openURL('mailto:support@dsigncodehub.com')
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="finger-print" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.appName}>{t('about.appName')}</Text>
          <Text style={styles.appVersion}>v{APP_VERSION}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('about.about')}</Text>
          <Text style={styles.cardText}>
            {t('about.aboutText')}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('about.madeBy')}</Text>
          <View style={styles.creatorRow}>
            <Ionicons name="code-slash" size={20} color={COLORS.primary} />
            <Text style={styles.creatorText}>{t('about.creator')}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('about.support')}</Text>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={handleEmailPress}
          >
            <Ionicons name="mail" size={20} color={COLORS.textSecondary} />
            <Text style={styles.contactText}>support@dsigncodehub.com</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('about.features')}</Text>
          <Text style={styles.featureText}>
            {'\u2022'} {t('about.feature1')}
          </Text>
          <Text style={styles.featureText}>
            {'\u2022'} {t('about.feature2')}
          </Text>
          <Text style={styles.featureText}>
            {'\u2022'} {t('about.feature3')}
          </Text>
          <Text style={styles.featureText}>
            {'\u2022'} {t('about.feature4')}
          </Text>
          <Text style={styles.featureText}>
            {'\u2022'} {t('about.feature5')}
          </Text>
        </View>

        <Text style={styles.footerText}>
          {t('about.rights', { year: new Date().getFullYear() })}
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 28,
    marginTop: 12,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primaryLight,
  },
  appName: {
    fontSize: FONT['5xl'],
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
  },
  appVersion: {
    fontSize: FONT['sm+'],
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: FONT.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  cardText: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  creatorText: {
    fontSize: FONT.md,
    color: COLORS.text,
    fontWeight: '500',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  contactText: {
    flex: 1,
    fontSize: FONT.base,
    color: COLORS.primary,
    fontWeight: '500',
  },
  featureText: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    lineHeight: 22,
    paddingLeft: 4,
  },
  footerText: {
    fontSize: FONT.sm,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 16,
  },
})
