'use client'

import { useState, useEffect } from 'react'
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

export function SpeciesTab({ flash, onConfirm, onReload }: SpeciesTabProps): React.JSX.Element {
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
      flash(err instanceof Error ? err.message : 'Failed to load species', 'error')
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
      flash('Scientific name and common name are required', 'error')
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
        flash('Species updated', 'success')
      } else {
        await api.createSpecies(body)
        flash('Species created', 'success')
      }
      closeSpeciesForm()
      loadSpecies()
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : 'Failed to save species', 'error')
    } finally {
      setFormSaving(false)
    }
  }

  const handleDeleteSpecies = (s: SpeciesResponse) => {
    onConfirm({
      title: 'Delete Species',
      message: `Are you sure you want to delete "${s.scientificName}"? This will permanently remove it. Type "delete" to confirm.`,
      confirmText: 'Delete Species',
      danger: true,
      requiresInput: true,
      inputPlaceholder: 'Type "delete" to confirm',
      inputLabel: 'Confirmation',
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
          <h2 className="text-xl font-semibold text-ocean-800">Species Guide</h2>
          <button onClick={openAddSpecies} className="btn-primary text-sm">+ Add Species</button>
        </div>
        {species.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No species found. Add one to get started.</p>
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
                    <button onClick={() => openEditSpecies(s)} className="text-sm text-ocean-600 hover:underline">Edit</button>
                    <button onClick={() => handleDeleteSpecies(s)} className="text-sm text-red-600 hover:underline">Delete</button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{s.description}</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-400">
                  <span>{s.keyFeatures.length} features</span>
                  <span>{s.images.length} images</span>
                  <span>{s.distributionZones.length} zones</span>
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
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-ocean-900 mb-4">
          {editingSpecies ? 'Edit Species' : 'Add Species'}
        </h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scientific Name *</label>
              <input type="text" value={formScientificName} onChange={(e) => onScientificNameChange(e.target.value)} className="input-field" placeholder="Scylla serrata" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Common Name *</label>
              <input type="text" value={formCommonName} onChange={(e) => onCommonNameChange(e.target.value)} className="input-field" placeholder="Blue swimmer crab" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={formDescription} onChange={(e) => onDescriptionChange(e.target.value)} className="input-field" rows={3} placeholder="Species description..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Key Features (JSON array: <code className="text-xs">{'[{"trait":"Color","value":"Blue-green"}]'}</code>)
            </label>
            <textarea
              value={JSON.stringify(formKeyFeatures, null, 2)}
              onChange={(e) => {
                try { onKeyFeaturesChange(JSON.parse(e.target.value || '[]')) } catch { /* ignore invalid JSON */ }
              }}
              className="input-field font-mono text-xs"
              rows={3}
              placeholder='[{"trait":"Carapace","value":"Round"}]'
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image URLs (one per line)</label>
            <textarea value={formImages.join('\n')} onChange={(e) => onImagesChange(e.target.value.split('\n').filter(Boolean))} className="input-field text-xs" rows={2} placeholder="https://example.com/image1.jpg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Distribution Zones (JSON array: <code className="text-xs">{'[{"name":"Gulf of Thailand","polygon":[[100.5,6.5],[100.6,6.5]]}]'}</code>)
            </label>
            <textarea
              value={JSON.stringify(formDistributionZones, null, 2)}
              onChange={(e) => {
                try { onDistributionZonesChange(JSON.parse(e.target.value || '[]')) } catch { /* ignore invalid JSON */ }
              }}
              className="input-field font-mono text-xs"
              rows={3}
              placeholder='[{"name":"Zone","polygon":[[100,6],[101,6],[101,7],[100,7]]}]'
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={formSaving} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={onSave} disabled={formSaving} className="px-4 py-2 text-sm text-white bg-ocean-600 rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50">
            {formSaving ? 'Saving...' : editingSpecies ? 'Update' : 'Create'}
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


