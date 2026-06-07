import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'

const PRIVACY_EN = `Privacy Policy – CrabWatch Platform

1. Introduction

CrabWatch ("the Platform") is a mobile and web-based system developed to support biodiversity research and conservation through citizen science participation.

This Privacy Policy explains how personal data is collected, used, stored, and protected in connection with the Platform.

2. Data Controller

Project Owner (Data Controller): Universiti Malaysia Terengganu (UMT)
Technical Service Provider (Data Processor): Dsigncodehub

UMT is responsible for the governance and ownership of all platform data, while Dsigncodehub provides infrastructure hosting and technical support.

3. Personal Data Collected

3.1 Account Information
• Name
• Email address
• Login credentials (secured)

3.2 Observation Data
• Uploaded images
• Geolocation (GPS coordinates)
• Species information
• Measurement data (e.g., carapace length, sex)
• Submission timestamps

3.3 Technical Data
• Device type and OS
• Log and usage data
• IP address (where applicable)

4. Purpose of Data Processing

Data is collected and used for:
• User registration and authentication
• Submission and management of observations
• Scientific research and biodiversity analysis
• Platform operation, support, and improvement
• Communication with users (notifications, updates)

5. Legal Basis (PDPA Compliance)

Personal data is processed in accordance with Malaysia Personal Data Protection Act 2010 (PDPA). Processing is based on user consent and legitimate project and research purposes.

6. Data Sharing and Disclosure

Your data may be shared with authorised researchers, academic institutions, platform administrators, and technical support personnel. Data may be disclosed if required by law enforcement agencies or legal obligations.

7. User-Generated Content

Users retain ownership of their submitted content. By submitting content, users grant a non-exclusive, worldwide, royalty-free licence for use in research, reporting, education, and conservation.

8. Data Security

We implement appropriate security measures including authentication, access control, role-based permissions, secure data transmission, system monitoring, and regular updates. However, no system is completely secure.

9. Data Retention

Personal data is retained only as long as necessary for research, operational, and legal purposes. Data may be retained longer for scientific datasets and institutional research continuity.

10. User Rights

Users may have the right to access their personal data, request correction, request deletion (subject to research/legal constraints), and withdraw consent. Requests should be directed to the project owner (UMT).

11. Third-Party Services

The Platform may use third-party services such as map services, authentication services, cloud infrastructure providers, and AI services. These providers operate under their own privacy policies.

12. AI Processing (If Applicable)

Where AI technologies are used, results are automatically generated and may not always be accurate. Users should not rely solely on AI-generated insights.

13. International Data Transfer

If applicable, data may be processed in cloud environments located outside Malaysia. All data handling will follow appropriate safeguards and security requirements.

14. Changes to This Policy

This Privacy Policy may be updated from time to time to reflect legal changes, platform enhancements, and operational updates.

15. Contact Information

For privacy-related inquiries or requests:
Project Owner: Universiti Malaysia Terengganu (UMT)
Technical Partner: Dsigncodehub`

