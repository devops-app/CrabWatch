import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useSpeciesStore } from '../../store/speciesStore'
import { api } from '../../services/api'
import { Button } from '../../components/common/Button'
import { Input } from '../../components/common/Input'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import type {
  CreateSpeciesInput,
  DistributionZone,
  KeyFeature,
  SpeciesResponse,
  UpdateSpeciesInput,
} from '@crabwatch/shared'
import type { RootStackParamList } from '../../navigation/types'

type SpeciesFormRouteProp = RouteProp<RootStackParamList, 'SpeciesForm'>

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

export function SpeciesFormScreen() {
  const { t } = useTranslation()
  const navigation = useNavigation()
  const route = useRoute<SpeciesFormRouteProp>()
  const speciesId = route.params?.speciesId

  const [scientificName, setScientificName] = useState('')
  const [commonName, setCommonName] = useState('')
  const [description, setDescription] = useState('')
  const [keyFeaturesText, setKeyFeaturesText] = useState('')
  const [distributionText, setDistributionText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [imageUrl, setImageUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const isEdit = !!speciesId

  useEffect(() => {
    if (isEdit && speciesId) {
      const species = useSpeciesStore.getState().getSpeciesById(speciesId)
      if (species) {
        populateForm(species)
      }
    }
    navigation.setOptions({
      title: isEdit ? t('admin.species.editTitle') : t('admin.species.addTitle'),
    })
  }, [])

  const populateForm = useCallback((species: SpeciesResponse) => {
    setScientificName(species.scientificName)
    setCommonName(species.commonName)
    setDescription(species.description || '')
    setKeyFeaturesText(formatKeyFeatures(species.keyFeatures || []))
    setDistributionText(formatDistributionZones(species.distributionZones || []))
    setImages(species.images || [])
  }, [])

  const pickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    })

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      const uri = asset.uri
      const fileName = asset.fileName || `image-${Date.now()}.jpg`
      const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg'
      let mimeType = 'image/jpeg'
      if (ext === 'png') mimeType = 'image/png'
      else if (ext === 'webp') mimeType = 'image/webp'

      setSaving(true)
      try {
        const { readUrl } = await api.uploadSinglePhoto(uri, fileName, mimeType)
        setImages((prev) => [...prev, readUrl])
      } catch (err) {
        Alert.alert(t('admin.species.imageUploadFailed'), err instanceof Error ? err.message : '')
      } finally {
        setSaving(false)
      }
    }
  }, [t])

  const addImageUrl = useCallback(() => {
    const url = imageUrl.trim()
    if (!url) return
    setImages((prev) => [...prev, url])
    setImageUrl('')
  }, [imageUrl])

  const removeImage = useCallback((index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleSave = useCallback(async () => {
    if (!scientificName.trim() || !commonName.trim()) {
      Alert.alert(t('common.error'), t('admin.species.requiredNames'))
      return
    }

    setSaving(true)
    try {
      const payload = {
        scientificName: scientificName.trim(),
        commonName: commonName.trim(),
        description: description.trim(),
        keyFeatures: parseKeyFeatures(keyFeaturesText),
        distributionZones: parseDistributionZones(distributionText),
        images,
      }

      if (isEdit && speciesId) {
        await api.updateSpecies(speciesId, payload as UpdateSpeciesInput)
        Alert.alert(t('common.success'), t('admin.species.updated'))
      } else {
        await api.createSpecies(payload as CreateSpeciesInput)
        Alert.alert(t('common.success'), t('admin.species.created'))
      }

      await useSpeciesStore.getState().loadSpecies()
      navigation.goBack()
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('admin.species.saveFailed'))
    } finally {
      setSaving(false)
    }
  }, [scientificName, commonName, description, keyFeaturesText, distributionText, images, isEdit, speciesId, t, navigation])

  const featuresCount = useMemo(() => parseKeyFeatures(keyFeaturesText).length, [keyFeaturesText])
  const zonesCount = useMemo(() => parseDistributionZones(distributionText).length, [distributionText])

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Input
        label={t('admin.species.scientificName')}
        placeholder={t('admin.species.scientificNamePlaceholder')}
        value={scientificName}
        onChangeText={setScientificName}
      />

      <Input
        label={t('admin.species.commonName')}
        placeholder={t('admin.species.commonNamePlaceholder')}
        value={commonName}
        onChangeText={setCommonName}
      />

      <Input
        label={t('admin.species.description')}
        placeholder={t('admin.species.descriptionPlaceholder')}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        style={styles.textarea}
      />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('admin.species.keyFeatures')}</Text>
        <Text style={styles.hint}>{t('admin.species.keyFeaturesHint')}</Text>
        <Input
          placeholder={t('admin.species.keyFeaturesPlaceholder')}
          value={keyFeaturesText}
          onChangeText={setKeyFeaturesText}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          style={styles.textarea}
        />
        {featuresCount > 0 && <Text style={styles.counter}>{featuresCount} {t('admin.species.features')}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('admin.species.distributionZones')}</Text>
        <Text style={styles.hint}>{t('admin.species.distributionZonesHint')}</Text>
        <Input
          placeholder={t('admin.species.distributionZonesPlaceholder')}
          value={distributionText}
          onChangeText={setDistributionText}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={styles.textarea}
        />
        {zonesCount > 0 && <Text style={styles.counter}>{zonesCount} {t('admin.species.zones')}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{t('admin.species.imagesLabel')}</Text>

        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageList}>
            {images.map((url, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: url }} style={styles.thumbnail} />
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeImage(index)}>
                  <Text style={styles.removeBtnText}>{t('admin.species.imageRemove')}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.imageActions}>
          <Button
            title={t('admin.species.imageUploadBtn')}
            onPress={pickImage}
            loading={saving}
            variant="secondary"
          />
          <Text style={styles.orText}>{t('admin.species.imageOr')}</Text>
          <View style={styles.urlRow}>
            <Input
              placeholder={t('admin.species.imageUrlPlaceholder')}
              value={imageUrl}
              onChangeText={setImageUrl}
              style={styles.urlInput}
            />
            <Button title={t('admin.species.imageAddUrl')} onPress={addImageUrl} variant="ghost" />
          </View>
        </View>
      </View>

      <View style={styles.saveRow}>
        <Button
          title={isEdit ? t('admin.species.update') : t('admin.species.create')}
          onPress={handleSave}
          loading={saving}
        />
        <Button
          title={t('common.cancel')}
          onPress={() => navigation.goBack()}
          variant="secondary"
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: FONT.base,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  hint: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  counter: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  textarea: {
    minHeight: 80,
    paddingTop: 12,
  },
  imageList: {
    marginVertical: 8,
  },
  imageWrapper: {
    marginRight: 12,
    alignItems: 'center',
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  removeBtn: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: COLORS.errorLight,
  },
  removeBtnText: {
    fontSize: FONT.xs,
    color: COLORS.error,
    fontWeight: '600',
  },
  imageActions: {
    gap: 8,
  },
  orText: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginVertical: 4,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urlInput: {
    flex: 1,
    marginBottom: 0,
  },
  saveRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
})
