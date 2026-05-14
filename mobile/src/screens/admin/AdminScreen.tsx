import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput as RNTextInput,
  RefreshControl,
} from 'react-native'
import { api } from '../../services/api'
import { Button } from '../../components/common/Button'
import { LoadingSpinner } from '../../components/common/LoadingSpinner'
import { COLORS } from '../../utils/constants'
import type { UserResponse, SpeciesResponse } from '@crabwatch/shared'

type Tab = 'users' | 'species' | 'backup'
type UserSubTab = 'active' | 'deleted' | 'invites'

export function AdminScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('users')
  const [userSubTab, setUserSubTab] = useState<UserSubTab>('active')
  const [users, setUsers] = useState<UserResponse[]>([])
  const [deletedUsers, setDeletedUsers] = useState<UserResponse[]>([])
  const [species, setSpecies] = useState<SpeciesResponse[]>([])
  const [backups, setBackups] = useState<any[]>([])
  const [invites, setInvites] = useState<any[]>([])
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('researcher')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const flash = useCallback((msg: string, type: 'error' | 'success') => {
    if (type === 'error') {
      setError(msg)
      setTimeout(() => setError(''), 4000)
    } else {
      setSuccess(msg)
      setTimeout(() => setSuccess(''), 4000)
    }
  }, [])

  const loadTabData = useCallback(async (tab: Tab, subTab?: UserSubTab) => {
    try {
      switch (tab) {
        case 'users': {
          if (subTab === 'active' || !subTab) {
            const data = await api.listUsers()
            setUsers(data.users)
          }
          if (subTab === 'deleted' || !subTab) {
            const data = await api.listDeletedUsers()
            setDeletedUsers(data.users)
          }
          if (subTab === 'invites' || !subTab) {
            const data = await api.listInvites()
            setInvites(data)
          }
          break
        }
        case 'species': {
          const data = await api.listSpecies()
          setSpecies(data)
          break
        }
        case 'backup': {
          const data = await api.listBackups()
          setBackups(data)
          break
        }
      }
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to load data', 'error')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [flash])

  useEffect(() => {
    setLoading(true)
    loadTabData(activeTab, activeTab === 'users' ? userSubTab : undefined)
  }, [activeTab, userSubTab, loadTabData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadTabData(activeTab, activeTab === 'users' ? userSubTab : undefined)
  }, [activeTab, userSubTab, loadTabData])

  const handleBackup = () => {
    Alert.alert(
      'Backup Database',
      'This will export all data to a backup file. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Backup',
          onPress: async () => {
            setActionLoading(true)
            try {
              const result = await api.backupDatabase()
              flash(`Backup created: ${result.fileName}`, 'success')
              loadTabData('backup')
            } catch (err) {
              flash(err instanceof Error ? err.message : 'Backup failed', 'error')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleCleanup = () => {
    Alert.alert(
      'Cleanup Deleted Users',
      'This will permanently delete all users past the 30-day retention period. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Cleanup',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true)
            try {
              const result = await api.cleanupDeletedUsers()
              flash(`${result.deletedCount} user(s) permanently deleted`, 'success')
              loadTabData('users', 'deleted')
            } catch (err) {
              flash(err instanceof Error ? err.message : 'Cleanup failed', 'error')
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
      'Change Role',
      `Change ${user.name}'s role to ${newRole}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Change',
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.updateUserRole(user.id, newRole)
              flash(`Role updated to ${newRole}`, 'success')
              loadTabData('users', 'active')
            } catch (err) {
              flash(err instanceof Error ? err.message : 'Failed to update role', 'error')
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
      'Delete User',
      `Soft-delete ${user.name}? They will be permanently removed after 30 days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.softDeleteUser(user.id)
              flash('User deleted', 'success')
              loadTabData('users', 'active')
            } catch (err) {
              flash(err instanceof Error ? err.message : 'Failed to delete user', 'error')
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
      'Restore User',
      `Restore ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.restoreUser(user.id)
              flash('User restored', 'success')
              loadTabData('users', 'deleted')
            } catch (err) {
              flash(err instanceof Error ? err.message : 'Failed to restore user', 'error')
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
      'Block User',
      `Block ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.blockUser(user.id)
              flash('User blocked', 'success')
              loadTabData('users', 'active')
            } catch (err) {
              flash(err instanceof Error ? err.message : 'Failed to block user', 'error')
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
      'Unblock User',
      `Unblock ${user.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.unblockUser(user.id)
              flash('User unblocked', 'success')
              loadTabData('users', 'active')
            } catch (err) {
              flash(err instanceof Error ? err.message : 'Failed to unblock user', 'error')
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
      'Send Invite',
      `Send ${role} invite to ${email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.createInvite(email, role)
              flash('Invite sent', 'success')
              loadTabData('users', 'invites')
            } catch (err) {
              flash(err instanceof Error ? err.message : 'Failed to send invite', 'error')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const handleDeleteSpecies = (s: SpeciesResponse) => {
    Alert.alert(
      'Delete Species',
      `Delete ${s.commonName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.deleteSpecies(s.id)
              flash('Species deleted', 'success')
              loadTabData('species')
            } catch (err) {
              flash(err instanceof Error ? err.message : 'Failed to delete species', 'error')
            } finally {
              setActionLoading(false)
            }
          },
        },
      ]
    )
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // --- Renders ---

  const renderActiveUsers = () => (
    <View style={{ flex: 1 }}>
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
              <View style={[styles.roleBadge, styles[`role${item.role}` as keyof typeof styles]]}>
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
                    <Text style={styles.actionBtnText}>Researcher</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.roleChangeBtn]}
                    onPress={() => handleRoleChange(item, 'user')}
                  >
                    <Text style={styles.actionBtnText}>User</Text>
                  </TouchableOpacity>
                </>
              )}
              {item.blockedAt ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.unblockBtn]}
                  onPress={() => handleUnblock(item)}
                >
                  <Text style={styles.actionBtnText}>Unblock</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.blockBtn]}
                  onPress={() => handleBlock(item)}
                >
                  <Text style={styles.actionBtnText}>Block</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.actionBtn, styles.deleteBtn]}
                onPress={() => handleSoftDelete(item)}
              >
                <Text style={styles.actionBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  )

  const renderDeletedUsers = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.toolbar}>
        <Button
          title="Cleanup Expired"
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
                  <Text style={styles.deletedText}>DELETED</Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.restoreBtn]}
                  onPress={() => handleRestore(item)}
                >
                  <Text style={styles.actionBtnText}>Restore</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      </View>
    </View>
  )

  const renderInvites = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.inviteForm}>
        <RNTextInput
          style={styles.input}
          placeholder="Email address"
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
              Researcher
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleOption, inviteRole === 'admin' && styles.roleOptionActive]}
            onPress={() => setInviteRole('admin')}
          >
            <Text style={[styles.roleOptionText, inviteRole === 'admin' && styles.roleOptionTextActive]}>
              Admin
            </Text>
          </TouchableOpacity>
        </View>
        <Button
          title="Send Invite"
          onPress={() => {
            if (inviteEmail.trim()) {
              handleInvite(inviteEmail.trim(), inviteRole)
              setInviteEmail('')
            } else {
              flash('Please enter an email address', 'error')
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
                    {item.role} • {item.used ? 'Used' : `Expires ${formatDate(item.expiresAt)}`}
                  </Text>
                </View>
                <View style={[styles.statusBadge, item.used ? styles.usedBadge : styles.pendingBadge]}>
                  <Text style={styles.statusText}>{item.used ? 'USED' : 'PENDING'}</Text>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      </View>
    </View>
    )

  const renderUsers = () => (
    <View style={{ flex: 1, width: '100%' }}>
      <View style={[styles.subTabBar, { width: '100%' }]}>
        <TouchableOpacity
          style={[styles.subTab, userSubTab === 'active' && styles.subTabActive]}
          onPress={() => setUserSubTab('active')}
        >
          <Text style={[styles.subTabText, userSubTab === 'active' && styles.subTabTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, userSubTab === 'deleted' && styles.subTabActive]}
          onPress={() => setUserSubTab('deleted')}
        >
          <Text style={[styles.subTabText, userSubTab === 'deleted' && styles.subTabTextActive]}>
            Deleted
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, userSubTab === 'invites' && styles.subTabActive]}
          onPress={() => setUserSubTab('invites')}
        >
          <Text style={[styles.subTabText, userSubTab === 'invites' && styles.subTabTextActive]}>
            Invites
          </Text>
        </TouchableOpacity>
      </View>
      {userSubTab === 'active' ? renderActiveUsers() : userSubTab === 'deleted' ? renderDeletedUsers() : renderInvites()}
    </View>
  )

  const renderSpecies = () => (
    <FlatList
      data={species}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.speciesName}>{item.commonName}</Text>
              <Text style={styles.speciesScientific}>{item.scientificName}</Text>
            </View>
            <TouchableOpacity
              style={[styles.actionBtn, styles.deleteBtn]}
              onPress={() => handleDeleteSpecies(item)}
            >
              <Text style={styles.actionBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
      )}
      contentContainerStyle={styles.listContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    />
  )

  const renderBackup = () => (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Button
          title="Create Backup"
          onPress={handleBackup}
          loading={actionLoading}
        />
      </View>
      <FlatList
        data={backups}
        keyExtractor={(item) => item.fileName}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.fileName}>{item.fileName}</Text>
                <Text style={styles.fileMeta}>
                  {formatFileSize(item.size)} • {formatDate(item.timestamp)}
                </Text>
              </View>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  )

  const tabs: { key: Tab; label: string }[] = [
    { key: 'users', label: 'Users' },
    { key: 'species', label: 'Species' },
    { key: 'backup', label: 'Backup' },
  ]

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.alert}>
          <Text style={styles.alertText}>{error}</Text>
        </View>
      ) : null}
      {success ? (
        <View style={[styles.alert, styles.successAlert]}>
          <Text style={[styles.alertText, styles.successText]}>{success}</Text>
        </View>
      ) : null}

      <View style={styles.tabBar}>
        <View style={styles.tabBarContent}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'species' && renderSpecies()}
        {activeTab === 'backup' && renderBackup()}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleuser: {
    backgroundColor: '#e0e7ff',
  },
  roleresearcher: {
    backgroundColor: '#fef3c7',
  },
  roleadmin: {
    backgroundColor: '#dcfce7',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  roleChangeBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  blockBtn: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  unblockBtn: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  deleteBtn: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  restoreBtn: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  deletedBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deletedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#991b1b',
  },
  speciesName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  speciesScientific: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  fileMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  inviteForm: {
    padding: 16,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  roleOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#e0f2fe',
  },
  roleOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  roleOptionTextActive: {
    color: COLORS.primary,
  },
  inviteEmail: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  inviteMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  usedBadge: {
    backgroundColor: '#f1f5f9',
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tabBar: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tabBarContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 0,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 16,
  },
  subTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  subTabActive: {
    borderBottomColor: COLORS.primary,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  subTabTextActive: {
    color: COLORS.primary,
  },
  toolbar: {
    padding: 16,
  },
  alert: {
    padding: 12,
    backgroundColor: '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  successAlert: {
    backgroundColor: '#dcfce7',
    borderBottomColor: '#bbf7d0',
  },
  alertText: {
    fontSize: 13,
    color: '#991b1b',
    textAlign: 'center',
  },
  successText: {
    color: '#166534',
  },
})
