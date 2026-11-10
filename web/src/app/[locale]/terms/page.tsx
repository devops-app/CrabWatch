import { notFound } from 'next/navigation'
import fs from 'fs'
import path from 'path'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import LegalDocument from '@/components/legal/LegalDocument'

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('auth.register')
  const validLocales = ['en', 'ms']

  if (!validLocales.includes(locale)) {
    notFound()
  }

  const filePath = path.join(process.cwd(), 'public', 'legal', locale, 'consent.md')

  if (!fs.existsSync(filePath)) {
    notFound()
  }

  const md = fs.readFileSync(filePath, 'utf-8')

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-50 to-ocean-100">
      <div className="max-w-3xl mx-auto py-12 px-4">
        <Link
          href="/auth/register"
          className="inline-flex items-center text-ocean-600 hover:text-ocean-800 mb-8"
        >
          {t('backToRegistration')}
        </Link>

        <LegalDocument markdown={md} />
      </div>
    </div>
  )
}