const PRIVACY_MS = `Dasar Privasi – Platform CrabWatch

1. Pengenalan

CrabWatch ("Platform") ialah sistem mudah alih dan web yang dibangunkan untuk menyokong penyelidikan biodiversiti dan pemuliharaan melalui penyertaan sains warga.

Dasar Privasi ini menjelaskan bagaimana data peribadi dikumpulkan, digunakan, disimpan, dan dilindungi dalam kaitan dengan Platform.

2. Pengawal Data

Pemilik Projek (Pengawal Data): Universiti Malaysia Terengganu (UMT)
Pembekal Perkhidmatan Teknikal (Pemproses Data): Dsigncodehub

UMT bertanggungjawab atas tadbir urus dan kepunyaan semua data platform, manakala Dsigncodehub menyediakan perkhidmatan infrastruktur dan sokongan teknikal.

3. Data Peribadi Yang Dikumpulkan

3.1 Maklumat Akaun
• Nama
• Alamat e-mel
• Kelayakan log masuk (disahkan)

3.2 Data Pemerhatian
• Imej yang dimuat naik
• Geolokasi (koordinat GPS)
• Maklumat spesies
• Data pengukuran (cth., panjang karapas, jantina)
• Cap masa penghantaran

3.3 Data Teknikal
• Jenis peranti dan OS
• Data log dan penggunaan
• Alamat IP (jika berkenaan)

4. Tujuan Pemprosesan Data

Data dikumpulkan dan digunakan untuk:
• Pendaftaran dan pengesahan pengguna
• Penghantaran dan pengurusan pemerhatian
• Penyelidikan saintifik dan analisis biodiversiti
• Operasi platform, sokongan, dan penambahbaikan
• Komunikasi dengan pengguna (notifikasi, kemas kini)

5. Asas Undang-undang (Pematuhan PDPA)

Data peribadi diproses menurut Akta Perlindungan Data Peribadi 2010 Malaysia (PDPA). Pemprosesan berdasarkan persetujuan pengguna dan tujuan projek serta penyelidikan yang sah.

6. Perkongsian dan Pengungkapan Data

Data anda boleh dikongsi dengan penyelidik yang berwenang, institusi akademik, pentadbir platform, dan kakitangan sokongan teknikal. Data boleh diungkap jika diperlukan oleh penguat kuasa undang-undang atau tanggungjawab undang-undang.

7. Kandungan Yang Dihasilkan Pengguna

Pengguna mengekalkan kepunyaan kandungan yang dihantar. Dengan menghantar kandungan, pengguna memberikan lesen bukan eksklusif, seluruh dunia, tanpa royalti untuk penggunaan dalam penyelidikan, pelaporan, pendidikan, dan pemuliharaan.

8. Keselamatan Data

Kami melaksanakan langkah keselamatan yang sesuai termasuk pengesahan, kawalan akses, kebenaran berasaskan peranan, penghantaran data selamat, pemantauan sistem, dan kemas kini berkala. Walau bagaimanapun, tiada sistem yang selamat sepenuhnya.

9. Penahanan Data

Data peribadi dikekalkan hanya selama yang diperlukan untuk tujuan penyelidikan, operasi, dan undang-undang. Data boleh dikekalkan lebih lama untuk set data saintifik dan kesinambungan penyelidikan institusi.

10. Hak Pengguna

Pengguna mungkin mempunyai hak untuk mengakses data peribadi mereka, meminta pembetulan, meminta pemadaman (tertakluk kepada kekangan penyelidikan/undang-undang), dan menarik balik persetujuan. Permohonan harus dihantar kepada pemilik projek (UMT).

11. Perkhidmatan Pihak Ketiga

Platform mungkin menggunakan perkhidmatan pihak ketiga seperti perkhidmatan peta, perkhidmatan pengesahan, pembekal infrastruktur awan, dan perkhidmatan AI. Pembekal ini beroperasi di bawah dasar privasi mereka sendiri.

12. Pemprosesan AI (Jika Berkenaan)

Di mana teknologi AI digunakan, hasil dijana secara automatik dan mungkin tidak sentiasa tepat. Pengguna tidak seharusnya bergantung sepenuhnya pada maklumat yang dijana AI.

13. Pemindahan Data Antarabangsa

Jika berkenaan, data boleh diproses dalam persekitaran awan yang terletak di luar Malaysia. Semua pengendalian data akan mengikuti langkah berjaga-jaga dan keperluan keselamatan yang sesuai.

14. Perubahan Kepada Dasar Ini

Dasar Privasi ini boleh dikemas kini dari semasa ke semasa untuk mencerminkan perubahan undang-undang, penambahbaikan platform, dan kemas kini operasi.

15. Maklumat Hubungan

Untuk pertanyaan atau permintaan berkaitan privasi:
Pemilik Projek: Universiti Malaysia Terengganu (UMT)
Rakan Teknikal: Dsigncodehub`

export function PrivacyScreen() {
  const { t, i18n } = useTranslation()
  const content = i18n.language === 'ms' ? PRIVACY_MS : PRIVACY_EN

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('legal.privacyTitle')}</Text>
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
