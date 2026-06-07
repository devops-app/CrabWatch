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
import { useNavigation } from '@react-navigation/native'
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

type ForgotPasswordValues = {
  email: string
}

export function ForgotPasswordScreen() {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('forgotPassword.invalidEmail')),
      }),
    [t]
  )

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (data: ForgotPasswordValues) => {
    setLoading(true)
    try {
      await api.requestPasswordReset(data.email)
      setSuccess(true)
    } catch (err) {
      Alert.alert(
        t('forgotPassword.error'),
        err instanceof Error ? err.message : t('forgotPassword.failedToSend')
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
        <View style={styles.header}>
          <Text style={styles.title}>{t('forgotPassword.title')}</Text>
          <Text style={styles.subtitle}>
            {t('forgotPassword.subtitle')}
          </Text>
        </View>

        <View style={styles.form}>
          {success ? (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>
                {t('forgotPassword.success')}
              </Text>
              <Button
                title={t('forgotPassword.backToLogin')}
                onPress={() => navigation.replace('Login')}
                style={styles.backBtn}
              />
            </View>
          ) : (
            <>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label={t('forgotPassword.email')}
                    placeholder={t('forgotPassword.emailPlaceholder')}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    value={value}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    error={errors.email?.message}
                    returnKeyType="done"
                  />
                )}
              />

              <Button
                title={t('forgotPassword.sendLink')}
                loading={loading}
                onPress={handleSubmit(onSubmit)}
                style={styles.submitBtn}
              />

              <View style={styles.footer}>
                <Text style={styles.footerText}>{t('forgotPassword.rememberPassword')} </Text>
                <TouchableOpacity onPress={() => navigation.replace('Login')}>
                  <Text style={styles.linkText}>{t('forgotPassword.signIn')}</Text>
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
  backBtn: {
    marginTop: 16,
  },
})
