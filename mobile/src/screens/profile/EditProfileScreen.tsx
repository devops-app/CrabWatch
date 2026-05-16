import React, { useState } from 'react'
import {
  View,
  Text,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useForm, Controller } from 'react-hook-form'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../services/api'
import { Input } from '../../components/common/Input'
import { CountryPicker } from '../../components/common/CountryPicker'
import { PhoneCodePicker } from '../../components/common/PhoneCodePicker'
import { Button } from '../../components/common/Button'
import { COLORS } from '../../utils/constants'
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

  const handleCountrySelect = (country: CountryOption) => {
    setValue('country', country.code)
    setValue('phoneCode', country.phoneCode)
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
      Alert.alert('Success', 'Profile updated successfully')
      navigation.goBack()
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to update profile'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields')
      return
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New password and confirm password do not match')
      return
    }

    setPasswordLoading(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      Alert.alert('Password Updated', 'Please sign in again with your new password.', [
        {
          text: 'OK',
          onPress: () => {
            logout()
          },
        },
      ])
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update password')
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
            <Text style={styles.avatarHint}>Tap to change photo</Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Display Name"
                  placeholder="Your name"
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
              />
            )}
          />

          <Controller
            control={control}
            name="addressLine2"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Address Line 2"
                placeholder="Apartment, suite, etc."
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
                label="Address Line 3"
                placeholder="Additional address info"
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
                    label="State"
                    placeholder="State"
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
                    label="Postcode"
                    placeholder="Postcode"
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
                label="Country"
                selectedCode={value}
                onSelect={handleCountrySelect}
                error={errors.country?.message}
              />
            )}
          />

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
            <Text style={styles.infoNote}>Email cannot be changed</Text>
          </View>

          <Button
            title="Save Changes"
            loading={loading}
            onPress={handleSubmit(onSubmit)}
            style={styles.saveBtn}
          />

          <Button
            title="Cancel"
            variant="ghost"
            onPress={() => navigation.goBack()}
            style={styles.cancelBtn}
          />

            <View style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Change Password</Text>
              <Input
                label="Current Password"
                placeholder="Current password"
                secureTextEntry
                autoCapitalize="none"
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <Input
                label="New Password"
                placeholder="New password"
                secureTextEntry
                autoCapitalize="none"
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <Input
                label="Confirm New Password"
                placeholder="Confirm new password"
                secureTextEntry
                autoCapitalize="none"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <Button
                title="Update Password"
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
    fontSize: 13,
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
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  infoNote: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 16,
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
})
