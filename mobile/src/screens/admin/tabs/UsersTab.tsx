import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput as RNTextInput,
  RefreshControl,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useIsFocused } from '@react-navigation/native'
import { api } from '../../../services/api'
import { Button } from '../../../components/common/Button'
import { COLORS } from '../../../utils/constants'
import { useFormatters } from '../../../hooks/useFormatters'
import type { UserResponse, Invite } from '@crabwatch/shared'
import { styles } from './styles'

type UserSubTab = 'active' | 'deleted' | 'invites'

interface UsersTabProps {
  flash: (msg: string, type: 'error' | 'success') => void
}

export function UsersTab({ flash }: UsersTabProps) {
  const { t } = useTranslation('admin')
  const { formatDate } = useFormatters()
  const [userSubTab, setUserSubTab] = useState<UserSubTab>('active')
  const [users, setUsers] = useState<UserResponse[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [usersPage, setUsersPage] = useState(1)
  const [usersSearch, setUsersSearch] = useState('')
  const [usersRoleFilter, setUsersRoleFilter] = useState('')
  const [deletedUsers, setDeletedUsers] = useState<UserResponse[]>([])
  const [deletedUsersTotal, setDeletedUsersTotal] = useState(0)
  const [deletedUsersPage, setDeletedUsersPage] = useState(1)
  const [invites, setInvites] = useState<Invite[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('researcher')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  const loadData = useCallback(async (subTab?: UserSubTab) => {
    try {
      if (subTab === 'active' || !subTab) {
        const data = await api.listUsers(usersPage, 20, usersSearch || undefined, usersRoleFilter || undefined)
        setUsers(data.users)
        setUsersTotal(data.total)
      }
      if (subTab === 'deleted' || !subTab) {
        const data = await api.listDeletedUsers(deletedUsersPage, 20)
        setDeletedUsers(data.users)
        setDeletedUsersTotal(data.total)
      }
      if (subTab === 'invites' || !subTab) {
        const data = await api.listInvites()
        setInvites(data)
      }
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to load data', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [flash, usersPage, usersSearch, usersRoleFilter, deletedUsersPage])

  useEffect(() => {
    setLoading(true)
    loadData(userSubTab)
  }, [userSubTab, loadData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData(userSubTab)
  }, [userSubTab, loadData])

  const isFocused = useIsFocused()
  useEffect(() => {
    if (isFocused) {
      loadData(userSubTab)
    }
  }, [isFocused, userSubTab, loadData])

  const handleCleanup = () => {
    Alert.alert(
      t('alerts.cleanup.title'),
      t('alerts.cleanup.message'),
      [
        { text: t('cancel', { ns: 'common' }), style: 'cancel' },
        {
          text: t('alerts.cleanup.confirm'),
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true)
            try {
              const result = await api.cleanupDeletedUsers()
              flash(t('flash.cleanupDone', { count: result.deletedCount }), 'success')
              loadData('deleted')
            } catch (err) {
              flash(err instanceof Error ? err.message : t('flash.cleanupFailed'), 'error')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleRoleChange = (user: UserResponse, newRole: string) => {
    Alert.alert(
      t('alerts.changeRole.title'),
      t('alerts.changeRole.message', { name: user.name, role: newRole }),
      [
        { text: t('cancel', { ns: 'common' }), style: 'cancel' },
        {
          text: t('alerts.changeRole.confirm'),
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.updateUserRole(user.id, newRole)
              flash(t('flash.roleUpdated', { role: newRole }), 'success')
              loadData('active')
            } catch (err) {
              flash(err instanceof Error ? err.message : t('flash.roleUpdateFailed'), 'error')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleSoftDelete = (user: UserResponse) => {
    Alert.alert(
      t('alerts.deleteUser.title'),
      t('alerts.deleteUser.message', { name: user.name }),
      [
        { text: t('cancel', { ns: 'common' }), style: 'cancel' },
        {
          text: t('alerts.deleteUser.confirm'),
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.softDeleteUser(user.id)
              flash(t('flash.userDeleted'), 'success')
              loadData('active')
            } catch (err) {
              flash(err instanceof Error ? err.message : t('flash.userDeleteFailed'), 'error')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleRestore = (user: UserResponse) => {
    Alert.alert(
      t('alerts.restoreUser.title'),
      t('alerts.restoreUser.message', { name: user.name }),
      [
        { text: t('cancel', { ns: 'common' }), style: 'cancel' },
        {
          text: t('alerts.restoreUser.confirm'),
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.restoreUser(user.id)
              flash(t('flash.userRestored'), 'success')
              loadData('deleted')
            } catch (err) {
              flash(err instanceof Error ? err.message : t('flash.userRestoreFailed'), 'error')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleBlock = (user: UserResponse) => {
    Alert.alert(
      t('alerts.blockUser.title'),
      t('alerts.blockUser.message', { name: user.name }),
      [
        { text: t('cancel', { ns: 'common' }), style: 'cancel' },
        {
          text: t('alerts.blockUser.confirm'),
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.blockUser(user.id)
              flash(t('flash.userBlocked'), 'success')
              loadData('active')
            } catch (err) {
              flash(err instanceof Error ? err.message : t('flash.userBlockFailed'), 'error')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleUnblock = (user: UserResponse) => {
    Alert.alert(
      t('alerts.unblockUser.title'),
      t('alerts.unblockUser.message', { name: user.name }),
      [
        { text: t('cancel', { ns: 'common' }), style: 'cancel' },
        {
          text: t('alerts.unblockUser.confirm'),
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.unblockUser(user.id)
              flash(t('flash.userUnblocked'), 'success')
              loadData('active')
            } catch (err) {
              flash(err instanceof Error ? err.message : t('flash.userUnblockFailed'), 'error')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleInvite = (email: string, role: string) => {
    Alert.alert(
      t('alerts.sendInvite.title'),
      t('alerts.sendInvite.message', { role, email }),
      [
        { text: t('cancel', { ns: 'common' }), style: 'cancel' },
        {
          text: t('alerts.sendInvite.confirm'),
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.createInvite(email, role)
              flash(t('flash.inviteSent'), 'success')
              loadData('invites')
            } catch (err) {
              flash(err instanceof Error ? err.message : t('flash.inviteSendFailed'), 'error')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleResendInvite = (email: string, role: string) => {
    Alert.alert(
      t('alerts.resendInvite.title'),
      t('alerts.resendInvite.message', { role, email }),
      [
        { text: t('cancel', { ns: 'common' }), style: 'cancel' },
        {
          text: t('alerts.resendInvite.confirm'),
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.createInvite(email, role)
              flash(t('flash.inviteResent'), 'success')
              loadData('invites')
            } catch (err) {
              flash(err instanceof Error ? err.message : t('flash.inviteResendFailed'), 'error')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const renderActiveUsers = () => {
    const usersTotalPages = Math.ceil(usersTotal / 20)
    return (
    <View style={{ flex: 1 }}>
      <View style={styles.toolbar}>
        <RNTextInput
          style={[styles.input, { flex: 1, marginRight: 8 }]}
          placeholder={t('users.searchPlaceholder') || 'Search by name or email...'}
          value={usersSearch}
          onChangeText={setUsersSearch}
          placeholderTextColor={COLORS.textLight}
          onSubmitEditing={() => { setUsersPage(1); loadData('active') }}
        />
        <TouchableOpacity
          style={[styles.actionBtn, styles.searchBtn]}
          onPress={() => { setUsersPage(1); loadData('active') }}
        >
          <Text style={styles.actionBtnText}>{t('search') || 'Search'}</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 14, color: COLORS.text, marginRight: 8 }}>{t('users.role') || 'Role'}:</Text>
        <View style={{ flexDirection: 'row', flex: 1, gap: 6 }}>
          {['', 'user', 'researcher', 'admin'].map((role) => (
            <TouchableOpacity
              key={role || 'all'}
              style={[styles.roleOption, usersRoleFilter === role && styles.roleOptionActive]}
              onPress={() => { setUsersRoleFilter(role); setUsersPage(1); loadData('active') }}
            >
              <Text style={[styles.roleOptionText, usersRoleFilter === role && styles.roleOptionTextActive]}>
                {role ? (role === 'user' ? t('users.roles.user') : role === 'researcher' ? t('users.roles.researcher') : t('users.roles.admin')) : (t('users.roles.all') || 'All')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      {(usersSearch || usersRoleFilter) && (
        <View style={{ marginBottom: 8, alignItems: 'center' }}>
          <TouchableOpacity onPress={() => { setUsersSearch(''); setUsersRoleFilter(''); setUsersPage(1); loadData('active') }}>
            <Text style={{ fontSize: 13, color: COLORS.textLight }}>{t('clear') || 'Clear filters'}</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
              </View>
              <View
                style={[
                  styles.roleBadge,
                  item.role === 'admin'
                    ? styles.roleadmin
                    : item.role === 'researcher'
                      ? styles.roleresearcher
                      : styles.roleuser,
                ]}
              >
                <Text style={styles.roleText}>{item.role}</Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              {item.role !== 'admin' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.roleChangeBtn]}
                    onPress={() => handleRoleChange(item, 'researcher')}
                  >
                    <Text style={styles.actionBtnText}>{t('users.roles.researcher')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.roleChangeBtn]}
                    onPress={() => handleRoleChange(item, 'user')}
                  >
                    <Text style={styles.actionBtnText}>{t('users.roles.user')}</Text>
                  </TouchableOpacity>
                </>
              )}
              {item.blockedAt ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.unblockBtn]}
                  onPress={() => handleUnblock(item)}
                >
                  <Text style={styles.actionBtnText}>{t('users.action.unblock')}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.blockBtn]}
                  onPress={() => handleBlock(item)}
                >
                  <Text style={styles.actionBtnText}>{t('users.action.block')}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => handleSoftDelete(item)}
              >
                <Text style={styles.actionBtnText}>{t('delete', { ns: 'common' })}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListFooterComponent={() =>
          usersTotalPages > 1 ? (
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, gap: 12 }}>
              <TouchableOpacity
                disabled={usersPage <= 1}
                onPress={() => { setUsersPage(usersPage - 1); loadData('active') }}
                style={{ opacity: usersPage <= 1 ? 0.5 : 1 }}
              >
                <Text style={{ fontSize: 14, color: COLORS.primary }}>{t('pagination.prev') || 'Previous'}</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 14, color: COLORS.text }}>
                {t('pagination.page', { current: usersPage, total: usersTotalPages }) || `${usersPage} / ${usersTotalPages}`}
              </Text>
              <TouchableOpacity
                disabled={usersPage >= usersTotalPages}
                onPress={() => { setUsersPage(usersPage + 1); loadData('active') }}
                style={{ opacity: usersPage >= usersTotalPages ? 0.5 : 1 }}
              >
                <Text style={{ fontSize: 14, color: COLORS.primary }}>{t('pagination.next') || 'Next'}</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />
    </View>
    )
  }

  const renderDeletedUsers = () => {
    const deletedTotalPages = Math.ceil(deletedUsersTotal / 20)
    return (
    <View style={{ flex: 1 }}>
      <View style={styles.toolbar}>
        <Button
          title={t('users.cleanup.title')}
          onPress={handleCleanup}
          loading={actionLoading}
          variant="danger"
        />
      </View>
      <View style={{ flex: 1 }}>
        <FlatList
          data={deletedUsers}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                </View>
                <View style={styles.deletedBadge}>
                  <Text style={styles.deletedText}>{t('users.status.deleted').toUpperCase()}</Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.restoreBtn]}
                  onPress={() => handleRestore(item)}
                >
                  <Text style={styles.actionBtnText}>{t('users.action.restore')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListFooterComponent={() =>
            deletedTotalPages > 1 ? (
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, gap: 12 }}>
                <TouchableOpacity
                  disabled={deletedUsersPage <= 1}
                  onPress={() => { setDeletedUsersPage(deletedUsersPage - 1); loadData('deleted') }}
                  style={{ opacity: deletedUsersPage <= 1 ? 0.5 : 1 }}
                >
                  <Text style={{ fontSize: 14, color: COLORS.primary }}>{t('pagination.prev') || 'Previous'}</Text>
                </TouchableOpacity>
                <Text style={{ fontSize: 14, color: COLORS.text }}>
                  {t('pagination.page', { current: deletedUsersPage, total: deletedTotalPages }) || `${deletedUsersPage} / ${deletedTotalPages}`}
                </Text>
                <TouchableOpacity
                  disabled={deletedUsersPage >= deletedTotalPages}
                  onPress={() => { setDeletedUsersPage(deletedUsersPage + 1); loadData('deleted') }}
                  style={{ opacity: deletedUsersPage >= deletedTotalPages ? 0.5 : 1 }}
                >
                  <Text style={{ fontSize: 14, color: COLORS.primary }}>{t('pagination.next') || 'Next'}</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      </View>
    </View>
    )
  }

  const renderInvites = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.inviteForm}>
        <RNTextInput
          style={styles.input}
          placeholder={t('invite.emailPlaceholder')}
          value={inviteEmail}
          onChangeText={setInviteEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor={COLORS.textLight}
        />
        <View style={styles.roleSelector}>
          <TouchableOpacity
            style={[styles.roleOption, inviteRole === 'researcher' && styles.roleOptionActive]}
            onPress={() => setInviteRole('researcher')}
          >
            <Text style={[styles.roleOptionText, inviteRole === 'researcher' && styles.roleOptionTextActive]}>
              {t('users.roles.researcher')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleOption, inviteRole === 'admin' && styles.roleOptionActive]}
            onPress={() => setInviteRole('admin')}
          >
            <Text style={[styles.roleOptionText, inviteRole === 'admin' && styles.roleOptionTextActive]}>
              {t('users.roles.admin')}
            </Text>
          </TouchableOpacity>
        </View>
        <Button
          title={t('invite.send')}
          onPress={() => {
            if (inviteEmail.trim()) {
              handleInvite(inviteEmail.trim(), inviteRole)
              setInviteEmail('')
            } else {
              flash(t('invite.error.emailRequired'), 'error')
            }
          }}
          loading={actionLoading}
        />
      </View>
      <View style={{ flex: 1 }}>
        <FlatList
          data={invites}
          keyExtractor={(item, idx) => item.token || String(idx)}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.inviteEmail}>{item.email}</Text>
                  <Text style={styles.inviteMeta}>
                    {item.role} • {item.used ? t('invite.status.used') : `${t('invite.status.expires')} ${formatDate(item.expiresAt)}`}
                  </Text>
                </View>
                <View style={[styles.statusBadge, item.used ? styles.usedBadge : styles.pendingBadge]}>
                  <Text style={styles.statusText}>{item.used ? t('invite.status.used').toUpperCase() : t('invite.status.pending').toUpperCase()}</Text>
                </View>
              </View>
              {!item.used && (
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.inviteResendBtn]}
                    onPress={() => handleResendInvite(item.email, item.role)}
                    disabled={actionLoading}
                  >
                    <Text style={styles.actionBtnText}>{t('invite.resend')}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      </View>
    </View>
    )

  if (loading) {
    return null
  }

  return (
    <View style={{ flex: 1, width: '100%' }}>
      <View style={[styles.subTabBar, { width: '100%' }]}>
        <TouchableOpacity
          style={[styles.subTab, userSubTab === 'active' && styles.subTabActive]}
          onPress={() => setUserSubTab('active')}
        >
          <Text style={[styles.subTabText, userSubTab === 'active' && styles.subTabTextActive]}>
            {t('users.subTab.active')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, userSubTab === 'deleted' && styles.subTabActive]}
          onPress={() => setUserSubTab('deleted')}
        >
          <Text style={[styles.subTabText, userSubTab === 'deleted' && styles.subTabTextActive]}>
            {t('users.subTab.deleted')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, userSubTab === 'invites' && styles.subTabActive]}
          onPress={() => setUserSubTab('invites')}
        >
          <Text style={[styles.subTabText, userSubTab === 'invites' && styles.subTabTextActive]}>
            {t('users.subTab.invites')}
          </Text>
        </TouchableOpacity>
      </View>
      {userSubTab === 'active' ? renderActiveUsers() : userSubTab === 'deleted' ? renderDeletedUsers() : renderInvites()}
    </View>
  )
}
