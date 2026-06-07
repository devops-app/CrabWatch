import React, { useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import { api } from '../../services/api'
import { Input } from '../../components/common/Input'
import { Button } from '../../components/common/Button'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '../../navigation/types'

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>
type RouteParams = RouteProp<AuthStackParamList, 'ResetPassword'>

type ResetPasswordValues = {
  password: string
  confirmPassword: string
}

export function ResetPasswordScreen() {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const route = useRoute<RouteParams>()
  const token = route.params?.token
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const schema = useMemo(
    () =>
      z
        .object({
          password: z.string().min(8, t('resetPassword.passwordMin')),
          confirmPassword: z.string(),
        })
        .refine((data) => data.password === data.confirmPassword, {
          message: t('resetPassword.passwordMismatch'),
          path: ['confirmPassword'],
        }),
    [t]
  )

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const password = watch('password')

  const onSubmit = async (data: ResetPasswordValues) => {
    if (!token) {
      Alert.alert(t('resetPassword.error'), t('resetPassword.invalidLink'))
      return
    }
    setLoading(true)
    try {
      await api.resetPassword(token, data.password)
      setSuccess(true)
    } catch (err) {
      Alert.alert(
        t('resetPassword.error'),
        err instanceof Error ? err.message : t('resetPassword.failedToReset')
      )
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('resetPassword.invalidLink')}</Text>
          <Button
            title={t('resetPassword.backToLogin')}
            onPress={() => navigation.replace('Login')}
            style={styles.backBtn}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t('resetPassword.title')}</Text>
          <Text style={styles.subtitle}>
            {t('resetPassword.subtitle')}
          </Text>
        </View>

        <View style={styles.form}>
          {success ? (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>
                {t('resetPassword.success')}
              </Text>
              <Button
                title={t('resetPassword.signIn')}
                onPress={() => navigation.replace('Login')}
                style={styles.backBtn}
              />
            </View>
          ) : (
            <>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('resetPassword.newPassword')}
                    placeholder={t('resetPassword.passwordPlaceholder')}
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
                    label={t('resetPassword.confirmPassword')}
                    placeholder={t('resetPassword.confirmPlaceholder')}
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
                title={t('resetPassword.reset')}
                loading={loading}
                onPress={handleSubmit(onSubmit)}
                style={styles.submitBtn}
              />

              <View style={styles.footer}>
                <Text style={styles.footerText}>{t('resetPassword.rememberPassword')} </Text>
                <TouchableOpacity onPress={() => navigation.replace('Login')}>
                  <Text style={styles.linkText}>{t('resetPassword.signInLink')}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
  inner: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
  },
  title: {
    fontSize: FONT['5xl'],
    fontWeight: '800',
    color: COLORS.primary,
  },
  subtitle: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
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
  successContainer: {
    alignItems: 'center',
    gap: 24,
  },
  successText: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: FONT.lg,
    color: COLORS.error,
    textAlign: 'center',
  },
  backBtn: {
    marginTop: 16,
  },
})
