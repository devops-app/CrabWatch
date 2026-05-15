'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api'
import { SpeciesResponse, UserListResponse, UserResponse, BackupResult, BackupFileInfo, Invite, KeyFeature, DistributionZone } from '@crabwatch/shared'

type Tab = 'species' | 'users' | 'backup'
type UserSubTab = 'active' | 'deleted' | 'invites'

interface ConfirmState {
  open: boolean
  title: string
  message: string
  confirmText: string
  onConfirm: () => Promise<void> | void
  danger?: boolean
  inputPlaceholder?: string
  inputLabel?: string
  requiresInput?: boolean
  infoOnly?: boolean
}

export default function AdminPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<Tab>('species')
  const [userSubTab, setUserSubTab] = useState<UserSubTab>('active')
  const [species, setSpecies] = useState<SpeciesResponse[]>([])
  const [users, setUsers] = useState<UserListResponse | null>(null)
  const [deletedUsers, setDeletedUsers] = useState<any | null>(null)
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [backupLoading, setBackupLoading] = useState(false)
  const [lastBackup, setLastBackup] = useState<BackupResult | null>(null)
  const [backups, setBackups] = useState<BackupFileInfo[]>([])
  const [confirm, setConfirm] = useState<ConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmText: '',
    onConfirm: () => {},
  })
  const [confirmInput, setConfirmInput] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('researcher')
  const [sendingInvite, setSendingInvite] = useState(false)

  // Species form state
  const [speciesFormOpen, setSpeciesFormOpen] = useState(false)
  const [editingSpecies, setEditingSpecies] = useState<SpeciesResponse | null>(null)
  const [formScientificName, setFormScientificName] = useState('')
  const [formCommonName, setFormCommonName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formKeyFeatures, setFormKeyFeatures] = useState<KeyFeature[]>([])
  const [formImages, setFormImages] = useState<string[]>([])
  const [formDistributionZones, setFormDistributionZones] = useState<DistributionZone[]>([])
  const [formSaving, setFormSaving] = useState(false)

  const flash = (msg: string, type: 'error' | 'success') => {
    if (type === 'error') {
      setError(msg)
      setTimeout(() => setError(''), 5000)
    } else {
      setSuccess(msg)
      setTimeout(() => setSuccess(''), 5000)
    }
  }

  // Species CRUD handlers
  const openAddSpecies = () => {
    setEditingSpecies(null)
    setFormScientificName('')
    setFormCommonName('')
    setFormDescription('')
    setFormKeyFeatures([])
    setFormImages([])
    setFormDistributionZones([])
    setSpeciesFormOpen(true)
  }

  const openEditSpecies = (s: SpeciesResponse) => {
    setEditingSpecies(s)
    setFormScientificName(s.scientificName)
    setFormCommonName(s.commonName)
    setFormDescription(s.description)
    setFormKeyFeatures(s.keyFeatures || [])
    setFormImages(s.images || [])
    setFormDistributionZones(s.distributionZones || [])
    setSpeciesFormOpen(true)
  }

  const closeSpeciesForm = () => {
    setSpeciesFormOpen(false)
    setEditingSpecies(null)
  }

  const handleSaveSpecies = async () => {
    if (!formScientificName.trim() || !formCommonName.trim()) {
      flash('Scientific name and common name are required', 'error')
      return
    }
    setFormSaving(true)
    try {
      const body = {
        scientificName: formScientificName.trim(),
        commonName: formCommonName.trim(),
        description: formDescription.trim(),
        keyFeatures: formKeyFeatures,
        images: formImages,
        distributionZones: formDistributionZones,
      }
      if (editingSpecies) {
        await api.updateSpecies(editingSpecies.id, body)
        flash('Species updated', 'success')
      } else {
        await api.createSpecies(body)
        flash('Species created', 'success')
      }
      closeSpeciesForm()
      loadData()
    } catch (err: any) {
      flash(err.message || 'Failed to save species', 'error')
    } finally {
      setFormSaving(false)
    }
  }

  const handleDeleteSpecies = (s: SpeciesResponse) => {
    openConfirm({
      title: 'Delete Species',
      message: `Are you sure you want to delete "${s.scientificName}"? This will permanently remove it. Type "delete" to confirm.`,
      confirmText: 'Delete Species',
      danger: true,
      requiresInput: true,
      inputPlaceholder: 'Type "delete" to confirm',
      inputLabel: 'Confirmation',
      onConfirm: async () => { await api.deleteSpecies(s.id) },
    })
  }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      if (activeTab === 'species') {
        const data = await api.listSpecies()
        setSpecies(data)
      } else if (activeTab === 'users') {
        if (userSubTab === 'active') {
          const data = await api.listUsers()
          setUsers(data)
        } else if (userSubTab === 'deleted') {
          const data = await api.listDeletedUsers()
          setDeletedUsers(data)
        } else if (userSubTab === 'invites') {
          const data = await api.listInvites()
          setInvites(data)
        }
      } else if (activeTab === 'backup') {
        const result = await api.listBackups()
        setBackups(result)
      }
    } catch (err: any) {
      flash(err.message || 'Failed to load data', 'error')
    } finally {
      setLoading(false)
    }
  }, [activeTab, userSubTab])

  useEffect(() => {
    loadData()
  }, [activeTab, userSubTab, loadData])

  const openConfirm = (state: Omit<ConfirmState, 'open'>) => {
    setConfirm({ ...state, open: true })
    setConfirmInput('')
  }

  const closeConfirm = () => {
    setConfirm((prev) => ({ ...prev, open: false }))
    setConfirmInput('')
    setActionLoading(false)
  }

  const handleConfirm = async () => {
    if (confirm.requiresInput && !confirmInput.trim()) {
      return
    }
    if (confirm.infoOnly) {
      closeConfirm()
      return
    }
    setActionLoading(true)
    try {
      await confirm.onConfirm()
      setSuccess('Action completed successfully')
      loadData()
    } catch (err: any) {
      flash(err.message || 'Action failed', 'error')
    } finally {
      closeConfirm()
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.updateUserRole(userId, newRole)
      setSuccess('Role updated')
      loadData()
    } catch (err: any) {
      flash(err.message || 'Failed to update role', 'error')
    }
  }

  const handleBlock = (user: UserResponse) => {
    openConfirm({
      title: 'Block User',
      message: `Are you sure you want to block "${user.name}" (${user.email})? They will not be able to log in. Please type "block" to confirm.`,
      confirmText: 'Block User',
      danger: true,
      requiresInput: true,
      inputPlaceholder: 'Type "block" to confirm',
      inputLabel: 'Confirmation',
      onConfirm: async () => { await api.blockUser(user.id, confirmInput || undefined) },
    })
  }

  const handleUnblock = (user: UserResponse) => {
    openConfirm({
      title: 'Unblock User',
      message: `Are you sure you want to unblock "${user.name}" (${user.email})? They will be able to log in again.`,
      confirmText: 'Unblock User',
      onConfirm: async () => { await api.unblockUser(user.id) },
    })
  }

  const handleDelete = (user: UserResponse) => {
    openConfirm({
      title: 'Delete User',
      message: `Are you sure you want to delete "${user.name}" (${user.email})? This action requires double confirmation. Type "delete" to proceed.`,
      confirmText: 'Delete User',
      danger: true,
      requiresInput: true,
      inputPlaceholder: 'Type "delete" to confirm',
      inputLabel: 'Confirmation',
      onConfirm: async () => { await api.softDeleteUser(user.id) },
    })
  }

  const handleRestore = (user: any) => {
    openConfirm({
      title: 'Restore User',
      message: `Restore "${user.name}" (${user.email})? They will regain access to their account.`,
      confirmText: 'Restore User',
      onConfirm: async () => { await api.restoreUser(user.id) },
    })
  }

  const handleSendInvite = async (preEmail?: string, preRole?: string) => {
    const email = String(preEmail || inviteEmail || '').trim().toLowerCase()
    const role = (preRole || inviteRole).toUpperCase()
    if (!email) {
      flash('Email is required', 'error')
      return
    }

    const existing = invites.find(
      (i) => i.email.toLowerCase() === email && !i.used
    )
    if (existing && !preEmail) {
      const isExpired = new Date(existing.expiresAt) < new Date()
      if (!isExpired) {
        setConfirm({
          open: true,
          title: 'User Already Invited',
          message: `${email} already has a pending invite expiring on ${new Date(existing.expiresAt).toLocaleDateString()}. Use the Resend button in the table below to send a new invite.`,
          confirmText: 'Close',
          onConfirm: () => {},
          infoOnly: true,
        })
        return
      }
    }

    setSendingInvite(true)
    setError('')
    try {
      const result = await api.createInvite({ email, role })
      setSuccess(`Invite sent to ${result.email}. Link: ${result.inviteLink}`)
      if (!preEmail) setInviteEmail('')
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      flash(msg || 'Failed to send invite', 'error')
    } finally {
      setSendingInvite(false)
    }
  }

  const handleBackup = async () => {
    setBackupLoading(true)
    setError('')
    setSuccess('')
    try {
      const result = await api.backupDatabase()
      setLastBackup(result)
      setSuccess(`Backup created: ${result.fileName} (${formatSize(result.size)})`)
   const listResult = await api.listBackups()
        setBackups(listResult)
      } catch (err: any) {
      flash(err.message || 'Backup failed', 'error')
    } finally {
      setBackupLoading(false)
    }
  }

  const handleDeleteBackup = (backup: BackupFileInfo) => {
    openConfirm({
      title: 'Delete Backup',
      message: `Are you sure you want to delete "${backup.fileName}"? This action cannot be undone. Type "delete" to confirm.`,
      confirmText: 'Delete Backup',
      danger: true,
      requiresInput: true,
      inputPlaceholder: 'Type "delete" to confirm',
      inputLabel: 'Confirmation',
      onConfirm: async () => {
        await api.deleteBackup(backup.fileName)
        setSuccess(`Deleted: ${backup.fileName}`)
  const listResult = await api.listBackups()
        setBackups(listResult)
      },
    })
  }

  const handleDownloadBackup = (backup: BackupFileInfo) => {
    api.downloadBackup(backup.fileName)
  }

  const handleCleanup = () => {
    openConfirm({
      title: 'Cleanup Expired Users',
      message: 'Permanently delete all users that have exceeded the 30-day retention period? This action cannot be undone. Type "cleanup" to confirm.',
      confirmText: 'Cleanup Permanently',
      danger: true,
      requiresInput: true,
      inputPlaceholder: 'Type "cleanup" to confirm',
      inputLabel: 'Confirmation',
      onConfirm: async () => {
        const result = await api.cleanupDeletedUsers()
        setSuccess(`${result.deletedCount} user(s) permanently deleted`)
      },
    })
  }

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'species', label: 'Species Management' },
    { key: 'users', label: 'Users' },
    { key: 'backup', label: 'Database Backup' },
  ]

  return (
    <>
      <h1 className="text-3xl font-bold text-ocean-900 mb-8">Admin Panel</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="flex gap-2 mb-8 border-b flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'text-ocean-700 border-b-2 border-ocean-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card animate-pulse">
          <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded" />
            ))}
          </div>
        </div>
      ) : activeTab === 'species' ? (
    <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-ocean-800">Species Guide</h2>
              <button onClick={openAddSpecies} className="btn-primary text-sm">+ Add Species</button>
            </div>
            {species.length === 0 ? (
              <p className="text-gray-400 text-sm py-8 text-center">No species found. Add one to get started.</p>
            ) : (
              <div className="space-y-4">
                {species.map((s) => (
                  <div key={s.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-ocean-800 italic">{s.scientificName}</h3>
                        <p className="text-gray-600">{s.commonName}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => openEditSpecies(s)} className="text-sm text-ocean-600 hover:underline">Edit</button>
                        <button onClick={() => handleDeleteSpecies(s)} className="text-sm text-red-600 hover:underline">Delete</button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2">{s.description}</p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span>{s.keyFeatures.length} features</span>
                      <span>{s.images.length} images</span>
                      <span>{s.distributionZones.length} zones</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
      ) : activeTab === 'users' ? (
        <div className="card">
          <h2 className="text-xl font-semibold text-ocean-800 mb-4">Users</h2>
          <div className="flex gap-2 mb-6 border-b">
            {[
              { key: 'active' as const, label: 'Active' },
              { key: 'deleted' as const, label: 'Deleted' },
              { key: 'invites' as const, label: 'Invites' },
            ].map((sub) => (
              <button
                key={sub.key}
                onClick={() => setUserSubTab(sub.key)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  userSubTab === sub.key
                    ? 'text-ocean-700 border-b-2 border-ocean-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
          {userSubTab === 'active' && users && (
            <>
              <div className="text-sm text-gray-500 mb-4">Total users: {users.total}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-gray-500">Name</th>
                      <th className="text-left py-2 px-3 text-gray-500">Email</th>
                      <th className="text-left py-2 px-3 text-gray-500">Role</th>
                      <th className="text-left py-2 px-3 text-gray-500">Status</th>
                      <th className="text-left py-2 px-3 text-gray-500">Joined</th>
                      <th className="text-left py-2 px-3 text-gray-500">Role</th>
                      <th className="text-left py-2 px-3 text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.users.map((user) => (
                      <tr key={user.id} className="border-b">
                        <td className="py-2 px-3">{user.name}</td>
                        <td className="py-2 px-3 text-gray-500">{user.email}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 bg-ocean-100 text-ocean-800 rounded-full text-xs capitalize">
                            {user.role}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          {user.blockedAt ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs" title={user.blockReason || ''}>
                              Blocked
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                            className="text-sm border rounded px-2 py-1"
                          >
                            <option value="user">User</option>
                            <option value="researcher">Researcher</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex gap-2">
                            {user.blockedAt ? (
                              <button
                                onClick={() => handleUnblock(user)}
                                className="text-xs text-green-600 hover:underline"
                              >
                                Unblock
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBlock(user)}
                                className="text-xs text-orange-600 hover:underline"
                              >
                                Block
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(user)}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {userSubTab === 'deleted' && (
            <>
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-500">
                  Soft-deleted users are retained for 30 days before permanent deletion.
                </p>
                <button
                  onClick={handleCleanup}
                  className="text-sm bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 transition-colors"
                >
                  Cleanup Expired
                </button>
              </div>
              {deletedUsers && (
                <>
                  <div className="text-sm text-gray-500 mb-4">Deleted users: {deletedUsers.total}</div>
                  {deletedUsers.total === 0 ? (
                    <p className="text-gray-400 text-sm py-8 text-center">No deleted users</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-3 text-gray-500">Name</th>
                            <th className="text-left py-2 px-3 text-gray-500">Email</th>
                            <th className="text-left py-2 px-3 text-gray-500">Role</th>
                            <th className="text-left py-2 px-3 text-gray-500">Deleted At</th>
                            <th className="text-left py-2 px-3 text-gray-500">Expires</th>
                            <th className="text-left py-2 px-3 text-gray-500">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deletedUsers.users.map((user: any) => (
                            <tr key={user.id} className="border-b">
                              <td className="py-2 px-3">{user.name}</td>
                              <td className="py-2 px-3 text-gray-500">{user.email}</td>
                              <td className="py-2 px-3">
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs capitalize">
                                  {user.role}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-gray-500">
                                {new Date(user.deletedAt).toLocaleDateString()}
                              </td>
                              <td className="py-2 px-3 text-gray-500">
                                {new Date(user.expiresAt).toLocaleDateString()}
                              </td>
                              <td className="py-2 px-3">
                                <button
                                  onClick={() => handleRestore(user)}
                                  className="text-xs text-ocean-600 hover:underline"
                                >
                                  Restore
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {userSubTab === 'invites' && (
            <>
              <div className="mb-6 p-4 bg-ocean-50 rounded-lg">
                <h3 className="text-sm font-medium text-ocean-800 mb-3">Send New Invite</h3>
                <div className="flex gap-3">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="recipient@email.com"
                    className="input-field flex-1"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="input-field w-36"
                  >
                    <option value="researcher">Researcher</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={() => handleSendInvite()}
                    disabled={sendingInvite}
                    className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {sendingInvite ? 'Sending...' : 'Send Invite'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Invite expires in 7 days. Email will be sent via Resend (requires RESEND_API_KEY).
                </p>
              </div>

              {invites.length === 0 ? (
                <p className="text-gray-400 text-sm py-8 text-center">No invites sent yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 text-gray-500">Email</th>
                        <th className="text-left py-2 px-3 text-gray-500">Role</th>
                        <th className="text-left py-2 px-3 text-gray-500">Status</th>
                        <th className="text-left py-2 px-3 text-gray-500">Expires</th>
                        <th className="text-left py-2 px-3 text-gray-500">Created</th>
                        <th className="text-left py-2 px-3 text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invites.map((invite) => {
                        const isExpired = new Date(invite.expiresAt) < new Date()
                        return (
                          <tr key={invite.id} className="border-b">
                            <td className="py-2 px-3">{invite.email}</td>
                            <td className="py-2 px-3">
                              <span className="px-2 py-0.5 bg-ocean-100 text-ocean-800 rounded-full text-xs capitalize">
                                {invite.role}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {invite.used ? (
                                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">Used</span>
                              ) : isExpired ? (
                                <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">Expired</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">Pending</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-gray-500">
                              {new Date(invite.expiresAt).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-3 text-gray-500">
                              {new Date(invite.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-3">
                              <button
                                onClick={() => handleSendInvite(invite.email, invite.role)}
                                disabled={sendingInvite}
                                className="text-xs text-ocean-600 hover:text-ocean-800 underline disabled:opacity-50"
                              >
                                Resend
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="card">
          <h2 className="text-xl font-semibold text-ocean-800 mb-6">Database Backup</h2>

          <div className="mb-6">
            <button
              onClick={handleBackup}
              disabled={backupLoading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {backupLoading ? 'Creating Backup...' : 'Create Backup Now'}
            </button>
          </div>

          {backups.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">No backups yet. Create one to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-gray-500">File</th>
                    <th className="text-left py-2 px-3 text-gray-500">Size</th>
                    <th className="text-left py-2 px-3 text-gray-500">Created</th>
                    <th className="text-left py-2 px-3 text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map((backup) => (
                    <tr key={backup.fileName} className="border-b">
                      <td className="py-2 px-3 font-mono text-xs">{backup.fileName}</td>
                      <td className="py-2 px-3">{formatSize(backup.size)}</td>
                      <td className="py-2 px-3 text-gray-500">{new Date(backup.createdAt).toLocaleString()}</td>
                      <td className="py-2 px-3">
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleDownloadBackup(backup)}
                            className="text-xs text-ocean-600 hover:underline"
                          >
                            Download
                          </button>
                          <button
                            onClick={() => handleDeleteBackup(backup)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-6 text-sm text-gray-500">
            <p>Backups are stored as gzip-compressed JSON files on the server.</p>
            <p className="mt-1">Use the CLI command <code className="bg-gray-100 px-1 rounded">pnpm backup:db</code> for scheduled backups.</p>
          </div>
        </div>
      )}

      {confirm.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
            <h3 className={`text-lg font-semibold mb-3 ${confirm.danger ? 'text-red-700' : 'text-ocean-900'}`}>
              {confirm.title}
            </h3>
            <p className="text-sm text-gray-600 mb-4">{confirm.message}</p>

            {confirm.requiresInput && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">{confirm.inputLabel}</label>
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={confirm.inputPlaceholder}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    confirm.danger
                      ? 'focus:ring-red-400 border-red-300'
                      : 'focus:ring-ocean-400 border-gray-300'
                  }`}
                  autoFocus
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={closeConfirm}
                disabled={actionLoading}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={actionLoading || (confirm.requiresInput && !confirmInput.trim())}
                className={`px-4 py-2 text-sm text-white rounded-lg transition-colors disabled:opacity-50 ${
                  confirm.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-ocean-600 hover:bg-ocean-700'
                }`}
              >
                {actionLoading ? 'Processing...' : confirm.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {speciesFormOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-ocean-900 mb-4">
              {editingSpecies ? 'Edit Species' : 'Add Species'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scientific Name *</label>
                  <input
                    type="text"
                    value={formScientificName}
                    onChange={(e) => setFormScientificName(e.target.value)}
                    className="input-field"
                    placeholder="Scylla serrata"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Common Name *</label>
                  <input
                    type="text"
                    value={formCommonName}
                    onChange={(e) => setFormCommonName(e.target.value)}
                    className="input-field"
                    placeholder="Blue swimmer crab"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="input-field"
                  rows={3}
                  placeholder="Species description..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key Features (JSON array: <code className="text-xs">{'[{"trait":"Color","value":"Blue-green"}]'}</code>)
                </label>
                <textarea
                  value={JSON.stringify(formKeyFeatures, null, 2)}
                  onChange={(e) => {
                    try { setFormKeyFeatures(JSON.parse(e.target.value || '[]')) } catch { /* ignore invalid JSON */ }
                  }}
                  className="input-field font-mono text-xs"
                  rows={3}
                  placeholder='[{"trait":"Carapace","value":"Round"}]'
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URLs (one per line)
                </label>
                <textarea
                  value={formImages.join('\n')}
                  onChange={(e) => setFormImages(e.target.value.split('\n').filter(Boolean))}
                  className="input-field text-xs"
                  rows={2}
                  placeholder="https://example.com/image1.jpg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distribution Zones (JSON array: <code className="text-xs">{'[{"name":"Gulf of Thailand","polygon":[[100.5,6.5],[100.6,6.5]]}]'}</code>)
                </label>
                <textarea
                  value={JSON.stringify(formDistributionZones, null, 2)}
                  onChange={(e) => {
                    try { setFormDistributionZones(JSON.parse(e.target.value || '[]')) } catch { /* ignore invalid JSON */ }
                  }}
                  className="input-field font-mono text-xs"
                  rows={3}
                  placeholder='[{"name":"Zone","polygon":[[100,6],[101,6],[101,7],[100,7]]}]'
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeSpeciesForm}
                disabled={formSaving}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSpecies}
                disabled={formSaving}
                className="px-4 py-2 text-sm text-white bg-ocean-600 rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50"
              >
                {formSaving ? 'Saving...' : editingSpecies ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
