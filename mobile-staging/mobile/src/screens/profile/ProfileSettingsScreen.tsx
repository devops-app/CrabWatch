import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../hooks/useAuth'
import { api } from '../../services/api'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../navigation/types'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

const menuItems = [
  {
    icon: 'information-circle-outline' as const,
    label: 'About',
    action: 'navigate' as const,
    screen: 'About' as const,
  },
  {
    icon: 'log-out-outline' as const,
    label: 'Sign Out',
    action: 'logout' as const,
  },
  {
    icon: 'trash-outline' as const,
    label: 'Delete Account',
    action: 'delete' as const,
    destructive: true,
  },
]

export function ProfileSettingsScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { logout } = useAuth()
  const [deleting, setDeleting] = useState(false)

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ])
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will delete your account. You have 30 days to restore it by logging in again. All your data will be permanently removed after 30 days.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            try {
              await api.deleteMyAccount()
              logout()
              Alert.alert('Account Deleted', 'Your account has been deleted. You have 30 days to restore it.')
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete account')
            } finally {
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  const handlePress = (item: typeof menuItems[0]) => {
    if (item.action === 'navigate' && item.screen) {
      navigation.navigate(item.screen)
    } else if (item.action === 'logout') {
      handleLogout()
    } else if (item.action === 'delete') {
      handleDeleteAccount()
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {menuItems.map((item, index) => (
          <React.Fragment key={item.label}>
            {index > 0 && <View style={styles.divider} />}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handlePress(item)}
              disabled={deleting && item.action === 'delete'}
            >
              <View style={[styles.iconCircle, { backgroundColor: item.destructive ? COLORS.errorLight : COLORS.background }]}>
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={item.destructive ? COLORS.error : COLORS.textSecondary}
                />
              </View>
              <Text style={[styles.menuLabel, item.destructive && styles.destructiveLabel]}>
                {item.label}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          </React.Fragment>
        ))}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginLeft: 60,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: FONT.base,
    fontWeight: '500',
    color: COLORS.text,
  },
  destructiveLabel: {
    color: COLORS.error,
  },
})
