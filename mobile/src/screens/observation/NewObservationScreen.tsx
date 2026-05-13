import React, { useState } from 'react'
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
  GENDER_OPTIONS,
  MATURATION_OPTIONS,
  COLORS,
  CW_MAX,
  BW_MAX,
} from '../../utils/constants'
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

export function NewObservationScreen() {
  const { submitObservation, submitting, error: submitError } = useObservation()
  const { species, loadSpecies } = useSpeciesStore()
  const pendingCount = useObservationStore((s) => s.pendingObservations.length)

  const [photoUris, setPhotoUris] = useState<string[]>([])
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [manualLocation, setManualLocation] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ObservationFormValues>({
    resolver: zodResolver(observationSchema),
    defaultValues: DEFAULT_VALUES,
  })

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
      Alert.alert('Location Required', 'Please capture your GPS location.')
      return
    }

    if (photoUris.length === 0) {
      Alert.alert('Photos Required', 'Please add at least one photo.')
      return
    }

    const payload = {
      ...data,
      lat: latitude,
      lng: longitude,
      locationMethod: (manualLocation ? 'manual' : 'gps') as 'manual' | 'gps',
      photos: photoUris,
    }

    const result = await submitObservation(payload)

    if (result) {
      Alert.alert('Success', 'Observation submitted for review!', [
        {
          text: 'OK',
          onPress: () => {
            reset(DEFAULT_VALUES)
            setPhotoUris([])
            setLatitude(null)
            setLongitude(null)
            setManualLocation(false)
          },
        },
      ])
    } else {
      Alert.alert(
        'Offline Queued',
        'No network connection. Observation saved locally and will sync later.'
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
                {pendingCount} observation{pendingCount > 1 ? 's' : ''} queued offline
              </Text>
            </View>
          )}

          <Text style={styles.sectionTitle}>Species</Text>
          <Controller
            control={control}
            name="speciesId"
            render={({ field: { onChange, value } }) => (
              <PickerWithAlert
                label="Species"
                options={[
                  { label: 'Select species...', value: '' },
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

          <Text style={styles.sectionTitle}>Measurements</Text>
          <Controller
            control={control}
            name="cw"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={`Carapace Width (cm, max ${CW_MAX})`}
                placeholder="e.g. 8.5"
                keyboardType="decimal-pad"
                value={value?.toString() || ''}
                onBlur={onBlur}
                onChangeText={(v) => onChange(parseFloat(v) || 0)}
                error={errors.cw?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="bw"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={`Body Weight (g, max ${BW_MAX})`}
                placeholder="e.g. 350"
                keyboardType="decimal-pad"
                value={value?.toString() || ''}
                onBlur={onBlur}
                onChangeText={(v) => onChange(parseFloat(v) || 0)}
                error={errors.bw?.message}
              />
            )}
          />

          <Text style={styles.sectionTitle}>Biological Data</Text>
          <Controller
            control={control}
             name="gender"
            render={({ field: { onChange, value } }) => (
              <PickerWithAlert
               label="Gender"
                  options={GENDER_OPTIONS}
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
                label="Maturation Status"
                options={MATURATION_OPTIONS}
                selectedValue={value}
                onValueChange={onChange}
                error={errors.maturationStatus?.message}
              />
            )}
          />

          <Text style={styles.sectionTitle}>Location</Text>
          <GPSCapture
            latitude={latitude}
            longitude={longitude}
            onLocationCapture={handleLocationCapture}
            manualMode={manualLocation}
            onManualToggle={() => setManualLocation((v) => !v)}
          />

          <Text style={styles.sectionTitle}>Photos</Text>
          <PhotoPicker
            photos={photoUris}
            onAdd={(uris) => setPhotoUris((prev) => [...prev, ...uris])}
            onRemove={(index) =>
              setPhotoUris((prev) => prev.filter((_, i) => i !== index))
            }
          />

          <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                placeholder="Add any additional notes..."
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
            title="Submit Observation"
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
    fontSize: 13,
    color: COLORS.warning,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
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
    fontSize: 14,
    color: COLORS.error,
  },
  submitBtn: {
    marginTop: 24,
    marginBottom: 16,
  },
})
