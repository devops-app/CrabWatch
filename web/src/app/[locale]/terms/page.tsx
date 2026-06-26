import { notFound } from 'next/navigation'
import fs from 'fs'
import path from 'path'
import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

function mdToHtml(md: string): string {
  let html = md
    .replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold text-[#2c5282] mt-6 mb-3">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-semibold text-[#2c5282] mt-8 mb-4">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold text-[#1e3a5f] mb-6">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#1e3a5f]">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.*$)/gm, '<li class="mb-2 text-[#4a5568]">$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul class="list-disc pl-6 my-4">$1</ul>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')

  const ulRegex = /(<ul>.*?<\/ul>)/gs
  let match
  while ((match = ulRegex.exec(html)) !== null) {
    html = html.replace(match[0], match[0].replace(/<\/ul><br\/><br\/><ul>/g, ''))
  }

  return html
}

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
  const html = mdToHtml(md)

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-50 to-ocean-100">
      <div className="max-w-3xl mx-auto py-12 px-4">
        <Link
          href="/auth/register"
          className="inline-flex items-center text-ocean-600 hover:text-ocean-800 mb-8"
        >
          {t('backToRegistration')}
        </Link>

        <div
          className="bg-white rounded-xl shadow-lg p-8"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
