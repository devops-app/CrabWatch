import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'

const CONSENT_EN = `Welcome to CRABWATCH!

By downloading, registering, or using this application, you join a global community of citizen scientists. Please read how we protect your data and how your contributions help marine research and conservation.

The CRABWATCH platform is owned and governed by Universiti Malaysia Terengganu (UMT) as the Data Controller, with technical infrastructure and hosting support provided by Dsigncodehub as the Technical Service Provider.

---

Terms & Conditions (User Agreement)

Eligibility & Community Standards

Age Requirement: You must be at least 13 years old to create an account. If you are under 18, you represent that you have your parent or guardian's permission to use the app.

Community Curation & Data Accuracy: CRABWATCH relies on crowd-sourced data. You confirm that the information you provide is accurate and that you have the right to submit it. Scientists and community experts may review, re-identify, or update the species classification and data quality tier of your uploads.

---

Open Access & Creative Commons Licensing

Your Ownership: You retain copyright ownership of every photo you upload.

Open Science License: By uploading media to CRABWATCH, you grant a Creative Commons Attribution-NonCommercial (CC BY-NC 4.0) license to CRABWATCH and its affiliated research community. This allows them to freely use, share, aggregate, and analyze your photos for research, education, reporting, and conservation, provided they credit the platform/user and do not use it for commercial profit.

---

Acceptable Use & Intellectual Property

You agree to only upload original photos of crabs and related marine life.
Uploading spam, copyrighted images belonging to others, or offensive content will result in immediate account termination.

App Intellectual Property: All software, code, algorithms, logos, and UI designs within CRABWATCH belong exclusively to UMT. You agree not to copy, modify, distribute, or reverse-engineer the application.

---

Field Safety & Limitation of Liability (Disclaimers)

Physical Safety Warning: CRABWATCH is intended for use in outdoor and marine environments. Do not use the app while driving, operating boats, navigating hazardous terrain, or handling dangerous wildlife.

Assumption of Risk: You assume all risks associated with your fieldwork. UMT, its technical partner, and project affiliates are not liable for any personal injury, death, property damage (e.g., water-damaged phones), or loss of income incurred while collecting data or using this app.

Data "As-Is": The platform, including species identification and length estimation features, is provided on an "As-Is" basis without warranty. AI-assisted insights may not always be accurate and should not be relied upon as definitive scientific conclusions or for commercial/safety decisions.

---

Privacy Statement

In compliance with the Malaysian Personal Data Protection Act 2010 (PDPA) and applicable data protection laws, this statement outlines how your personal data is collected, processed, and secured.

---

Location Data & Geo-Privacy

CRABWATCH records GPS coordinates when you submit an observation.

Researcher Access: Precise GPS data is accessible only to authorised researchers, administrators, and technical support personnel (Dsigncodehub) for system operations and scientific modeling.

Public Display Privacy: Public maps and dashboards will obscure or blur precise coordinates to protect your privacy.

---

Information We Collect & How It Is Used

The platform may collect:

Account Data: Name/username, email address, secure login credentials.

Observation Metadata: Images, GPS location, species data, measurement data, timestamps.

Analytics / Technical Data: Device data, crash logs, usage logs, IP address (where applicable).

---

Data Sharing & Open Data Repositories

No Commercial Selling: Your personal data will never be sold or used for commercial marketing.

Global Biodiversity Networks: Anonymized data may be shared with research networks, repositories, and funding partners.

Legal Obligation: Data may be disclosed if required by law.

International Cloud Transfer: Data may be processed in cloud environments outside Malaysia under appropriate safeguards.

---

Data Security & Retention

Security Measures: Includes role-based access control, secure transmission, and monitoring. However, no system is completely secure.

Retention Policy: Personal data is retained as necessary. Upon deletion:
- Personal identifiers (name, email) are erased.
- Anonymized scientific data may remain for research continuity.

---

Your Rights & Contact Information

Under the PDPA 2010, you have the right to:
- Access your personal data
- Correct inaccuracies
- Withdraw consent

For inquiries, contact Universiti Malaysia Terengganu (UMT) or Dsigncodehub.

---

Governing Law

These terms are governed by the laws of Malaysia.

---

USER CONSENT

By clicking "I Agree", you confirm that:

- You grant a CC BY-NC 4.0 license for your uploaded data.
- You consent to processing of personal, technical, and GPS data under PDPA 2010.
- You accept full responsibility for your physical safety during data collection.
- You confirm that all information provided is accurate and meet age requirements.`

