import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { useLocaleStore } from '../../store/localeStore'
import { api } from '../../services/api'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../navigation/types'

type NavigationProp = NativeStackNavigationProp<RootStackParamList>

type MenuItem = {
  key: 'about' | 'notifications' | 'deleteAccount'
  icon: 'information-circle-outline' | 'notifications-outline' | 'trash-outline'
  label: string
  action: 'navigate' | 'delete'
  screen?: 'About' | 'NotificationSettings'
  destructive?: boolean
}

export function ProfileSettingsScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { t } = useTranslation('profileSettings')
  const { logout } = useAuth()
  const [deleting, setDeleting] = useState(false)

  const menuItems: MenuItem[] = useMemo(() => [
    {
      key: 'about',
      icon: 'information-circle-outline',
      label: t('menu.about'),
      action: 'navigate',
      screen: 'About',
    },
    {
      key: 'notifications',
      icon: 'notifications-outline',
      label: t('menu.notifications'),
      action: 'navigate',
      screen: 'NotificationSettings',
    },
    {
      key: 'deleteAccount',
      icon: 'trash-outline',
      label: t('menu.deleteAccount'),
      action: 'delete',
      destructive: true,
    },
  ], [t])

  const handleDeleteAccount = () => {
    Alert.alert(
      t('delete.title'),
      t('delete.body'),
      [
        { text: t('delete.cancel'), style: 'cancel' },
        {
          text: t('delete.confirm'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            try {
              await api.deleteMyAccount()
              Alert.alert(t('delete.successTitle'), t('delete.successBody'), [
                { text: t('ok', { ns: 'common' }), onPress: () => logout() },
              ])
            } catch (err) {
              Alert.alert(t('delete.errorTitle'), err instanceof Error ? err.message : t('delete.errorBody'))
            } finally {
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  const handlePress = (item: MenuItem) => {
    if (item.action === 'navigate' && item.screen) {
      navigation.navigate(item.screen as 'About' | 'NotificationSettings')
    } else if (item.action === 'delete') {
      handleDeleteAccount()
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {menuItems.map((item, index) => (
          <React.Fragment key={item.key}>
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
