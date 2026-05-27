import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFocusEffect } from '@react-navigation/native'
import {
  observationSchema,
  type ObservationFormValues,
} from '../../utils/validators'
import { useObservation } from '../../hooks/useObservation'
import { useSpeciesStore } from '../../store/speciesStore'
import {
  COLORS,
  CW_MAX,
  BW_MAX,
} from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import { Input } from '../../components/common/Input'
import { PickerWithAlert } from '../../components/common/Picker'
import { Button } from '../../components/common/Button'
import { PhotoPicker } from '../../components/observation/PhotoPicker'
import { GPSCapture } from '../../components/observation/GPSCapture'
import { useObservationStore } from '../../store/observationStore'

const DEFAULT_VALUES: Partial<ObservationFormValues> = {
  speciesId: '',
  cw: 0,
  bw: 0,
  gender: 'unknown',
  maturationStatus: 'unknown',
  lat: 0,
  lng: 0,
  locationMethod: 'gps',
  photos: [],
  notes: '',
}

function sanitizeDecimalInput(value: string): string {
  const normalized = value.replace(',', '.').replace(/[^\d.]/g, '')
  const [intPart = '', ...fractionParts] = normalized.split('.')
  if (fractionParts.length === 0) return intPart
  const fraction = fractionParts.join('').slice(0, 2)
  return `${intPart}.${fraction}`
}

