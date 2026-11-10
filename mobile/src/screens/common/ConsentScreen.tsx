import React from 'react'
import { ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LegalDocument } from '../../components/legal/LegalDocument'
import { CONSENT_MD } from '../../legal/consentContent'
import { useTheme } from '../../hooks/useTheme'

/**
 * Consent / Terms & Conditions screen.
 *
 * Renders the same markdown content as the web legal pages
 * (web/public/legal/en/consent.md) using the shared LegalDocument
 * card layout, so mobile and web stay visually identical.
 */
export function ConsentScreen() {
  const { colors } = useTheme()

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <LegalDocument markdown={CONSENT_MD} />
      </ScrollView>
    </SafeAreaView>
  )
}
