import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useForm, Controller } from 'react-hook-form'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { useLocaleStore } from '../../store/localeStore'
import { api } from '../../services/api'
import { Input } from '../../components/common/Input'
import { CountryPicker } from '../../components/common/CountryPicker'
import { PhoneCodePicker } from '../../components/common/PhoneCodePicker'
import { PickerWithAlert } from '../../components/common/Picker'
import { Button } from '../../components/common/Button'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import { type CountryOption } from '@crabwatch/shared'
import * as ImagePicker from 'expo-image-picker'
import type { RootStackParamList } from '../../navigation/types'

type FormValues = {
  name: string
  phoneCode: string
  phoneNumber: string
  addressLine1: string
  addressLine2: string
  addressLine3: string
  state: string
  postcode: string
  country: string
}

export function EditProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const { user, updateUser, logout } = useAuth()
  const { t } = useTranslation('editProfile')
  const { locale, setLocale } = useLocaleStore()
  const [loading, setLoading] = useState(false)
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar || null)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<FormValues>({
    defaultValues: {
      name: user?.name || '',
      phoneCode: user?.phoneCode || '+60',
      phoneNumber: user?.phoneNumber || '',
      addressLine1: user?.addressLine1 || '',
      addressLine2: user?.addressLine2 || '',
      addressLine3: user?.addressLine3 || '',
      state: user?.state || '',
      postcode: user?.postcode || '',
      country: user?.country || 'MY',
    },
  })

  const LANGUAGE_OPTIONS = useMemo(() => [
    { label: t('common.english'), value: 'en' },
    { label: t('common.bahasaMelayu'), value: 'ms' },
  ], [t])

  const handleCountrySelect = (country: CountryOption) => {
    setValue('country', country.code)
    setValue('phoneCode', country.phoneCode)
  }

  const handleLanguageChange = async (newLocale: string) => {
    if (newLocale === 'en' || newLocale === 'ms') {
      setLocale(newLocale)
      try {
        const updated = await api.updateProfile({ preferredLocale: newLocale })
        updateUser(updated)
      } catch {
        // Silently fail - locale still changed locally
      }
    }
  }

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri)
    }
  }

  const onSubmit = async (data: FormValues) => {
    setLoading(true)
    try {
      const updated = await api.updateProfile({
        name: data.name,
        phoneCode: data.phoneCode || null,
        phoneNumber: data.phoneNumber || null,
        addressLine1: data.addressLine1 || null,
        addressLine2: data.addressLine2 || null,
        addressLine3: data.addressLine3 || null,
        state: data.state || null,
        postcode: data.postcode || null,
        country: data.country || null,
        avatar: avatarUri,
      })
      updateUser(updated)
      Alert.alert(t('common.success'), t('updated'))
      navigation.goBack()
    } catch (err) {
      Alert.alert(
        t('common.error'),
        err instanceof Error ? err.message : t('updateFailed')
      )
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('common.error'), t('password.fillAllFields'))
      return
    }

    if (newPassword.length < 8) {
      Alert.alert(t('common.error'), t('password.minLength'))
      return
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('common.error'), t('password.notMatch'))
      return
    }

    setPasswordLoading(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      Alert.alert(t('password.updated'), t('password.signInAgain'), [
        {
          text: t('common.ok'),
          onPress: () => {
            logout()
          },
        },
      ])
    } catch (err) {
      Alert.alert(t('common.error'), err instanceof Error ? err.message : t('password.updateFailed'))
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarWrapper}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={36} color="#ffffff" />
                </View>
              )}
              <View style={styles.avatarOverlay}>
                <Ionicons name="camera" size={18} color="#ffffff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>{t('tapToChangePhoto')}</Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('displayName')}
                  placeholder={t('yourName')}
                  autoCapitalize="words"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.name?.message}
                />
              )}
            />

          <View style={styles.phoneRow}>
            <View style={styles.phoneCodeWrap}>
              <Controller
                control={control}
                name="phoneCode"
                render={({ field: { onChange, value } }) => (
                  <PhoneCodePicker
                    label={t('countryCode')}
                    selectedCode={value}
                    onSelect={onChange}
                    error={errors.phoneCode?.message}
                  />
                )}
              />
            </View>
            <View style={styles.phoneNumWrap}>
              <Controller
                control={control}
                name="phoneNumber"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('phoneNumber')}
                    placeholder={t('phonePlaceholder')}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    error={errors.phoneNumber?.message}
                  />
                )}
              />
            </View>
          </View>

          <Controller
            control={control}
            name="addressLine1"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
           label={t('addressLine1')}
                  placeholder={t('streetAddress')}
                autoCapitalize="words"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.addressLine1?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="addressLine2"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
          label={t('addressLine2')}
                  placeholder={t('aptSuite')}
                autoCapitalize="words"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.addressLine2?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="addressLine3"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
         label={t('addressLine3')}
                  placeholder={t('additionalAddressInfo')}
                autoCapitalize="words"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.addressLine3?.message}
              />
            )}
          />

          <View style={styles.addressRow}>
            <View style={styles.stateWrap}>
              <Controller
                control={control}
                name="state"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('state')}
                    placeholder={t('state')}
                    autoCapitalize="words"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    error={errors.state?.message}
                  />
                )}
              />
            </View>
            <View style={styles.postcodeWrap}>
              <Controller
                control={control}
                name="postcode"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('postcode')}
                    placeholder={t('postcode')}
                    keyboardType="number-pad"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    error={errors.postcode?.message}
                  />
                )}
              />
            </View>
          </View>

          <Controller
            control={control}
            name="country"
            render={({ field: { value } }) => (
              <CountryPicker
                label={t('country')}
                selectedCode={value}
                onSelect={handleCountrySelect}
                error={errors.country?.message}
              />
            )}
          />

          <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>{t('common.email')}</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
              <Text style={styles.infoNote}>{t('emailCannotChange')}</Text>
          </View>

          <View style={styles.languageSection}>
            <Text style={styles.sectionLabel}>{t('language')}</Text>
            <PickerWithAlert
              label=""
              options={LANGUAGE_OPTIONS}
              selectedValue={locale}
              onValueChange={handleLanguageChange}
              placeholder={t('common.select')}
            />
          </View>

          <Button
            title={t('saveChanges')}
            loading={loading}
            onPress={handleSubmit(onSubmit)}
            style={styles.saveBtn}
          />

          <Button
            title={t('common.cancel')}
            variant="ghost"
            onPress={() => navigation.goBack()}
            style={styles.cancelBtn}
          />

            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>{t('password.changePassword')}</Text>
              <Input
                label={t('password.current')}
                placeholder={t('password.currentPlaceholder')}
                secureTextEntry
                autoCapitalize="none"
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <Input
                label={t('password.new')}
                placeholder={t('password.newPlaceholder')}
                secureTextEntry
                autoCapitalize="none"
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <Input
                label={t('password.confirm')}
                placeholder={t('password.confirmPlaceholder')}
                secureTextEntry
                autoCapitalize="none"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <Button
                title={t('password.updatePassword')}
                loading={passwordLoading}
                onPress={handleChangePassword}
                style={styles.passwordBtn}
              />
            </View>
          </View>
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
  content: {
    paddingBottom: 24,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.border,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  avatarHint: {
    fontSize: FONT['sm+'],
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  form: {
    paddingHorizontal: 24,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  infoLabel: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: FONT.lg,
    color: COLORS.text,
    fontWeight: '500',
  },
  infoNote: {
    fontSize: FONT.sm,
    color: COLORS.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: FONT.lg,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  passwordBtn: {
    marginTop: 8,
  },
  saveBtn: {
    marginBottom: 12,
  },
  cancelBtn: {
    marginTop: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  phoneCodeWrap: {
    width: 100,
  },
  phoneNumWrap: {
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stateWrap: {
    flex: 2,
  },
  postcodeWrap: {
    flex: 1,
  },
  languageSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
})
