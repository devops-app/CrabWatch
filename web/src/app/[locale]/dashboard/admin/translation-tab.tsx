'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useFormatters } from '@/hooks/useFormatters'
import { api } from '@/lib/api'
import type { TranslationDto } from '@crabwatch/shared'

interface TranslationsTabProps {
  flash: (msg: string, type: 'error' | 'success') => void
}

interface TranslatableModel {
  model: string
  fields: string[]
}

export function TranslationsTab({ flash }: TranslationsTabProps): React.JSX.Element {
  const t = useTranslations('admin.engagement.translations')
  const loadFailedMessage = t('loadFailed')
  const fmt = useFormatters()
  const localeLabel = (locale: string) => {
    if (locale === 'en') return t('localeNames.en')
    if (locale === 'ms') return t('localeNames.ms')
    return locale
  }
  const [translations, setTranslations] = useState<TranslationDto[]>([])
  const [loading, setLoading] = useState(true)
  const [models, setModels] = useState<TranslatableModel[]>([])
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 })

  // Filters
  const [filterLocale, setFilterLocale] = useState('')
  const [filterResourceType, setFilterResourceType] = useState('')
  const [filterField, setFilterField] = useState('')

  // Form state
  const [formOpen, setFormOpen] = useState(false)
  const [editingTranslation, setEditingTranslation] = useState<TranslationDto | null>(null)
  const [formLocale, setFormLocale] = useState('ms')
  const [formResourceType, setFormResourceType] = useState('')
  const [formResourceId, setFormResourceId] = useState('')
  const [formField, setFormField] = useState('')
  const [formValue, setFormValue] = useState('')
  const [formSaving, setFormSaving] = useState(false)

  // Bulk import state
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkSaving, setBulkSaving] = useState(false)

  // Available fields for selected model
  const availableFields = models.find(m => m.model === filterResourceType)?.fields || []

  // Coverage: count of EN translations vs target locale translations per resourceType/field
  const [coverage, setCoverage] = useState<Record<string, { total: number; translated: number }>>({})

  // Compute coverage from translations data
  useEffect(() => {
    if (translations.length === 0) return
    const enFields = new Set<string>()
    const localeFields = new Map<string, Set<string>>()
    for (const tr of translations) {
      const key = `${tr.resourceType}::${tr.field}`
      if (tr.locale === 'en') {
        enFields.add(key)
      }
      if (tr.locale !== 'en') {
        if (!localeFields.has(tr.locale)) localeFields.set(tr.locale, new Set())
        localeFields.get(tr.locale)!.add(key)
      }
    }
    const cov: Record<string, { total: number; translated: number }> = {}
    for (const [locale, fields] of localeFields.entries()) {
      cov[locale] = {
        total: enFields.size,
        translated: fields.size,
      }
    }
    setCoverage(cov)
  }, [translations])

  const loadTranslations = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.listTranslations({
        locale: filterLocale || undefined,
        resourceType: filterResourceType || undefined,
        field: filterField || undefined,
        page: pagination.page,
        limit: pagination.limit,
      })
      setTranslations(data.data || [])
      setPagination(p => ({
        ...p,
        total: data.pagination?.total ?? 0,
        totalPages: data.pagination?.totalPages ?? 1,
      }))
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : loadFailedMessage, 'error')
    } finally {
      setLoading(false)
    }
  }, [filterLocale, filterResourceType, filterField, pagination.page, pagination.limit, flash, loadFailedMessage])

  const loadModels = useCallback(async () => {
    try {
      const data = await api.getTranslatableModels() as { data: TranslatableModel[] }
      setModels(data.data || [])
    } catch (err: unknown) {
      // Silently fail - models list is optional
    }
  }, [])

  useEffect(() => { loadTranslations() }, [loadTranslations])
  useEffect(() => { loadModels() }, [loadModels])

  const openAddForm = () => {
    setEditingTranslation(null)
    setFormLocale('ms')
    setFormResourceType(filterResourceType || '')
    setFormResourceId('')
    setFormField('')
    setFormValue('')
    setFormOpen(true)
  }

  const openEditForm = (tr: TranslationDto) => {
    setEditingTranslation(tr)
    setFormLocale(tr.locale)
    setFormResourceType(tr.resourceType)
    setFormResourceId(tr.resourceId)
    setFormField(tr.field)
    setFormValue(tr.value)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingTranslation(null)
  }

  const handleSave = async () => {
    if (!formResourceType || !formField || !formValue.trim()) return
    setFormSaving(true)
    try {
      if (editingTranslation) {
        await api.updateTranslation(editingTranslation.id, { value: formValue.trim() })
        flash(t('updateSuccess'), 'success')
      } else {
        await api.createTranslation({
          locale: formLocale,
          resourceType: formResourceType,
          resourceId: formResourceId,
          field: formField,
          value: formValue.trim(),
        })
        flash(t('createSuccess'), 'success')
      }
      closeForm()
      loadTranslations()
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : t('saveFailed'), 'error')
    } finally {
      setFormSaving(false)
    }
  }

  const handleDelete = async (tr: TranslationDto) => {
    if (!confirm(t('confirmDelete'))) return
    try {
      await api.deleteTranslation(tr.id)
      flash(t('deleteSuccess'), 'success')
      loadTranslations()
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : t('deleteFailed'), 'error')
    }
  }

  const handleBulkImport = async () => {
    setBulkSaving(true)
    try {
      const parsed = JSON.parse(bulkText)
      const translations = Array.isArray(parsed) ? parsed : parsed.translations
      if (!Array.isArray(translations)) throw new Error(t('invalidFormat'))
      await api.bulkCreateTranslations({ translations })
      setBulkOpen(false)
      setBulkText('')
      flash(t('bulkSuccess'), 'success')
      loadTranslations()
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : t('bulkFailed'), 'error')
    } finally {
      setBulkSaving(false)
    }
  }

  const handlePageChange = (page: number) => {
    setPagination(p => ({ ...p, page }))
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ocean-900">{t('title')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('description')}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setBulkOpen(true)}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t('bulkImport')}
          </button>
          <button
            onClick={openAddForm}
            className="px-3 py-2 text-sm bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors"
          >
            {t('addTranslation')}
          </button>
        </div>
      </div>

      {/* Coverage Summary */}
      {Object.keys(coverage).length > 0 && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          {Object.entries(coverage).map(([locale, { total, translated }]) => {
            const pct = total > 0 ? Math.round((translated / total) * 100) : 0
            return (
              <div key={locale} className={`rounded-lg p-4 border ${pct === 100 ? 'border-green-200 bg-green-50' : pct >= 70 ? 'border-yellow-200 bg-yellow-50' : 'border-red-200 bg-red-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{localeLabel(locale)}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${pct === 100 ? 'bg-green-200 text-green-800' : pct >= 70 ? 'bg-yellow-200 text-yellow-800' : 'bg-red-200 text-red-800'}`}>
                    {pct}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${pct === 100 ? 'bg-green-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {t('coverageSummary', { translated, total })}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('filters.locale')}</label>
          <select
            value={filterLocale}
            onChange={(e) => { setFilterLocale(e.target.value); setPagination(p => ({ ...p, page: 1 })) }}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400"
          >
            <option value="">{t('filters.allLocales')}</option>
            <option value="en">{t('localeNames.en')}</option>
            <option value="ms">{t('localeNames.ms')}</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('filters.resourceType')}</label>
          <select
            value={filterResourceType}
            onChange={(e) => { setFilterResourceType(e.target.value); setPagination(p => ({ ...p, page: 1 })) }}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400"
          >
            <option value="">{t('filters.allTypes')}</option>
            {models.map(m => (
              <option key={m.model} value={m.model}>{m.model}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('filters.field')}</label>
          <select
            value={filterField}
            onChange={(e) => { setFilterField(e.target.value); setPagination(p => ({ ...p, page: 1 })) }}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400"
          >
            <option value="">{t('filters.allFields')}</option>
            {availableFields.map(f => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => { setFilterLocale(''); setFilterResourceType(''); setFilterField(''); setPagination(p => ({ ...p, page: 1 })) }}
            className="w-full px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t('filters.clear')}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('columns.locale')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('columns.resourceType')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('columns.field')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('columns.value')}</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">{t('columns.updatedAt')}</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">{t('columns.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">{t('loading')}</td></tr>
            ) : translations.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">{t('empty')}</td></tr>
            ) : (
              translations.map((tr) => (
                <tr key={tr.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${
                      tr.locale === 'ms' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {tr.locale}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{tr.resourceType}</td>
                  <td className="px-4 py-3">{tr.field}</td>
                  <td className="px-4 py-3 max-w-xs truncate" title={tr.value}>{tr.value}</td>
                  <td className="px-4 py-3 text-gray-500">{fmt.formatDate(new Date(tr.updatedAt))}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEditForm(tr)}
                      className="text-ocean-600 hover:text-ocean-800 text-xs mr-3"
                    >
                      {t('edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(tr)}
                      className="text-red-600 hover:text-red-800 text-xs"
                    >
                      {t('delete')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {t('pagination', { page: pagination.page, totalPages: pagination.totalPages, total: pagination.total })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('previous')}
            </button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              let p: number
              if (pagination.totalPages <= 5) {
                p = i + 1
              } else if (pagination.page <= 3) {
                p = i + 1
              } else if (pagination.page >= pagination.totalPages - 2) {
                p = pagination.totalPages - 4 + i
              } else {
                p = pagination.page - 2 + i
              }
              return (
                <button
                  key={p}
                  onClick={() => handlePageChange(p)}
                  className={`px-3 py-1 text-sm border rounded ${
                    p === pagination.page
                      ? 'bg-ocean-600 text-white border-ocean-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              )
            })}
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('next')}
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-ocean-900 mb-4">
              {editingTranslation ? t('editTitle') : t('addTitle')}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('form.locale')}</label>
                  <select
                    value={formLocale}
                    onChange={(e) => setFormLocale(e.target.value)}
                    disabled={!!editingTranslation}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400 disabled:opacity-50"
                  >
                    <option value="en">{t('localeNames.en')}</option>
                    <option value="ms">{t('localeNames.ms')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t('form.resourceType')}</label>
                  <select
                    value={formResourceType}
                    onChange={(e) => { setFormResourceType(e.target.value); setFormField('') }}
                    disabled={!!editingTranslation}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400 disabled:opacity-50"
                  >
                    <option value="">{t('form.selectModel')}</option>
                    {models.map(m => (
                      <option key={m.model} value={m.model}>{m.model}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('form.resourceId')}</label>
                <input
                  type="text"
                  value={formResourceId}
                  onChange={(e) => setFormResourceId(e.target.value)}
                  disabled={!!editingTranslation}
                  placeholder={t('form.resourceIdPlaceholder')}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('form.field')}</label>
                <select
                  value={formField}
                  onChange={(e) => setFormField(e.target.value)}
                  disabled={!!editingTranslation}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400 disabled:opacity-50"
                >
                  <option value="">{t('form.selectField')}</option>
                  {(models.find(m => m.model === formResourceType)?.fields || []).map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t('form.value')}</label>
                <textarea
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ocean-400"
                  placeholder={t('form.valuePlaceholder')}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeForm}
                disabled={formSaving}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={formSaving || !formResourceType || !formField || !formValue.trim()}
                className="px-4 py-2 text-sm text-white bg-ocean-600 rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50"
              >
                {formSaving ? t('saving') : (editingTranslation ? t('save') : t('create'))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {bulkOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-ocean-900 mb-4">{t('bulkTitle')}</h3>

            <p className="text-sm text-gray-500 mb-3">{t('bulkDescription')}</p>

            <div className="mb-3">
              <pre className="bg-gray-100 rounded-lg p-3 text-xs overflow-x-auto">
{`[
  {
    "locale": "ms",
    "resourceType": "Species",
    "resourceId": "uuid-here",
    "field": "commonName",
    "value": "Kepiting hijau"
  }
]`}
              </pre>
            </div>

            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={12}
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ocean-400"
              placeholder={t('bulkPlaceholder')}
            />

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setBulkOpen(false); setBulkText('') }}
                disabled={bulkSaving}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleBulkImport}
                disabled={bulkSaving || !bulkText.trim()}
                className="px-4 py-2 text-sm text-white bg-ocean-600 rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50"
              >
                {bulkSaving ? t('importing') : t('import')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
