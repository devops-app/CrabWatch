import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  observationSchema,
  type ObservationFormValues,
} from '../../utils/validators'
import { useSpeciesStore } from '../../store/speciesStore'
import { api } from '../../services/api'
import { COLORS, GENDER_OPTIONS, MATURATION_OPTIONS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import { Input } from '../../components/common/Input'
import { PickerWithAlert } from '../../components/common/Picker'
import { Button } from '../../components/common/Button'
import { GPSCapture } from '../../components/observation/GPSCapture'
import type { RootStackParamList } from '../../navigation/types'
import type { UpdateObservationInput } from '@crabwatch/shared'

type EditNav = NativeStackNavigationProp<RootStackParamList, 'EditObservation'>

function sanitizeDecimalInput(value: string): string {
  const normalized = value.replace(',', '.').replace(/[^\d.]/g, '')
  const [intPart = '', ...fractionParts] = normalized.split('.')
  if (fractionParts.length === 0) return intPart
  const fraction = fractionParts.join('').slice(0, 2)
  return `${intPart}.${fraction}`
}

export function EditObservationScreen() {
  const { t } = useTranslation('observation')
  const nav = useNavigation<EditNav>()
  const route = useRoute<RouteProp<RootStackParamList, 'EditObservation'>>()
  const observationId = route.params.observationId
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const { species, loadSpecies } = useSpeciesStore()

  const GENDER_OPTS = useMemo(
    () => GENDER_OPTIONS.map(o => ({ ...o, label: t(`genderValue.${o.value}`) })),
    [t]
  )

  const MATURATION_OPTS = useMemo(
    () => MATURATION_OPTIONS.map(o => ({ ...o, label: t(`maturationValue.${o.value}`) })),
    [t]
  )

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<Omit<ObservationFormValues, 'photos'>>({
    resolver: zodResolver(observationSchema.omit({ photos: true })),
    defaultValues: {
      speciesId: '',
      cw: 0,
      bw: undefined,
      gender: 'unknown' as const,
      maturationStatus: 'unknown' as const,
      lat: 0,
      lng: 0,
      locationMethod: 'gps' as const,
      detectedCoin: null,
      notes: '',
    },
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        await loadSpecies()
        const obs = await api.getObservation(observationId)
        reset({
          speciesId: obs.speciesId,
          cw: obs.cw,
          bw: obs.bw ?? undefined,
          gender: obs.gender,
          maturationStatus: obs.maturationStatus,
          lat: obs.lat,
          lng: obs.lng,
          locationMethod: obs.locationMethod,
          detectedCoin: obs.detectedCoin ?? null,
          notes: obs.notes ?? '',
        })
      } catch {
        Alert.alert(t('editFailed'))
        nav.goBack()
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const onLocationCapture = (lat: number, lng: number) => {
    setValue('lat', lat, { shouldValidate: true })
    setValue('lng', lng, { shouldValidate: true })
    setValue('locationMethod', 'gps', { shouldValidate: true })
  }

  const onSubmit = async (data: Omit<ObservationFormValues, 'photos'>) => {
    setSubmitting(true)
    try {
      const payload: UpdateObservationInput = {
        speciesId: data.speciesId,
        cw: data.cw,
        bw: data.bw ?? null,
        gender: data.gender,
        maturationStatus: data.maturationStatus,
        lat: data.lat,
        lng: data.lng,
        locationMethod: data.locationMethod,
        detectedCoin: data.detectedCoin ?? null,
        notes: data.notes ?? null,
      }
      await api.updateObservation(observationId, payload)
      Alert.alert(t('updateSuccess'))
      nav.goBack()
    } catch {
      Alert.alert(t('updateFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>{t('editTitle')}</Text>

          <Controller
            control={control}
            name="speciesId"
            render={({ field: { value, onChange } }) => (
              <PickerWithAlert
                label={t('species')}
                placeholder={t('speciesPlaceholder')}
                selectedValue={value}
                options={species.map(s => ({ label: s.commonName, value: s.id }))}
                onValueChange={onChange}
                error={errors.speciesId?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="cw"
            render={({ field: { value, onChange } }) => (
              <Input
                label={`${t('cw')} (cm)`}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={value?.toString() ?? ''}
                onChangeText={(v) => {
                  const sanitized = sanitizeDecimalInput(v)
                  onChange(sanitized === '' ? 0 : parseFloat(sanitized))
                }}
                error={errors.cw?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="bw"
            render={({ field: { value, onChange } }) => (
              <Input
                label={`${t('bw')} (g) ${t('optional')}`}
                placeholder="0.00"
                keyboardType="decimal-pad"
                value={value?.toString() ?? ''}
                onChangeText={(v) => {
                  const sanitized = sanitizeDecimalInput(v)
                  onChange(sanitized === '' ? undefined : parseFloat(sanitized))
                }}
                error={errors.bw?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="gender"
            render={({ field: { value, onChange } }) => (
              <PickerWithAlert
                label={t('gender')}
                placeholder={t('genderPlaceholder')}
                selectedValue={value}
                options={GENDER_OPTS}
                onValueChange={onChange}
                error={errors.gender?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="maturationStatus"
            render={({ field: { value, onChange } }) => (
              <PickerWithAlert
                label={t('maturation')}
                placeholder={t('maturationPlaceholder')}
                selectedValue={value}
                options={MATURATION_OPTS}
                onValueChange={onChange}
                error={errors.maturationStatus?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="detectedCoin"
            render={({ field: { value, onChange } }) => (
              <Input
                label={t('coin')}
                placeholder={t('coinPlaceholder')}
                value={value ?? ''}
                onChangeText={onChange}
                error={errors.detectedCoin?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="notes"
            render={({ field: { value, onChange } }) => (
              <Input
                label={t('notes')}
                placeholder={t('notesPlaceholder')}
                value={value ?? ''}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
                error={errors.notes?.message}
              />
            )}
          />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('location')}</Text>
            <Controller
              control={control}
              name="lat"
              render={({ field: { value: latValue } }) => (
                <Controller
                  control={control}
                  name="lng"
                  render={({ field: { value: lngValue } }) => (
                    <GPSCapture
                      latitude={latValue ?? null}
                      longitude={lngValue ?? null}
                      onLocationCapture={onLocationCapture}
                    />
                  )}
                />
              )}
            />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title={t('save')}
            variant="primary"
            onPress={handleSubmit(onSubmit)}
            disabled={submitting}
            loading={submitting}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: FONT.xl,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
  },
  section: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: FONT.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
})
