import React, { useState, useCallback } from 'react'
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
import { resetToMainTabs } from '../../navigation/navRef'
import { useTranslation } from 'react-i18next'
import { loginSchema, type LoginFormValues } from '../../utils/validators'
import { authService } from '../../services/authService'
import { Input } from '../../components/common/Input'
import { Button } from '../../components/common/Button'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import { useLocaleStore } from '../../store/localeStore'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../navigation/types'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

const LOCALES = [{ code: 'en', label: 'EN' }, { code: 'ms', label: 'BM' }] as const

export function LoginScreen() {
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const [loading, setLoading] = useState(false)
  const { locale, setLocale } = useLocaleStore()
  const [langMenuOpen, setLangMenuOpen] = useState(false)

  const switchLocale = useCallback(async (code: 'en' | 'ms') => {
    await setLocale(code)
    setLangMenuOpen(false)
  }, [setLocale])

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true)
    try {
      await authService.login(data.email, data.password)
      setTimeout(() => resetToMainTabs(), 0)
    } catch (err) {
      Alert.alert(
        t('login.loginFailed'),
        err instanceof Error ? err.message : t('login.invalidCredentials')
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
            <View style={styles.langSwitcher}>
              <TouchableOpacity
                style={styles.langButton}
                onPress={() => setLangMenuOpen(!langMenuOpen)}
              >
                <Text style={styles.langButtonText}>
                  {LOCALES.find((l) => l.code === locale)?.label ?? 'EN'}
                </Text>
                <Text style={styles.langArrow}>{langMenuOpen ? '▲' : '▼'}</Text>
              </TouchableOpacity>
              {langMenuOpen && (
                <View style={styles.langDropdown}>
                  {LOCALES.map((l) => (
                    <TouchableOpacity
                      key={l.code}
                      style={[
                        styles.langOption,
                        l.code === locale && styles.langOptionActive,
                      ]}
                      onPress={() => switchLocale(l.code)}
                    >
                      <Text style={[
                        styles.langOptionText,
                        l.code === locale && styles.langOptionTextActive,
                      ]}>
                        {l.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <Text style={styles.title}>{t('login.title')}</Text>
            <Text style={styles.subtitle}>
              {t('login.subtitle')}
            </Text>
          </View>

        <View style={styles.form}>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('login.email')}
                placeholder={t('login.emailPlaceholder')}
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
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label={t('login.password')}
                placeholder={t('login.passwordPlaceholder')}
                secureTextEntry
                textContentType="password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                error={errors.password?.message}
                returnKeyType="done"
              />
            )}
          />

          <Button
            title={t('login.signIn')}
            loading={loading}
            onPress={handleSubmit(onSubmit)}
            style={styles.submitBtn}
          />

          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={styles.linkText}>{t('login.forgotPassword')}</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('login.noAccount')} </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.linkText}>{t('login.createAccount')}</Text>
            </TouchableOpacity>
          </View>
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
    paddingTop: 40,
    paddingBottom: 32,
  },
  langSwitcher: {
    alignSelf: 'flex-end',
    marginRight: 24,
    marginBottom: 16,
    zIndex: 10,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  langButtonText: {
    fontSize: FONT.sm,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: 4,
  },
  langArrow: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  langDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  langOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  langOptionActive: {
    backgroundColor: COLORS.primary + '15',
  },
  langOptionText: {
    fontSize: FONT.sm,
    fontWeight: '500',
    color: COLORS.text,
  },
  langOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  title: {
    fontSize: FONT['6xl'],
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -1,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONT.base,
    color: COLORS.textSecondary,
    marginTop: 6,
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
  forgotLink: {
    alignItems: 'center',
    marginTop: 12,
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
})
