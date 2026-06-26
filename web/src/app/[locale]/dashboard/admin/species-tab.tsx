'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import type { SpeciesResponse, KeyFeature, DistributionZone } from '@crabwatch/shared'

interface ConfirmState {
  title: string
  message: string
  confirmText: string
  onConfirm: () => Promise<void> | void
  danger?: boolean
  inputPlaceholder?: string
  inputLabel?: string
  requiresInput?: boolean
}

interface SpeciesTabProps {
  flash: (msg: string, type: 'error' | 'success') => void
  onConfirm: (state: ConfirmState) => void
  onReload: () => void
}

function parseKeyFeatures(text: string): KeyFeature[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(':')
      if (idx === -1) return { trait: line, value: '' }
      return { trait: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() }
    })
}

function parseDistributionZones(text: string): DistributionZone[] {
  return text
    .split('\n')
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({ name, polygon: [] }))
}

function formatKeyFeatures(features: KeyFeature[]): string {
  return features.map((f) => `${f.trait}: ${f.value}`).join('\n')
}

function formatDistributionZones(zones: DistributionZone[]): string {
  return zones.map((z) => z.name).join('\n')
}

export function SpeciesTab({ flash, onConfirm, onReload }: SpeciesTabProps): React.JSX.Element {
  const t = useTranslations('admin.species')
  const tAdmin = useTranslations('admin')
  const tCommon = useTranslations('common')
  const [species, setSpecies] = useState<SpeciesResponse[]>([])
  const [loading, setLoading] = useState(true)

  const [speciesFormOpen, setSpeciesFormOpen] = useState(false)
  const [editingSpecies, setEditingSpecies] = useState<SpeciesResponse | null>(null)
  const [formScientificName, setFormScientificName] = useState('')
  const [formCommonName, setFormCommonName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formKeyFeatures, setFormKeyFeatures] = useState<KeyFeature[]>([])
  const [formImages, setFormImages] = useState<string[]>([])
  const [formDistributionZones, setFormDistributionZones] = useState<DistributionZone[]>([])
  const [formSaving, setFormSaving] = useState(false)

  const loadSpecies = async () => {
    setLoading(true)
    try {
      const data = await api.listSpecies()
      setSpecies(data)
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : t('loadFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadSpecies() }, [])

  const openAddSpecies = () => {
    setEditingSpecies(null)
    setFormScientificName('')
    setFormCommonName('')
    setFormDescription('')
    setFormKeyFeatures([])
    setFormImages([])
    setFormDistributionZones([])
    setSpeciesFormOpen(true)
  }

  const openEditSpecies = (s: SpeciesResponse) => {
    setEditingSpecies(s)
    setFormScientificName(s.scientificName)
    setFormCommonName(s.commonName)
    setFormDescription(s.description)
    setFormKeyFeatures(s.keyFeatures || [])
    setFormImages(s.images || [])
    setFormDistributionZones(s.distributionZones || [])
    setSpeciesFormOpen(true)
  }

  const closeSpeciesForm = () => {
    setSpeciesFormOpen(false)
    setEditingSpecies(null)
  }

  const handleSaveSpecies = async () => {
    if (!formScientificName.trim() || !formCommonName.trim()) {
      flash(t('requiredNames'), 'error')
      return
    }
    setFormSaving(true)
    try {
      const body = {
        scientificName: formScientificName.trim(),
        commonName: formCommonName.trim(),
        description: formDescription.trim(),
        keyFeatures: formKeyFeatures,
        images: formImages,
        distributionZones: formDistributionZones,
      }
      if (editingSpecies) {
        await api.updateSpecies(editingSpecies.id, body)
        flash(t('updated'), 'success')
      } else {
        await api.createSpecies(body)
        flash(t('created'), 'success')
      }
      closeSpeciesForm()
      loadSpecies()
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : t('saveFailed'), 'error')
    } finally {
      setFormSaving(false)
    }
  }

  const handleDeleteSpecies = (s: SpeciesResponse) => {
    onConfirm({
      title: t('delete'),
      message: `Are you sure you want to delete "${s.scientificName}"? This will permanently remove it. Type "delete" to confirm.`,
      confirmText: t('delete'),
      danger: true,
      requiresInput: true,
      inputPlaceholder: 'Type "delete" to confirm',
      inputLabel: tAdmin('confirmation'),
      onConfirm: async () => {
        await api.deleteSpecies(s.id)
        onReload()
      },
    })
  }

  if (loading) return <LoadingSkeleton />

  return (
    <>
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-ocean-800">{t('guideTitle')}</h2>
          <button onClick={openAddSpecies} className="btn-primary text-sm">{t('addButton')}</button>
        </div>
        {species.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">{t('noSpecies')}</p>
        ) : (
          <div className="space-y-4">
            {species.map((s) => (
              <div key={s.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-ocean-800 italic">{s.scientificName}</h3>
                    <p className="text-gray-600">{s.commonName}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditSpecies(s)} className="text-sm text-ocean-600 hover:underline">{tCommon('edit')}</button>
                    <button onClick={() => handleDeleteSpecies(s)} className="text-sm text-red-600 hover:underline">{t('delete')}</button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{s.description}</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-400">
                  <span>{s.keyFeatures.length} {t('features')}</span>
                  <span>{s.images.length} {t('images')}</span>
                  <span>{s.distributionZones.length} {t('zones')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {speciesFormOpen && (
        <SpeciesFormModal
          editingSpecies={editingSpecies}
          formScientificName={formScientificName}
          formCommonName={formCommonName}
          formDescription={formDescription}
          formKeyFeatures={formKeyFeatures}
          formImages={formImages}
          formDistributionZones={formDistributionZones}
          formSaving={formSaving}
          onScientificNameChange={setFormScientificName}
          onCommonNameChange={setFormCommonName}
          onDescriptionChange={setFormDescription}
          onKeyFeaturesChange={setFormKeyFeatures}
          onImagesChange={setFormImages}
          onDistributionZonesChange={setFormDistributionZones}
          onSave={handleSaveSpecies}
          onClose={closeSpeciesForm}
          flash={flash}
        />
      )}
    </>
  )
}

function SpeciesFormModal({
  editingSpecies,
  formScientificName,
  formCommonName,
  formDescription,
  formKeyFeatures,
  formImages,
  formDistributionZones,
  formSaving,
  onScientificNameChange,
  onCommonNameChange,
  onDescriptionChange,
  onKeyFeaturesChange,
  onImagesChange,
  onDistributionZonesChange,
  onSave,
  onClose,
  flash,
}: {
  editingSpecies: SpeciesResponse | null
  formScientificName: string
  formCommonName: string
  formDescription: string
  formKeyFeatures: KeyFeature[]
  formImages: string[]
  formDistributionZones: DistributionZone[]
  formSaving: boolean
  onScientificNameChange: (v: string) => void
  onCommonNameChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onKeyFeaturesChange: (v: KeyFeature[]) => void
  onImagesChange: (v: string[]) => void
  onDistributionZonesChange: (v: DistributionZone[]) => void
  onSave: () => void
  onClose: () => void
  flash: (msg: string, type: 'error' | 'success') => void
}) {
  const t = useTranslations('admin.species')
  const [imageUrl, setImageUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const MAX_IMAGES = 10

  const handleFileUpload = async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      flash(t('imageUploadInvalidType'), 'error')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      flash(t('imageUploadTooLarge'), 'error')
      return
    }
    if (formImages.length >= MAX_IMAGES) {
      flash(t('imageUploadMaxReached', { count: MAX_IMAGES }), 'error')
      return
    }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const res = await api.getUploadUrl(`${Date.now()}.${ext}`, file.type) as { uploadUrl: string; blobUrl: string }
      await fetch(res.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      const blobUrl = res.blobUrl
      onImagesChange([...formImages, blobUrl])
      flash(t('imageUploadSuccess'), 'success')
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : t('imageUploadFailed'), 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleAddImageUrl = useCallback(() => {
    const url = imageUrl.trim()
    if (url) {
      if (formImages.length >= MAX_IMAGES) {
        flash(t('imageUploadMaxReached', { count: MAX_IMAGES }), 'error')
        return
      }
      onImagesChange([...formImages, url])
      setImageUrl('')
    }
  }, [imageUrl, formImages, onImagesChange, flash, t])

  const removeImage = (idx: number) => {
    onImagesChange(formImages.filter((_, i) => i !== idx))
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-ocean-900 mb-4">
          {editingSpecies ? t('editSpecies') : t('addSpecies')}
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('scientificName')} *</label>
              <input type="text" value={formScientificName} onChange={(e) => onScientificNameChange(e.target.value)} className="input-field" placeholder="Scylla serrata" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('commonName')} *</label>
              <input type="text" value={formCommonName} onChange={(e) => onCommonNameChange(e.target.value)} className="input-field" placeholder="Blue swimmer crab" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('description')}</label>
            <textarea value={formDescription} onChange={(e) => onDescriptionChange(e.target.value)} className="input-field" rows={3} placeholder="Species description..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('keyFeatures')}</label>
            <p className="text-xs text-gray-400 mb-1">{t('keyFeaturesHint')}</p>
            <textarea
              value={formatKeyFeatures(formKeyFeatures)}
              onChange={(e) => onKeyFeaturesChange(parseKeyFeatures(e.target.value))}
              className="input-field text-sm"
              rows={3}
              placeholder="Color: Blue-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('imagesLabel')}</label>
            {formImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {formImages.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img src={url} alt={`Image ${idx + 1}`} className="w-20 h-20 object-cover rounded-lg border" />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title={t('imageRemove')}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 items-center">
              <span className="text-xs text-gray-500">{formImages.length}/{MAX_IMAGES} {t('images')}</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileUpload(file)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || formImages.length >= MAX_IMAGES}
                className="px-3 py-1.5 text-sm bg-ocean-100 text-ocean-700 rounded-lg hover:bg-ocean-200 transition-colors disabled:opacity-50"
              >
                {uploading ? t('imageUploadUploading') : t('imageUploadBtn')}
              </button>
              <span className="text-xs text-gray-400">{t('imageOr')}</span>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="input-field flex-1 text-sm"
                placeholder={t('imageUrlPlaceholder')}
                disabled={formImages.length >= MAX_IMAGES}
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                disabled={!imageUrl.trim() || formImages.length >= MAX_IMAGES}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {t('imageAddUrl')}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('distributionZones')}</label>
            <p className="text-xs text-gray-400 mb-1">{t('distributionZonesHint')}</p>
            <textarea
              value={formatDistributionZones(formDistributionZones)}
              onChange={(e) => onDistributionZonesChange(parseDistributionZones(e.target.value))}
              className="input-field text-sm"
              rows={2}
              placeholder="Gulf of Thailand"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={formSaving} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg transition-colors disabled:opacity-50">{t('cancel')}</button>
          <button onClick={onSave} disabled={formSaving} className="px-4 py-2 text-sm text-white bg-ocean-600 rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50">
            {formSaving ? t('saving') : editingSpecies ? t('update') : t('create')}
          </button>
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded" />
        ))}
      </div>
    </div>
  )
}

