import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'

const TERMS_EN = `User Agreement & Consent

By creating an account and using the CrabWatch platform, I acknowledge and agree that:

• My submitted observations (including images, location, and metadata) may be used for research, conservation, and reporting purposes.
• My personal data will be collected and processed in accordance with applicable data protection laws, including Malaysia PDPA.
• Submitted content may be reviewed, validated, and shared with authorised researchers and institutions.
• The platform is provided "as is" without warranty, and data may not always be accurate or verified.
• AI-assisted insights (if applicable) are generated automatically and should not be relied upon as scientific conclusions.

I confirm that the information I provide is accurate and that I have the right to upload any content submitted.`

const TERMS_MS = `Perjanjian Pengguna & Persetujuan

Dengan membuat akaun dan menggunakan platform CrabWatch, saya mengakui dan bersetuju bahawa:

• Pemerhatian yang saya hantar (termasuk imej, lokasi, dan metadata) boleh digunakan untuk tujuan penyelidikan, pemuliharaan, dan pelaporan.
• Data peribadi saya akan dikumpulkan dan diproses menurut undang-undang perlindungan data yang berkenaan, termasuk PDPA Malaysia.
• Kandungan yang dihantar boleh disemak, divalidasi, dan dikongsi dengan penyelidik dan institusi yang berwenang.
• Platform ini disediakan "apa adanya" tanpa jaminan, dan data mungkin tidak sentiasa tepat atau disahkan.
• Maklum balas berasaskan AI (jika berkenaan) dijana secara automatik dan tidak seharusnya dianggap sebagai kesimpulan saintifik.

Saya mengesahkan bahawa maklumat yang saya berikan adalah tepat dan bahawa saya mempunyai hak untuk memuat naik sebarang kandungan yang dihantar.`

export function TermsScreen() {
  const { t, i18n } = useTranslation()
  const content = i18n.language === 'ms' ? TERMS_MS : TERMS_EN

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('legal.termsTitle')}</Text>
        <Text style={styles.body}>{content}</Text>
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
    padding: 20,
  },
  title: {
    fontSize: FONT.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  body: {
    fontSize: FONT.base,
    color: COLORS.text,
    lineHeight: FONT.base * 1.8,
  },
})
