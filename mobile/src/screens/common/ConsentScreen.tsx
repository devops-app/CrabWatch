import React from 'react'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LegalDocument } from '../../components/legal/LegalDocument'
import { CONSENT_MD, CONSENT_MS } from '../../legal/consentContent'
import { useTheme } from '../../hooks/useTheme'
import { useLocaleStore } from '../../store/localeStore'

/**
 * Consent / Terms & Conditions screen.
 *
 * Renders the same markdown content as the web legal pages
 * (web/public/legal/{en,ms}/consent.md) using the shared LegalDocument
 * card layout, so mobile and web stay visually identical. Content is
 * selected by the user's active locale (en/ms).
 */
export function ConsentScreen() {
  const { colors } = useTheme()
  const locale = useLocaleStore((s) => s.locale)
  const markdown = locale === 'ms' ? CONSENT_MS : CONSENT_MD

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <LegalDocument markdown={markdown} />
      </ScrollView>
    </SafeAreaView>
  )
}