const CONSENT_MS = `Selamat Datang ke CRABWATCH!

Dengan memuat turun, mendaftar, atau menggunakan aplikasi ini, anda menyertai komuniti saintis warganegara global. Sila baca bagaimana kami melindungi data anda dan bagaimana sumbangan anda membantu penyelidikan dan pemuliharaan marin.

Platform CRABWATCH dimiliki dan ditadbir oleh Universiti Malaysia Terengganu (UMT) sebagai Pengawal Data, dengan sokongan infrastruktur teknikal dan hos disediakan oleh Dsigncodehub sebagai Pembekal Perkhidmatan Teknikal.

Terma & Syarat (Perjanjian Pengguna)

Kelayakan & Piawaian Komuniti

Keperluan Umur: Anda mestilah berumur sekurang-kurangnya 13 tahun untuk membuat akaun. Jika anda di bawah 18 tahun, anda menyatakan bahawa anda mempunyai kebenaran ibu bapa atau penjaga anda untuk menggunakan aplikasi ini.

Kurasi Komuniti & Ketepatan Data: CRABWATCH bergantung pada data yang dikumpulkan secara berkumpulan. Anda mengesahkan bahawa maklumat yang anda berikan adalah tepat dan bahawa anda mempunyai hak untuk menghantarnya. Ahli sains dan pakar komuniti mungkin meninjau, mengenal pasti semula, atau mengemas kini pengelasan spesies dan tahap kualiti data muat naik anda.

Akses Terbuka & Perlesenan Creative Commons

Hak Milik Anda: Anda mengekalkan hak cipta ke atas setiap foto yang anda muat naik.

Lesen Sains Terbuka: Dengan memuat naik media ke CRABWATCH, anda memberikan lesen Creative Commons Attribution-NonCommercial (CC BY-NC 4.0) kepada CRABWATCH dan komuniti penyelidikan afiliasinya. Ini membolehkan mereka menggunakan, berkongsi, mengagregat, dan menganalisis foto anda secara bebas untuk penyelidikan, pendidikan, pelaporan, dan pemuliharaan, dengan syarat mereka memberikan kredit kepada platform/pengguna dan tidak menggunakannya untuk keuntungan perdagangan.

Penggunaan yang Dibenarkan & Harta Intelektual

Anda bersetuju untuk hanya memuat naik foto asli ketam dan kehidupan marin berkaitan.
Muat naik spam, imej hak cipta yang milik orang lain, atau kandungan yang menyinggung perasaan akan mengakibatkan penamatan akaun serta-merta.

Harta Intelektual Aplikasi: Semua perisian, kod, algoritma, logo, dan reka bentuk UI dalam CRABWATCH adalah milik eksklusif UMT. Anda bersetuju untuk tidak menyalin, mengubah suai, mengedarkan, atau melakukan kejuruteraan songsang aplikasi ini.

Keselamatan Lapangan & Had Tanggungjawab (Penafian)

Amaran Keselamatan Fizikal: CRABWATCH dimaksudkan untuk digunakan dalam persekitaran luar dan marin. Keselamatan adalah keutamaan. Jangan gunakan aplikasi ini semasa memandu, mengendalikan bot, menavigasi terrain berbahaya, atau mengendalikan hidupan liar yang berbahaya.

Penerimaan Risiko: Anda menanggung semua risiko yang berkaitan dengan kerja lapangan anda. UMT, rakan teknikalnya, dan afilias projek tidak bertanggungjawab ke atas sebarang kecederaan peribadi, kematian, kerosakan harta benda (contohnya, telefon yang rosak air), atau kehilangan pendapatan yang dialami semasa mengumpul data atau menggunakan aplikasi ini.

Data "Sebagaimana Ada": Platform ini, termasuk ciri pengenalpastian spesies dan anggaran panjang, disediakan atas asas "Sebagaimana Ada" tanpa jaminan. Sebarang wawasan berasaskan AI atau pengiraan automatik adalah alat untuk bantuan penyelidikan; ia mungkin tidak sentiasa tepat dan tidak harus bergantung sepenuhnya sebagai kesimpulan saintifik yang muktamad atau membimbing sebarang keputusan perdagangan/keselamatan.

Penyata Privasi

Bersesuaian dengan Akta Perlindungan Data Peribadi 2010 Malaysia (PDPA) dan undang-undang perlindungan data yang terpakai, penyata ini merumuskan bagaimana data peribadi anda dikumpulkan, diproses, dan dilindungi.

Data Lokasi & Privasi Geo

Untuk memetakan populasi ketam, CRABWATCH merakam koordinat GPS apabila anda menghantar pemerhatian. Kami sedar bahawa koordinat tepat boleh menjadi sensitif (contohnya, titik memancing proprietari atau harta peribadi).

Akses Penyelidik: Data GPS tepat disalurkan dengan selamat kepada penyelidik yang diberi kuasa, pentadbir, dan kakitangan sokongan teknikal (Dsigncodehub) semata-mata untuk operasi sistem, validasi, dan pemodelan saintifik.

Privasi Paparan Awam: Sebarang peta yang berhadap awam, pameran projek, atau dasbor data akan mengaburkan atau mengecilkan koordinat tepat untuk melindungi privasi anda dan menghalang eksploitasi berlebihan titik memancing ketam tempatan tertentu.

Maklumat Kami Kumpulkan & Bagaimana Ia Digunakan

Platform mungkin mengumpul dan memproses kategori data berikut untuk pengurusan akaun, penyelidikan, dan penambahbaikan platform:

Data Akaun: Nama/nama pengguna anda, alamat e-mel, dan kelayakan log masuk yang selamat.

Metadata Pemerhatian: Imej yang dimuat naik, geolokasi (GPS), maklumat spesies, data pengukuran (contohnya, panjang karapas, jantina), dan cap masa penghantaran.

Data Analitik / Teknikal: Data peranti automatik asas (contohnya, OS telefon, log kerosakan), data log/penggunaan, dan alamat IP (di mana berkenaan) untuk mengoptimumkan kestabilan aplikasi.

Perkongsian Data & Repositori Data Terbuka

Tiada Jualan Comercial: Data peribadi anda (e-mel, nama) tidak akan dijual atau digunakan untuk pemasaran perdagangan.

Rangkaian Keanekaragaman Hayati Global: Data saintifik yang disamarkan atau diagregat boleh diterbitkan dalam output penyelidikan atau dikongsi dengan rangkaian pemuliharaan antarabangsa, repositori sains terbuka, dan rakan kewangan seperti YELL untuk memupuk penyelidikan global yang telus.

Kewajipan Undang-undang: Kami berhak mendedahkan data anda jika diperlukan oleh agensi penguatkuasaan undang-undang, badan peraturan, atau kewajipan undang-undang.

Pemindahan Awan Antarabangsa: Data boleh diproses dan dihoskan dalam persekitaran awan yang terletak di luar Malaysia oleh pembekal infrastruktur perkhidmatan pihak ketiga (seperti perkhidmatan peta dan awan), yang beroperasi di bawah langkah berjaga-jaga yang sesuai.

Keselamatan Data & Penahanan

Langkah Keselamatan: Kami melaksanakan langkah keselamatan yang sesuai termasuk kebenaran berasaskan peranan, kawalan akses, transmisi data selamat, dan pemantauan sistem. Walau bagaimanapun, tiada sistem yang selamat sepenuhnya, dan pengguna mengakui risiko transmisi data yang inheren.

Dasar Penahanan: Data peribadi dikekalkan hanya selagi perlu untuk tujuan operasi, penyelidikan, dan undang-undang. Jika anda meminta pemadaman akaun, butiran peribadi anda (nama, e-mel) akan dipadamkan secara kekal, walaupun data biologi dan imej yang disamarkan boleh dikekalkan lebih lama untuk kesinambungan penyelidikan institusi dan set data saintifik.

Hak Anda & Maklumat Hubungan

Di bawah PDPA 2010, anda mempunyai hak untuk mengakses data peribadi anda, membetulkan ketidaktepatan, atau menarik balik kebenaran anda. Jika anda meminta pemadaman akaun, butiran peribadi anda (nama, e-mel) akan dipadamkan secara kekal dari sistem kami, walaupun imej ketam yang disamarkan mungkin kekal sebagai sebahagian daripada set data saintifik kolektif.

Dasar ini boleh dikemas kini secara berkala untuk mencerminkan penambahbaikan undang-undang atau platform.

Untuk pertanyaan berkaitan privasi, permintaan akses data, atau pembetulan, sila hubungi Universiti Malaysia Terengganu (UMT) atau rakan teknikal Dsigncodehub.

Undang-undang Pentadbiran

Terma ini ditadbir dan ditafsirkan mengikut undang-undang Malaysia, dan sebarang pertikaian akan tertakluk pada yurisdiksi eksklusif mahkamah Malaysia.

KEBENARAN PENGGUNA

Dengan mengklik "Saya Bersetuju", anda mengesahkan bahawa:

• Anda memberikan lesen CC BY-NC 4.0 untuk data saintifik dan media yang dimuat naik untuk digunakan dalam penyelidikan, pelaporan, dan pemuliharaan.
• Anda bersetuju dengan pemprosesan data peribadi, data teknikal, dan lokasi GPS anda yang mematuhi PDPA 2010 dan protokol pemprosesan awan antarabangsa.
• Anda menerima penuh tanggungjawab untuk keselamatan fizikal anda semasa pengumpulan data, mengenali risiko teknikal inheren platform, dan melepaskan UMT serta rakan-rakannya daripada tanggungjawab.
• Anda mengesahkan bahawa semua maklumat yang diberikan adalah tepat dan anda memenuhi keperluan umur minimum yang dinyatakan di atas.`

export function ConsentScreen() {
  const { t, i18n } = useTranslation()
  const content = i18n.language === 'ms' ? CONSENT_MS : CONSENT_EN

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{t('legal.consentTitle')}</Text>
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
