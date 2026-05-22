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
import { FONT } from '../../utils/fonts'
import type { UserResponse, SpeciesResponse, Invite, GamificationRuleDto, LevelConfigDto, CampaignDto, AdminAuditLogDto, AbuseSignalDto, EngagementMetricsDto, RecalculationJobDto } from '@crabwatch/shared'

type Tab = 'users' | 'species' | 'backup' | 'engagement'
type UserSubTab = 'active' | 'deleted' | 'invites'
type EngagementSubTab = 'xp-rules' | 'levels' | 'xp-adjust' | 'campaigns' | 'audit' | 'abuse' | 'metrics'

export function AdminScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('users')
  const [userSubTab, setUserSubTab] = useState<UserSubTab>('active')
  const [users, setUsers] = useState<UserResponse[]>([])
  const [deletedUsers, setDeletedUsers] = useState<UserResponse[]>([])
  const [species, setSpecies] = useState<SpeciesResponse[]>([])
  const [backups, setBackups] = useState<{ fileName: string; size: number; timestamp: string }[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [rules, setRules] = useState<GamificationRuleDto[]>([])
  const [levels, setLevels] = useState<LevelConfigDto[]>([])
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([])
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogDto[]>([])
  const [auditStats, setAuditStats] = useState<{ total: number; byAction: Record<string, number>; byResourceType: Record<string, number> } | null>(null)
  const [abuseSignals, setAbuseSignals] = useState<AbuseSignalDto[]>([])
  const [metrics, setMetrics] = useState<EngagementMetricsDto | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('researcher')
  const [engagementSubTab, setEngagementSubTab] = useState<EngagementSubTab>('xp-rules')
  const [speciesDraft, setSpeciesDraft] = useState({ commonName: '', scientificName: '', description: '' })
  const [editingSpeciesId, setEditingSpeciesId] = useState<string | null>(null)
  const [ruleDraft, setRuleDraft] = useState({ actionType: '', name: '', description: '', xpReward: 0, active: true })
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [levelDraft, setLevelDraft] = useState({ level: 1, xpThreshold: 0, title: '', description: '', active: true })
  const [editingLevelId, setEditingLevelId] = useState<string | null>(null)
  const [adjUserId, setAdjUserId] = useState('')
  const [adjDeltaXP, setAdjDeltaXP] = useState(0)
  const [adjReason, setAdjReason] = useState('')
  const [recalcMode, setRecalcMode] = useState<'dry-run' | 'execute'>('dry-run')
  const [recalcUserId, setRecalcUserId] = useState('')
  const [recalcReason, setRecalcReason] = useState('')
  const [recalcResults, setRecalcResults] = useState<any | null>(null)
  const [recalcJobIdInput, setRecalcJobIdInput] = useState('')
  const [recalcJobStatus, setRecalcJobStatus] = useState<any | null>(null)
  const [campaignDraft, setCampaignDraft] = useState({
    code: '',
    name: '',
    channel: 'PUSH',
    title: '',
    body: '',
    minLevel: 1,
  })
  const [campaignTestUserId, setCampaignTestUserId] = useState('')
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
        case 'engagement': {
          const [rulesData, levelsData, metricsData, campaignsData, logsData, statsData, abuseData] = await Promise.all([
            api.listGamificationRules(),
            api.listLevelConfigs(),
            api.getEngagementMetrics().catch(() => null),
            api.listCampaigns().catch(() => []),
            api.getAuditLogs({ limit: 20 }).catch(() => []),
            api.getAuditLogStats().catch(() => null),
            api.getAbuseSignals().catch(() => []),
          ])
          setRules(rulesData)
          setLevels(levelsData)
          setMetrics(metricsData)
          const normalizedLogs = Array.isArray(logsData) ? logsData : []
          setCampaigns(Array.isArray(campaignsData) ? campaignsData : [])
          setAuditLogs(normalizedLogs)
          setAuditStats(statsData)
          setAbuseSignals(Array.isArray(abuseData) ? abuseData : [])
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

  const handleResendInvite = (email: string, role: string) => {
    Alert.alert(
      'Resend Invite',
      `Resend ${role} invite to ${email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resend',
          onPress: async () => {
            setActionLoading(true)
            try {
              await api.createInvite(email, role)
              flash('Invite resent', 'success')
              loadTabData('users', 'invites')
            } catch (err) {
              flash(err instanceof Error ? err.message : 'Failed to resend invite', 'error')
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

  const resetSpeciesDraft = () => {
    setSpeciesDraft({ commonName: '', scientificName: '', description: '' })
    setEditingSpeciesId(null)
  }

  const handleEditSpecies = (s: SpeciesResponse) => {
    setEditingSpeciesId(s.id)
    setSpeciesDraft({
      commonName: s.commonName || '',
      scientificName: s.scientificName || '',
      description: s.description || '',
    })
  }

  const handleSaveSpecies = async () => {
    if (!speciesDraft.commonName.trim() || !speciesDraft.scientificName.trim()) {
      flash('Common and scientific names are required', 'error')
      return
    }

    setActionLoading(true)
    try {
      if (editingSpeciesId) {
        await api.updateSpecies(editingSpeciesId, {
          commonName: speciesDraft.commonName.trim(),
          scientificName: speciesDraft.scientificName.trim(),
          description: speciesDraft.description.trim() || undefined,
        })
        flash('Species updated', 'success')
      } else {
        await api.createSpecies({
          commonName: speciesDraft.commonName.trim(),
          scientificName: speciesDraft.scientificName.trim(),
          description: speciesDraft.description.trim() || '',
          keyFeatures: [],
          images: [],
          distributionZones: [],
        })
        flash('Species created', 'success')
      }

      resetSpeciesDraft()
      loadTabData('species')
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to save species', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const resetRuleDraft = () => {
    setRuleDraft({ actionType: '', name: '', description: '', xpReward: 0, active: true })
    setEditingRuleId(null)
  }

  const handleEditRule = (rule: any) => {
    setEditingRuleId(rule.id)
    setRuleDraft({
      actionType: rule.actionType || '',
      name: rule.name || '',
      description: rule.description || '',
      xpReward: Number(rule.xpReward) || 0,
      active: rule.active !== false,
    })
  }

  const handleSaveRule = async () => {
    if (!ruleDraft.actionType.trim() || !ruleDraft.name.trim()) {
      flash('Action type and name are required', 'error')
      return
    }

    setActionLoading(true)
    try {
      const createPayload = {
        actionType: ruleDraft.actionType.trim() as any,
        name: ruleDraft.name.trim(),
        description: ruleDraft.description.trim() || null,
        xpReward: ruleDraft.xpReward,
        active: ruleDraft.active,
      }

      if (editingRuleId) {
        await api.updateGamificationRule(editingRuleId, createPayload)
        flash('XP rule updated', 'success')
      } else {
        await api.createGamificationRule(createPayload)
        flash('XP rule created', 'success')
      }

      resetRuleDraft()
      loadTabData('engagement')
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to save XP rule', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteRule = (rule: any) => {
    Alert.alert('Delete XP Rule', `Delete "${rule.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true)
          try {
            await api.deleteGamificationRule(rule.id)
            flash('XP rule deleted', 'success')
            loadTabData('engagement')
          } catch (err) {
            flash(err instanceof Error ? err.message : 'Failed to delete XP rule', 'error')
          } finally {
            setActionLoading(false)
          }
        },
      },
    ])
  }

  const handleToggleRule = async (rule: any) => {
    setActionLoading(true)
    try {
      await api.updateGamificationRule(rule.id, { active: !rule.active })
      flash(rule.active ? 'Rule disabled' : 'Rule enabled', 'success')
      loadTabData('engagement')
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to update rule', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const resetLevelDraft = () => {
    setLevelDraft({ level: 1, xpThreshold: 0, title: '', description: '', active: true })
    setEditingLevelId(null)
  }

  const handleEditLevel = (level: any) => {
    setEditingLevelId(level.id)
    setLevelDraft({
      level: Number(level.level) || 1,
      xpThreshold: Number(level.xpThreshold) || 0,
      title: level.title || '',
      description: level.description || '',
      active: level.active !== false,
    })
  }

  const handleSaveLevel = async () => {
    if (!levelDraft.title.trim()) {
      flash('Level title is required', 'error')
      return
    }

    setActionLoading(true)
    try {
      const payload = {
        level: levelDraft.level,
        xpThreshold: levelDraft.xpThreshold,
        title: levelDraft.title.trim(),
        description: levelDraft.description.trim() || null,
        active: levelDraft.active,
      }

      if (editingLevelId) {
        await api.updateLevelConfig(editingLevelId, payload)
        flash('Level updated', 'success')
      } else {
        await api.createLevelConfig(payload)
        flash('Level created', 'success')
      }

      resetLevelDraft()
      loadTabData('engagement')
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to save level', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteLevel = (level: any) => {
    Alert.alert('Delete Level', `Delete level ${level.level} (${level.title})?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true)
          try {
            await api.deleteLevelConfig(level.id)
            flash('Level deleted', 'success')
            loadTabData('engagement')
          } catch (err) {
            flash(err instanceof Error ? err.message : 'Failed to delete level', 'error')
          } finally {
            setActionLoading(false)
          }
        },
      },
    ])
  }

  const handleAdjustXP = async () => {
    if (!adjUserId.trim() || !adjReason.trim() || adjDeltaXP === 0) {
      flash('User ID, non-zero delta XP, and reason are required', 'error')
      return
    }
    setActionLoading(true)
    try {
      await api.adjustXP({ userId: adjUserId.trim(), deltaXP: adjDeltaXP, reason: adjReason.trim() })
      flash('XP adjusted successfully', 'success')
      setAdjReason('')
      setAdjDeltaXP(0)
      loadTabData('engagement')
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to adjust XP', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRecalculate = async () => {
    setActionLoading(true)
    try {
      const result = await api.recalculateXP({
        mode: recalcMode,
        userId: recalcUserId.trim() || undefined,
        reason: recalcReason.trim() || undefined,
      })
      setRecalcResults(result)
      if (result?.id) {
        setRecalcJobStatus(result)
        setRecalcJobIdInput(result.id)
      }
      flash('Recalculation completed', 'success')
      loadTabData('engagement')
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to recalculate', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCheckRecalcJob = async () => {
    if (!recalcJobIdInput.trim()) {
      flash('Enter a job ID', 'error')
      return
    }
    setActionLoading(true)
    try {
      const status = await api.getRecalculationJobStatus(recalcJobIdInput.trim())
      setRecalcJobStatus(status)
      flash('Job status updated', 'success')
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to check job status', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCreateCampaign = async () => {
    if (!campaignDraft.code.trim() || !campaignDraft.name.trim() || !campaignDraft.title.trim() || !campaignDraft.body.trim()) {
      flash('Code, name, title and body are required', 'error')
      return
    }
    setActionLoading(true)
    try {
      await api.createCampaign({
        code: campaignDraft.code.trim(),
        name: campaignDraft.name.trim(),
        channel: campaignDraft.channel,
        audienceFilter: { minLevel: campaignDraft.minLevel },
        content: { title: campaignDraft.title.trim(), body: campaignDraft.body.trim() },
      })
      flash('Campaign created', 'success')
      setCampaignDraft({ code: '', name: '', channel: 'PUSH', title: '', body: '', minLevel: 1 })
      loadTabData('engagement')
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to create campaign', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLaunchCampaign = (campaign: any) => {
    Alert.alert('Launch Campaign', `Launch ${campaign.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Launch',
        onPress: async () => {
          setActionLoading(true)
          try {
            const result = await api.launchCampaign(campaign.id)
            flash('Campaign launched successfully', 'success')
            loadTabData('engagement')
          } catch (err) {
            flash(err instanceof Error ? err.message : 'Failed to launch campaign', 'error')
          } finally {
            setActionLoading(false)
          }
        },
      },
    ])
  }

  const handleSendTestCampaign = async (campaignId: string) => {
    if (!campaignTestUserId.trim()) {
      flash('Test user ID is required', 'error')
      return
    }
    setActionLoading(true)
    try {
      await api.sendTestCampaign(campaignId, campaignTestUserId.trim())
      flash('Test campaign sent', 'success')
      setCampaignTestUserId('')
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to send test campaign', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteCampaign = (campaign: any) => {
    Alert.alert('Delete Campaign', `Delete ${campaign.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true)
          try {
            await api.deleteCampaign(campaign.id)
            flash('Campaign deleted', 'success')
            loadTabData('engagement')
          } catch (err) {
            flash(err instanceof Error ? err.message : 'Failed to delete campaign', 'error')
          } finally {
            setActionLoading(false)
          }
        },
      },
    ])
  }

  const handleResolveAbuseSignal = async (signal: any) => {
    setActionLoading(true)
    try {
      await api.resolveAbuseSignal(signal.id, 'Resolved via mobile admin panel')
      flash('Abuse signal resolved', 'success')
      loadTabData('engagement')
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Failed to resolve signal', 'error')
    } finally {
      setActionLoading(false)
    }
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
              {!item.used && (
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.inviteResendBtn]}
                    onPress={() => handleResendInvite(item.email, item.role)}
                    disabled={actionLoading}
                  >
                    <Text style={styles.actionBtnText}>Resend</Text>
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
    <View style={{ flex: 1 }}>
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{editingSpeciesId ? 'Edit Species' : 'Add Species'}</Text>
        <RNTextInput
          style={styles.input}
          placeholder="Common name"
          value={speciesDraft.commonName}
          onChangeText={(v) => setSpeciesDraft((prev) => ({ ...prev, commonName: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder="Scientific name"
          value={speciesDraft.scientificName}
          onChangeText={(v) => setSpeciesDraft((prev) => ({ ...prev, scientificName: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder="Description (optional)"
          value={speciesDraft.description}
          onChangeText={(v) => setSpeciesDraft((prev) => ({ ...prev, description: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <View style={styles.inlineActions}>
          <Button
            title={editingSpeciesId ? 'Save Species' : 'Add Species'}
            onPress={handleSaveSpecies}
            loading={actionLoading}
          />
          {editingSpeciesId ? (
            <Button title="Cancel" onPress={resetSpeciesDraft} variant="secondary" />
          ) : null}
        </View>
      </View>

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
              <View style={styles.inlineActions}>
                <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => handleEditSpecies(item)}>
                  <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => handleDeleteSpecies(item)}
                >
                  <Text style={styles.actionBtnText}>Delete</Text>
                </TouchableOpacity>
              </View>
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
    </View>
  )

  const renderRules = () => (
    <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.formCardInScroll}>
        <Text style={styles.formTitle}>{editingRuleId ? 'Edit XP Rule' : 'Add XP Rule'}</Text>
        <RNTextInput
          style={styles.input}
          placeholder="Action type"
          value={ruleDraft.actionType}
          onChangeText={(v) => setRuleDraft((prev) => ({ ...prev, actionType: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder="Name"
          value={ruleDraft.name}
          onChangeText={(v) => setRuleDraft((prev) => ({ ...prev, name: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder="Description (optional)"
          value={ruleDraft.description}
          onChangeText={(v) => setRuleDraft((prev) => ({ ...prev, description: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder="XP reward"
          keyboardType="numeric"
          value={String(ruleDraft.xpReward)}
          onChangeText={(v) => setRuleDraft((prev) => ({ ...prev, xpReward: parseInt(v, 10) || 0 }))}
          placeholderTextColor={COLORS.textLight}
        />
        <View style={styles.inlineActions}>
          <Button title={editingRuleId ? 'Save Rule' : 'Add Rule'} onPress={handleSaveRule} loading={actionLoading} />
          {editingRuleId ? (
            <Button title="Cancel" onPress={resetRuleDraft} variant="secondary" />
          ) : null}
        </View>
      </View>

      {rules.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.userEmail}>{item.actionType} • {item.xpReward} XP</Text>
            </View>
            <View style={[styles.statusBadge, item.active ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={styles.statusText}>{item.active ? 'ACTIVE' : 'INACTIVE'}</Text>
            </View>
          </View>
          {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
          <View style={styles.cardActions}>
            <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => handleEditRule(item)}>
              <Text style={styles.actionBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.roleChangeBtn]} onPress={() => handleToggleRule(item)}>
              <Text style={styles.actionBtnText}>{item.active ? 'Disable' : 'Enable'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDeleteRule(item)}>
              <Text style={styles.actionBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  )

  const renderLevels = () => (
    <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.formCardInScroll}>
        <Text style={styles.formTitle}>{editingLevelId ? 'Edit Level' : 'Add Level'}</Text>
        <RNTextInput
          style={styles.input}
          placeholder="Level"
          keyboardType="numeric"
          value={String(levelDraft.level)}
          onChangeText={(v) => setLevelDraft((prev) => ({ ...prev, level: parseInt(v, 10) || 1 }))}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder="XP threshold"
          keyboardType="numeric"
          value={String(levelDraft.xpThreshold)}
          onChangeText={(v) => setLevelDraft((prev) => ({ ...prev, xpThreshold: parseInt(v, 10) || 0 }))}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder="Title"
          value={levelDraft.title}
          onChangeText={(v) => setLevelDraft((prev) => ({ ...prev, title: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder="Description (optional)"
          value={levelDraft.description}
          onChangeText={(v) => setLevelDraft((prev) => ({ ...prev, description: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <View style={styles.inlineActions}>
          <Button title={editingLevelId ? 'Save Level' : 'Add Level'} onPress={handleSaveLevel} loading={actionLoading} />
          {editingLevelId ? (
            <Button title="Cancel" onPress={resetLevelDraft} variant="secondary" />
          ) : null}
        </View>
      </View>

      {levels.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.userName}>Level {item.level} - {item.title}</Text>
              <Text style={styles.userEmail}>{item.xpThreshold} XP threshold</Text>
            </View>
            <View style={[styles.statusBadge, item.active ? styles.activeBadge : styles.inactiveBadge]}>
              <Text style={styles.statusText}>{item.active ? 'ACTIVE' : 'INACTIVE'}</Text>
            </View>
          </View>
          {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
          <View style={styles.cardActions}>
            <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => handleEditLevel(item)}>
              <Text style={styles.actionBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDeleteLevel(item)}>
              <Text style={styles.actionBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  )

  const renderMetrics = () => (
    <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {!metrics ? (
        <Text style={styles.userEmail}>Metrics unavailable</Text>
      ) : (
        <View style={styles.card}>
          <Text style={styles.formTitle}>Engagement Metrics</Text>
          <Text style={styles.description}>Daily active users: {metrics.activeUsers1d ?? 'N/A'}</Text>
          <Text style={styles.description}>Weekly active users: {metrics.activeUsers7d ?? 'N/A'}</Text>
          <Text style={styles.description}>Monthly active users: {metrics.activeUsers30d ?? 'N/A'}</Text>
          <Text style={styles.description}>Avg XP per user: {metrics.avgXP ?? 'N/A'}</Text>
          <Text style={styles.description}>Active streak users: {metrics.usersWithStreak ?? 'N/A'}</Text>
        </View>
      )}
    </ScrollView>
  )

  const renderXPAdjust = () => (
    <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.formCardInScroll}>
        <Text style={styles.formTitle}>Manual XP Adjustment</Text>
        <RNTextInput
          style={styles.input}
          placeholder="User ID"
          value={adjUserId}
          onChangeText={setAdjUserId}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder="Delta XP (+/-)"
          keyboardType="numeric"
          value={String(adjDeltaXP)}
          onChangeText={(v) => setAdjDeltaXP(parseInt(v, 10) || 0)}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder="Reason"
          value={adjReason}
          onChangeText={setAdjReason}
          placeholderTextColor={COLORS.textLight}
        />
        <Button title="Adjust XP" onPress={handleAdjustXP} loading={actionLoading} />
      </View>

      <View style={styles.formCardInScroll}>
        <Text style={styles.formTitle}>XP Recalculation</Text>
        <View style={styles.roleSelector}>
          <TouchableOpacity
            style={[styles.roleOption, recalcMode === 'dry-run' && styles.roleOptionActive]}
            onPress={() => setRecalcMode('dry-run')}
          >
            <Text style={[styles.roleOptionText, recalcMode === 'dry-run' && styles.roleOptionTextActive]}>Dry Run</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleOption, recalcMode === 'execute' && styles.roleOptionActive]}
            onPress={() => setRecalcMode('execute')}
          >
            <Text style={[styles.roleOptionText, recalcMode === 'execute' && styles.roleOptionTextActive]}>Execute</Text>
          </TouchableOpacity>
        </View>
        <RNTextInput
          style={styles.input}
          placeholder="User ID (optional)"
          value={recalcUserId}
          onChangeText={setRecalcUserId}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder="Reason"
          value={recalcReason}
          onChangeText={setRecalcReason}
          placeholderTextColor={COLORS.textLight}
        />
        <Button title="Run Recalculation" onPress={handleRecalculate} loading={actionLoading} />

        {recalcResults ? (
          <View style={styles.mutedBox}>
            <Text style={styles.userEmail}>Mode: {String(recalcResults.mode ?? 'N/A')}</Text>
            <Text style={styles.userEmail}>Users: {String(recalcResults.totalUsers ?? 'N/A')}</Text>
          </View>
        ) : null}

        <RNTextInput
          style={styles.input}
          placeholder="Job ID"
          value={recalcJobIdInput}
          onChangeText={setRecalcJobIdInput}
          placeholderTextColor={COLORS.textLight}
        />
        <Button title="Check Job Status" onPress={handleCheckRecalcJob} loading={actionLoading} variant="secondary" />

        {recalcJobStatus ? (
          <View style={styles.mutedBox}>
            <Text style={styles.userEmail}>Status: {String(recalcJobStatus.status ?? 'unknown')}</Text>
            <Text style={styles.userEmail}>Processed: {String(recalcJobStatus.processed ?? 0)}</Text>
            <Text style={styles.userEmail}>Updated: {recalcJobStatus.updatedAt ? formatDate(recalcJobStatus.updatedAt) : 'N/A'}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  )

  const renderCampaigns = () => (
    <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={styles.formCardInScroll}>
        <Text style={styles.formTitle}>Create Campaign</Text>
        <RNTextInput
          style={styles.input}
          placeholder="Code"
          value={campaignDraft.code}
          onChangeText={(v) => setCampaignDraft((prev) => ({ ...prev, code: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder="Name"
          value={campaignDraft.name}
          onChangeText={(v) => setCampaignDraft((prev) => ({ ...prev, name: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <View style={styles.roleSelector}>
          {['PUSH', 'EMAIL', 'IN_APP'].map((channel) => (
            <TouchableOpacity
              key={channel}
              style={[styles.roleOption, campaignDraft.channel === channel && styles.roleOptionActive]}
              onPress={() => setCampaignDraft((prev) => ({ ...prev, channel }))}
            >
              <Text style={[styles.roleOptionText, campaignDraft.channel === channel && styles.roleOptionTextActive]}>{channel}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <RNTextInput
          style={styles.input}
          placeholder="Title"
          value={campaignDraft.title}
          onChangeText={(v) => setCampaignDraft((prev) => ({ ...prev, title: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder="Body"
          value={campaignDraft.body}
          onChangeText={(v) => setCampaignDraft((prev) => ({ ...prev, body: v }))}
          placeholderTextColor={COLORS.textLight}
        />
        <RNTextInput
          style={styles.input}
          placeholder="Minimum level"
          keyboardType="numeric"
          value={String(campaignDraft.minLevel)}
          onChangeText={(v) => setCampaignDraft((prev) => ({ ...prev, minLevel: parseInt(v, 10) || 1 }))}
          placeholderTextColor={COLORS.textLight}
        />
        <Button title="Create Campaign" onPress={handleCreateCampaign} loading={actionLoading} />
      </View>

      {campaigns.map((campaign) => (
        <View key={campaign.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.userName}>{campaign.name}</Text>
              <Text style={styles.userEmail}>{campaign.code} • {campaign.channel}</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{campaign.status}</Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            {campaign.status === 'DRAFT' ? (
              <TouchableOpacity style={[styles.actionBtn, styles.roleChangeBtn]} onPress={() => handleLaunchCampaign(campaign)}>
                <Text style={styles.actionBtnText}>Launch</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={[styles.actionBtn, styles.editBtn]} onPress={() => handleSendTestCampaign(campaign.id)}>
              <Text style={styles.actionBtnText}>Send Test</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDeleteCampaign(campaign)}>
              <Text style={styles.actionBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
          <RNTextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="Test User ID"
            value={campaignTestUserId}
            onChangeText={setCampaignTestUserId}
            placeholderTextColor={COLORS.textLight}
          />
        </View>
      ))}
    </ScrollView>
  )

  const renderAuditLogs = () => (
    <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {auditStats ? (
        <View style={styles.card}>
          <Text style={styles.formTitle}>Audit Stats</Text>
          <Text style={styles.description}>Total: {auditStats.total ?? 0}</Text>
          <Text style={styles.description}>XP adjustments: {auditStats.byAction['XP_ADJUSTMENT'] ?? 0}</Text>
          <Text style={styles.description}>Campaign launches: {auditStats.byAction['CAMPAIGN_LAUNCH'] ?? 0}</Text>
          <Text style={styles.description}>Abuse resolutions: {auditStats.byAction['ABUSE_RESOLVED'] ?? 0}</Text>
        </View>
      ) : null}

      {auditLogs.map((log, idx) => (
        <View key={log.id || idx} style={styles.card}>
          <Text style={styles.userName}>{log.action || 'Unknown Action'}</Text>
          <Text style={styles.userEmail}>{log.actorType || 'SYSTEM'} • {log.actorId || 'N/A'}</Text>
          <Text style={styles.description}>{log.resourceType || '-'} {log.resourceId ? `(${log.resourceId})` : ''}</Text>
          <Text style={styles.description}>{log.reason || 'No details'}</Text>
          <Text style={styles.userEmail}>{log.createdAt ? new Date(log.createdAt).toLocaleString('en-MY') : 'N/A'}</Text>
        </View>
      ))}
    </ScrollView>
  )

  const renderAbuseSignals = () => (
    <ScrollView contentContainerStyle={styles.listContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {abuseSignals.length === 0 ? (
        <Text style={styles.userEmail}>No open abuse signals</Text>
      ) : (
        abuseSignals.map((signal) => (
          <View key={signal.id} style={styles.card}>
            <Text style={styles.userName}>{signal.type || 'Signal'}</Text>
            <Text style={styles.userEmail}>User: {signal.userId || 'N/A'}</Text>
            <Text style={styles.description}>Risk: {signal.riskScore ?? 0}</Text>
            <Text style={styles.description}>{signal.summary || 'No details'}</Text>
            {!signal.resolved ? (
              <View style={styles.cardActions}>
                <TouchableOpacity style={[styles.actionBtn, styles.restoreBtn]} onPress={() => handleResolveAbuseSignal(signal)}>
                  <Text style={styles.actionBtnText}>Resolve</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={[styles.statusBadge, styles.activeBadge]}>
                <Text style={styles.statusText}>RESOLVED</Text>
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  )

  const renderEngagement = () => (
    <View style={{ flex: 1, width: '100%' }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.subTabBar, { width: '100%' }]}>
        <TouchableOpacity
          style={[styles.subTab, { flex: 0, paddingHorizontal: 12 }, engagementSubTab === 'xp-rules' && styles.subTabActive]}
          onPress={() => setEngagementSubTab('xp-rules')}
        >
          <Text style={[styles.subTabText, engagementSubTab === 'xp-rules' && styles.subTabTextActive]}>XP Rules</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, { flex: 0, paddingHorizontal: 12 }, engagementSubTab === 'levels' && styles.subTabActive]}
          onPress={() => setEngagementSubTab('levels')}
        >
          <Text style={[styles.subTabText, engagementSubTab === 'levels' && styles.subTabTextActive]}>Levels</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, { flex: 0, paddingHorizontal: 12 }, engagementSubTab === 'xp-adjust' && styles.subTabActive]}
          onPress={() => setEngagementSubTab('xp-adjust')}
        >
          <Text style={[styles.subTabText, engagementSubTab === 'xp-adjust' && styles.subTabTextActive]}>XP Ops</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, { flex: 0, paddingHorizontal: 12 }, engagementSubTab === 'campaigns' && styles.subTabActive]}
          onPress={() => setEngagementSubTab('campaigns')}
        >
          <Text style={[styles.subTabText, engagementSubTab === 'campaigns' && styles.subTabTextActive]}>Campaigns</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, { flex: 0, paddingHorizontal: 12 }, engagementSubTab === 'audit' && styles.subTabActive]}
          onPress={() => setEngagementSubTab('audit')}
        >
          <Text style={[styles.subTabText, engagementSubTab === 'audit' && styles.subTabTextActive]}>Audit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, { flex: 0, paddingHorizontal: 12 }, engagementSubTab === 'abuse' && styles.subTabActive]}
          onPress={() => setEngagementSubTab('abuse')}
        >
          <Text style={[styles.subTabText, engagementSubTab === 'abuse' && styles.subTabTextActive]}>Abuse</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, { flex: 0, paddingHorizontal: 12 }, engagementSubTab === 'metrics' && styles.subTabActive]}
          onPress={() => setEngagementSubTab('metrics')}
        >
          <Text style={[styles.subTabText, engagementSubTab === 'metrics' && styles.subTabTextActive]}>Metrics</Text>
        </TouchableOpacity>
      </ScrollView>

      {engagementSubTab === 'xp-rules'
        ? renderRules()
        : engagementSubTab === 'levels'
          ? renderLevels()
          : engagementSubTab === 'xp-adjust'
            ? renderXPAdjust()
            : engagementSubTab === 'campaigns'
              ? renderCampaigns()
              : engagementSubTab === 'audit'
                ? renderAuditLogs()
                : engagementSubTab === 'abuse'
                  ? renderAbuseSignals()
                  : renderMetrics()}
    </View>
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
    { key: 'engagement', label: 'Engagement' },
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
        {activeTab === 'engagement' && renderEngagement()}
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
    backgroundColor: COLORS.surface,
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
    fontSize: FONT.lg,
    fontWeight: '700',
    color: COLORS.text,
  },
  userEmail: {
    fontSize: FONT.sm,
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
    fontSize: FONT['2xs'],
    fontWeight: '700',
    color: COLORS.text,
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
    fontSize: FONT.sm,
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
  inviteResendBtn: {
    backgroundColor: '#dbeafe',
    borderColor: '#bfdbfe',
  },
  editBtn: {
    backgroundColor: '#e0f2fe',
    borderColor: '#bae6fd',
  },
  deletedBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deletedText: {
    fontSize: FONT['2xs'],
    fontWeight: '700',
    color: '#991b1b',
  },
  speciesName: {
    fontSize: FONT.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  speciesScientific: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  description: {
    fontSize: FONT['sm+'],
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  formCard: {
    margin: 16,
    marginBottom: 0,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 10,
  },
  formCardInScroll: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    gap: 10,
  },
  formTitle: {
    fontSize: FONT.md,
    fontWeight: '700',
    color: COLORS.text,
  },
  inlineActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  mutedBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    padding: 10,
    gap: 4,
  },
  fileName: {
    fontSize: FONT.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  fileMeta: {
    fontSize: FONT.sm,
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
    fontSize: FONT.base,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
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
    backgroundColor: COLORS.surface,
  },
  roleOptionActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#e0f2fe',
  },
  roleOptionText: {
    fontSize: FONT['sm+'],
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  roleOptionTextActive: {
    color: COLORS.primary,
  },
  inviteEmail: {
    fontSize: FONT.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  inviteMeta: {
    fontSize: FONT.sm,
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
  activeBadge: {
    backgroundColor: '#dcfce7',
  },
  inactiveBadge: {
    backgroundColor: '#f1f5f9',
  },
  statusText: {
    fontSize: FONT['2xs'],
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  tabBar: {
    backgroundColor: COLORS.surface,
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
    fontSize: FONT['sm+'],
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
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
    fontSize: FONT['sm+'],
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
    fontSize: FONT['sm+'],
    color: '#991b1b',
    textAlign: 'center',
  },
  successText: {
    color: '#166534',
  },
})
