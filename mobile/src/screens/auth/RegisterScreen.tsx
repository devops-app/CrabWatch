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
import { registerSchema, type RegisterFormValues } from '../../utils/validators'
import { authService } from '../../services/authService'
import { Input } from '../../components/common/Input'
import { CountryPicker } from '../../components/common/CountryPicker'
import { PhoneCodePicker } from '../../components/common/PhoneCodePicker'
import { Button } from '../../components/common/Button'
import { COLORS } from '../../utils/constants'
import { type CountryOption } from '@crabwatch/shared'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '../../navigation/types'

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>

export function RegisterScreen() {
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
        'Registration Failed',
        err instanceof Error ? err.message : 'Could not create account'
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
            <Text style={styles.title}>Join CrabWatch</Text>
            <Text style={styles.subtitle}>
              Help conserve crabs in Malaysia
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Full Name"
                  placeholder="Your name"
                  autoCapitalize="words"
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
                  label="Email"
                  placeholder="your@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
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
                  label="Country"
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
                        label="Country Code"
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
                      label="Phone Number"
                      placeholder="123456789"
                      keyboardType="phone-pad"
                      autoCapitalize="none"
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
                  label="Address Line 1"
                  placeholder="Street address"
                  autoCapitalize="words"
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
                  label="Address Line 2 (optional)"
                  placeholder="Apartment, suite, etc."
                  autoCapitalize="words"
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
                  label="Address Line 3 (optional)"
                  placeholder="Additional address info"
                  autoCapitalize="words"
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
                      label="State"
                      placeholder="State"
                      autoCapitalize="words"
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
                      label="Postcode"
                      placeholder="Postcode"
                      keyboardType="number-pad"
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
                  label="Password"
                  placeholder="At least 8 characters"
                  secureTextEntry
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
                  label="Confirm Password"
                  placeholder="Re-enter your password"
                  secureTextEntry
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.confirmPassword?.message}
                  returnKeyType="done"
                />
              )}
            />

            <Button
              title="Create Account"
              loading={loading}
              onPress={handleSubmit(onSubmit)}
              style={styles.submitBtn}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>Sign in</Text>
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
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: 14,
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
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  linkText: {
    fontSize: 14,
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
