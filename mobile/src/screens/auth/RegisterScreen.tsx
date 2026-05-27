import React, { useState } from 'react'
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
import { SafeAreaView } from 'react-native-safe-area-context'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { registerSchema, type RegisterFormValues } from '../../utils/validators'
import { authService } from '../../services/authService'
import { Input } from '../../components/common/Input'
import { CountryPicker } from '../../components/common/CountryPicker'
import { PhoneCodePicker } from '../../components/common/PhoneCodePicker'
import { Button } from '../../components/common/Button'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import { type CountryOption } from '@crabwatch/shared'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '../../navigation/types'

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>

export function RegisterScreen() {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const [loading, setLoading] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      phoneCode: '+60',
      phoneNumber: '',
      addressLine1: '',
      addressLine2: '',
      addressLine3: '',
      state: '',
      postcode: '',
      country: 'MY',
      password: '',
      confirmPassword: '',
    },
  })

  const handleCountrySelect = (country: CountryOption) => {
    setValue('country', country.code)
    setValue('phoneCode', country.phoneCode)
  }

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true)
    try {
      await authService.register(
        data.name,
        data.email,
        data.password,
        data.phoneCode,
        data.phoneNumber,
        data.addressLine1,
        data.addressLine2 || undefined,
        data.addressLine3 || undefined,
        data.state,
        data.postcode,
        data.country
      )
    } catch (err) {
      Alert.alert(
        t('register.registrationFailed'),
        err instanceof Error ? err.message : t('register.couldNotCreate')
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('register.title')}</Text>
            <Text style={styles.subtitle}>
              {t('register.subtitle')}
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('register.fullName')}
                  placeholder={t('register.namePlaceholder')}
                  autoCapitalize="words"
                  textContentType="name"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.name?.message}
                  returnKeyType="next"
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('register.email')}
                  placeholder={t('register.emailPlaceholder')}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.email?.message}
                  returnKeyType="next"
                />
              )}
            />

            <Controller
              control={control}
              name="country"
              render={({ field: { value } }) => (
                <CountryPicker
                  label={t('register.country')}
                  selectedCode={value}
                  onSelect={handleCountrySelect}
                  error={errors.country?.message}
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
                        label={t('register.countryCode')}
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
                      label={t('register.phoneNumber')}
                      placeholder={t('register.phonePlaceholder')}
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                      textContentType="telephoneNumber"
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      error={errors.phoneNumber?.message}
                      returnKeyType="next"
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
                    label={t('register.addressLine1')}
                    placeholder={t('register.addressPlaceholder1')}
                    autoCapitalize="words"
                    textContentType="streetAddressLine1"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    error={errors.addressLine1?.message}
                    returnKeyType="next"
                  />
              )}
            />

            <Controller
              control={control}
              name="addressLine2"
              render={({ field: { onChange, onBlur, value } }) => (
              <Input
                    label={t('register.addressLine2')}
                    placeholder={t('register.addressPlaceholder2')}
                    autoCapitalize="words"
                    textContentType="streetAddressLine2"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    error={errors.addressLine2?.message}
                    returnKeyType="next"
                  />
              )}
            />

            <Controller
              control={control}
              name="addressLine3"
              render={({ field: { onChange, onBlur, value } }) => (
             <Input
                    label={t('register.addressLine3')}
                    placeholder={t('register.addressPlaceholder3')}
                    autoCapitalize="words"
                    textContentType="streetAddressLine1"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    error={errors.addressLine3?.message}
                    returnKeyType="next"
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
                      label={t('register.state')}
                      placeholder={t('register.statePlaceholder')}
                      autoCapitalize="words"
                      textContentType="addressState"
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      error={errors.state?.message}
                      returnKeyType="next"
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
                      label={t('register.postcode')}
                      placeholder={t('register.postcodePlaceholder')}
                      keyboardType="number-pad"
                      textContentType="postalCode"
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      error={errors.postcode?.message}
                      returnKeyType="next"
                    />
                  )}
                />
              </View>
            </View>

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('register.password')}
                  placeholder={t('register.passwordPlaceholder')}
                  secureTextEntry
                  textContentType="newPassword"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.password?.message}
                  returnKeyType="next"
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label={t('register.confirmPassword')}
                  placeholder={t('register.confirmPlaceholder')}
                  secureTextEntry
                  textContentType="newPassword"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.confirmPassword?.message}
                  returnKeyType="done"
                />
              )}
            />

            <Button
              title={t('register.createAccount')}
              loading={loading}
              onPress={handleSubmit(onSubmit)}
              style={styles.submitBtn}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('register.hasAccount')} </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>{t('register.signIn')}</Text>
              </TouchableOpacity>
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
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
  },
  title: {
    fontSize: FONT['5xl'],
    fontWeight: '800',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  form: {
    flex: 1,
    paddingHorizontal: 24,
  },
  submitBtn: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  footerText: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
  },
  linkText: {
    fontSize: FONT.base,
    color: COLORS.primary,
    fontWeight: '600',
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
})