export function NewObservationScreen() {
  const { t } = useTranslation('newObservation')
  const { submitObservation, submitting, error: submitError } = useObservation()
  const { species, loadSpecies } = useSpeciesStore()
  const pendingCount = useObservationStore((s) => s.pendingObservations.length)

  const [photoUris, setPhotoUris] = useState<string[]>([])
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [manualLocation, setManualLocation] = useState(false)
  const [rawCW, setRawCW] = useState('')
  const [rawBW, setRawBW] = useState('')

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ObservationFormValues>({
    resolver: zodResolver(observationSchema),
    defaultValues: DEFAULT_VALUES,
  })

  const genderOptions = useMemo(() => [
    { label: t('genderOptions.male'), value: 'male' },
    { label: t('genderOptions.female'), value: 'female' },
    { label: t('genderOptions.unknown'), value: 'unknown' },
  ], [t])

  const maturationOptions = useMemo(() => [
    { label: t('maturationOptions.mature'), value: 'mature' },
    { label: t('maturationOptions.immature'), value: 'immature' },
    { label: t('maturationOptions.unknown'), value: 'unknown' },
  ], [t])

  useFocusEffect(
    React.useCallback(() => {
      loadSpecies()
    }, [loadSpecies])
  )

  const handleLocationCapture = (lat: number, lng: number) => {
    setLatitude(lat)
    setLongitude(lng)
  }

  const onSubmit = async (data: ObservationFormValues) => {
    if (latitude == null || longitude == null) {
      Alert.alert(t('alerts.locationRequiredTitle'), t('alerts.locationRequiredBody'))
      return
    }

    if (photoUris.length === 0) {
      Alert.alert(t('alerts.photosRequiredTitle'), t('alerts.photosRequiredBody'))
      return
    }

    const payload = {
      ...data,
      cw: parseFloat(sanitizeDecimalInput(rawCW)) || 0,
      bw: rawBW === '' ? null : parseFloat(sanitizeDecimalInput(rawBW)) || null,
      lat: latitude,
      lng: longitude,
      locationMethod: (manualLocation ? 'manual' : 'gps') as 'manual' | 'gps',
      photos: photoUris,
    }

    const result = await submitObservation(payload)

    if (result) {
      Alert.alert(t('alerts.successTitle'), t('alerts.successBody'), [
        {
          text: t('ok'),
          onPress: () => {
            reset(DEFAULT_VALUES)
            setRawCW('')
            setRawBW('')
            setPhotoUris([])
            setLatitude(null)
            setLongitude(null)
            setManualLocation(false)
          },
        },
      ])
    } else {
      Alert.alert(
        t('alerts.offlineQueuedTitle'),
        t('alerts.offlineQueuedBody')
      )
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {pendingCount > 0 && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineText}>
                {t('offlineQueued', { count: pendingCount })}
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>{t('sections.species')}</Text>
          <Controller
            control={control}
            name="speciesId"
            render={({ field: { onChange, value } }) => (
              <PickerWithAlert
                label={t('fields.species')}
                options={[
                  { label: t('fields.selectSpecies'), value: '' },
                  ...species.map((s) => ({
                    label: `${s.commonName} (${s.scientificName})`,
                    value: s.id,
                  })),
                ]}
                selectedValue={value}
                onValueChange={onChange}
                error={errors.speciesId?.message}
              />
            )}
          />

          <Text style={styles.sectionTitle}>{t('sections.measurements')}</Text>
          <Controller
            control={control}
            name="cw"
            render={({ field: { onChange, onBlur } }) => (
              <Input
                label={t('fields.cwLabel', { max: CW_MAX })}
                placeholder={t('fields.cwPlaceholder')}
                keyboardType="decimal-pad"
                value={rawCW}
                onBlur={() => {
                  onChange(parseFloat(sanitizeDecimalInput(rawCW)) || 0)
                  onBlur()
                }}
                onChangeText={(v) => {
                  const sanitized = sanitizeDecimalInput(v)
                  setRawCW(sanitized)
                  onChange(parseFloat(sanitized) || 0)
                }}
                error={errors.cw?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="bw"
            render={({ field: { onChange, onBlur } }) => (
              <Input
                label={t('fields.bwLabel', { max: BW_MAX })}
                placeholder={t('fields.bwPlaceholder')}
                keyboardType="decimal-pad"
                value={rawBW}
                onBlur={() => {
                  const sanitized = sanitizeDecimalInput(rawBW)
                  onChange(sanitized === '' ? undefined : parseFloat(sanitized) || 0)
                  onBlur()
                }}
                onChangeText={(v) => {
                  const sanitized = sanitizeDecimalInput(v)
                  setRawBW(sanitized)
                  onChange(sanitized === '' ? undefined : parseFloat(sanitized) || 0)
                }}
                error={errors.bw?.message}
              />
            )}
          />

          <Text style={styles.sectionTitle}>{t('sections.biologicalData')}</Text>
          <Controller
            control={control}
             name="gender"
            render={({ field: { onChange, value } }) => (
              <PickerWithAlert
                label={t('fields.gender')}
                   options={genderOptions}
                selectedValue={value}
                onValueChange={onChange}
                error={errors.gender?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="maturationStatus"
            render={({ field: { onChange, value } }) => (
              <PickerWithAlert
                label={t('fields.maturationStatus')}
                options={maturationOptions}
                selectedValue={value}
                onValueChange={onChange}
                error={errors.maturationStatus?.message}
              />
            )}
          />

          <Text style={styles.sectionTitle}>{t('sections.location')}</Text>
          <GPSCapture
            latitude={latitude}
            longitude={longitude}
            onLocationCapture={handleLocationCapture}
            manualMode={manualLocation}
            onManualToggle={() => setManualLocation((v) => !v)}
          />

          <Text style={styles.sectionTitle}>{t('sections.photos')}</Text>
          <PhotoPicker
            photos={photoUris}
            onAdd={(uris) => setPhotoUris((prev) => [...prev, ...uris])}
            onRemove={(index) =>
              setPhotoUris((prev) => prev.filter((_, i) => i !== index))
            }
          />

          <Text style={styles.sectionTitle}>{t('sections.notes')}</Text>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                placeholder={t('fields.notesPlaceholder')}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={value || ''}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.notes?.message}
                style={styles.notesInput}
              />
            )}
          />

          {submitError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{submitError}</Text>
            </View>
          )}

          <Button
            title={t('submit')}
            loading={submitting}
            onPress={handleSubmit(onSubmit)}
            style={styles.submitBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  inner: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  offlineBanner: {
    backgroundColor: COLORS.warningLight,
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  offlineText: {
    fontSize: FONT['sm+'],
    color: COLORS.warning,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: FONT.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  notesInput: {
    minHeight: 80,
    paddingTop: 12,
  },
  errorBox: {
    backgroundColor: COLORS.errorLight,
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  errorText: {
    fontSize: FONT.base,
    color: COLORS.error,
  },
  submitBtn: {
    marginTop: 24,
    marginBottom: 16,
  },
})
