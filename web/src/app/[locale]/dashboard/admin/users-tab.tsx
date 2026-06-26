'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { api } from '@/lib/api'
import { logger } from '@/lib/logger'
import type { UserListResponse, UserResponse, Invite, DeletedUserListResponse, DeletedUserResponse } from '@crabwatch/shared'

type UserSubTab = 'active' | 'deleted' | 'invites'

interface ConfirmState {
  title: string
  message: string
  confirmText: string
  onConfirm: () => Promise<void> | void
  danger?: boolean
  inputPlaceholder?: string
  inputLabel?: string
  requiresInput?: boolean
}

interface UsersTabProps {
  flash: (msg: string, type: 'error' | 'success') => void
  onConfirm: (state: ConfirmState) => void
  onReload: () => void
}

const PAGE_SIZE = 15

export function UsersTab({ flash, onConfirm, onReload }: UsersTabProps): React.JSX.Element {
  const t = useTranslations('admin.users')
  const [userSubTab, setUserSubTab] = useState<UserSubTab>('active')
  const [users, setUsers] = useState<UserListResponse | null>(null)
  const [deletedUsers, setDeletedUsers] = useState<DeletedUserListResponse | null>(null)
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('researcher')
  const [sendingInvite, setSendingInvite] = useState(false)

  // Active users filters
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [activePage, setActivePage] = useState(1)

  // Deleted users pagination
  const [deletedPage, setDeletedPage] = useState(1)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (userSubTab === 'active') {
        const data = await api.listUsers({
          page: activePage,
          limit: PAGE_SIZE,
          search: searchQuery || undefined,
          role: roleFilter || undefined,
        })
        setUsers(data)
      } else if (userSubTab === 'deleted') {
        const data = await api.listDeletedUsers({ page: deletedPage, limit: PAGE_SIZE }) as DeletedUserListResponse
        setDeletedUsers(data)
      } else if (userSubTab === 'invites') {
        const data = await api.listInvites()
        setInvites(data)
      }
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : t('loadFailed'), 'error')
      logger.error('Users tab load failed', err)
    } finally {
      setLoading(false)
    }
  }, [userSubTab, activePage, deletedPage, searchQuery, roleFilter, flash, t])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setActivePage(1)
    loadData()
  }

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value)
    setActivePage(1)
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.updateUserRole(userId, newRole)
      flash(t('roleUpdated'), 'success')
      loadData()
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : t('roleUpdateFailed'), 'error')
    }
  }

  const handleBlock = (user: UserResponse) => {
    onConfirm({
      title: t('blockUser.title'),
      message: t('blockUser.message', { name: user.name, email: user.email }),
      confirmText: t('blockUser.confirmText'),
      danger: true,
      requiresInput: true,
      inputPlaceholder: t('blockUser.inputPlaceholder'),
      inputLabel: t('inputLabel') || 'Confirmation',
      onConfirm: async () => { await api.blockUser(user.id) },
    })
  }

  const handleUnblock = (user: UserResponse) => {
    onConfirm({
      title: t('unblockUser.title'),
      message: t('unblockUser.message', { name: user.name, email: user.email }),
      confirmText: t('unblockUser.confirmText'),
      onConfirm: async () => { await api.unblockUser(user.id) },
    })
  }

  const handleDelete = (user: UserResponse) => {
    onConfirm({
      title: t('deleteUser.title'),
      message: t('deleteUser.message', { name: user.name, email: user.email }),
      confirmText: t('deleteUser.confirmText'),
      danger: true,
      requiresInput: true,
      inputPlaceholder: t('deleteUser.inputPlaceholder'),
      inputLabel: t('inputLabel') || 'Confirmation',
      onConfirm: async () => { await api.softDeleteUser(user.id) },
    })
  }

  const handleRestore = (user: DeletedUserResponse) => {
    onConfirm({
      title: t('restoreUser.title'),
      message: t('restoreUser.message', { name: user.name, email: user.email }),
      confirmText: t('restoreUser.confirmText'),
      onConfirm: async () => { await api.restoreUser(user.id) },
    })
  }

  const handleCleanup = () => {
    onConfirm({
      title: t('cleanupExpired.title'),
      message: t('cleanupExpired.message'),
      confirmText: t('cleanupExpired.confirmText'),
      danger: true,
      requiresInput: true,
      inputPlaceholder: t('cleanupExpired.inputPlaceholder'),
      inputLabel: t('inputLabel') || 'Confirmation',
      onConfirm: async () => {
        const result = await api.cleanupDeletedUsers()
        flash(t('cleanupResult', { count: result.deletedCount }), 'success')
        loadData()
      },
    })
  }

  const handleSendInvite = async (preEmail?: string, preRole?: string) => {
    const email = String(preEmail || inviteEmail || '').trim().toLowerCase()
    const role = (preRole || inviteRole).toUpperCase()
    if (!email) {
      flash(t('emailRequired'), 'error')
      return
    }

    const existing = invites.find(
      (i) => i.email.toLowerCase() === email && !i.used
    )
    if (existing && !preEmail) {
      const isExpired = new Date(existing.expiresAt) < new Date()
      if (!isExpired) {
        onConfirm({
          title: t('invitesAlreadyTitle'),
          message: t('invitesAlreadyMessage', { email, date: new Date(existing.expiresAt).toLocaleDateString() }),
          confirmText: t('invitesClose'),
          onConfirm: () => {},
        })
        return
      }
    }

    setSendingInvite(true)
    try {
      const result = await api.createInvite({ email, role })
      flash(t('inviteSent', { email: result.email, link: result.inviteLink }), 'success')
      if (!preEmail) setInviteEmail('')
      loadData()
    } catch (err: unknown) {
      flash(err instanceof Error ? err.message : String(err) || 'Failed to send invite', 'error')
    } finally {
      setSendingInvite(false)
    }
  }

  if (loading) return <LoadingSkeleton />

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-ocean-800 mb-4">{t('title')}</h2>
      <div className="flex gap-2 mb-6 border-b">
        {[
          { key: 'active' as const, label: t('subTabs.active') },
          { key: 'deleted' as const, label: t('subTabs.deleted') },
          { key: 'invites' as const, label: t('subTabs.invites') },
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
      {userSubTab === 'active' && users && <ActiveUsers t={t} users={users} searchQuery={searchQuery} roleFilter={roleFilter} activePage={activePage} onRoleChange={handleRoleChange} onBlock={handleBlock} onUnblock={handleUnblock} onDelete={handleDelete} onSearch={handleSearch} onSearchChange={setSearchQuery} onRoleFilterChange={handleRoleFilterChange} onActivePageChange={setActivePage} />}
      {userSubTab === 'deleted' && <DeletedUsers t={t} deletedUsers={deletedUsers} deletedPage={deletedPage} onRestore={handleRestore} onCleanup={handleCleanup} onDeletedPageChange={setDeletedPage} />}
      {userSubTab === 'invites' && <Invites t={t} invites={invites} inviteEmail={inviteEmail} inviteRole={inviteRole} sendingInvite={sendingInvite} onEmailChange={setInviteEmail} onRoleChange={setInviteRole} onSend={handleSendInvite} />}
    </div>
  )
}

function ActiveUsers({
  t,
  users,
  searchQuery,
  roleFilter,
  activePage,
  onRoleChange,
  onBlock,
  onUnblock,
  onDelete,
  onSearch,
  onSearchChange,
  onRoleFilterChange,
  onActivePageChange,
}: {
  t: ReturnType<typeof useTranslations>
  users: UserListResponse
  searchQuery: string
  roleFilter: string
  activePage: number
  onRoleChange: (userId: string, newRole: string) => void
  onBlock: (user: UserResponse) => void
  onUnblock: (user: UserResponse) => void
  onDelete: (user: UserResponse) => void
  onSearch: (e: React.FormEvent) => void
  onSearchChange: (v: string) => void
  onRoleFilterChange: (v: string) => void
  onActivePageChange: (v: number) => void
}) {
  const totalPages = Math.ceil(users.total / PAGE_SIZE)

  return (
    <>
      <div className="text-sm text-gray-500 mb-4">{t('totalUsers', { count: users.total })}</div>
      <form onSubmit={onSearch} className="flex gap-3 mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('searchPlaceholder') || 'Search by name or email...'}
          className="input-field flex-1"
        />
        <select
          value={roleFilter}
          onChange={(e) => onRoleFilterChange(e.target.value)}
          className="input-field w-40"
        >
          <option value="">{t('roles.all') || 'All Roles'}</option>
          <option value="user">{t('roles.user')}</option>
          <option value="researcher">{t('roles.researcher')}</option>
          <option value="admin">{t('roles.admin')}</option>
        </select>
        <button type="submit" className="btn-primary text-sm">{t('search') || 'Search'}</button>
        {(searchQuery || roleFilter) && (
          <button type="button" onClick={() => { onSearchChange(''); onRoleFilterChange(''); onActivePageChange(1) }} className="text-sm text-gray-500 hover:text-gray-700">{t('clear') || 'Clear'}</button>
        )}
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3 text-gray-500">{t('name')}</th>
              <th className="text-left py-2 px-3 text-gray-500">{t('email')}</th>
              <th className="text-left py-2 px-3 text-gray-500">{t('role')}</th>
              <th className="text-left py-2 px-3 text-gray-500">{t('status')}</th>
              <th className="text-left py-2 px-3 text-gray-500">{t('joined')}</th>
              <th className="text-left py-2 px-3 text-gray-500">{t('role')}</th>
              <th className="text-left py-2 px-3 text-gray-500">{t('actions')}</th>
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
                      {t('blocked')}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                      {t('active')}
                    </span>
                  )}
                </td>
                <td className="py-2 px-3 text-gray-500">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="py-2 px-3">
                  <select
                    value={user.role}
                    onChange={(e) => onRoleChange(user.id, e.target.value)}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value="user">{t('roles.user')}</option>
                    <option value="researcher">{t('roles.researcher')}</option>
                    <option value="admin">{t('roles.admin')}</option>
                  </select>
                </td>
                <td className="py-2 px-3">
                  <div className="flex gap-2">
                    {user.blockedAt ? (
                      <button onClick={() => onUnblock(user)} className="text-xs text-green-600 hover:underline">{t('unblock')}</button>
                    ) : (
                      <button onClick={() => onBlock(user)} className="text-xs text-orange-600 hover:underline">{t('block')}</button>
                    )}
                    <button onClick={() => onDelete(user)} className="text-xs text-red-600 hover:underline">{t('delete')}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => onActivePageChange(activePage - 1)}
            disabled={activePage <= 1}
            className="text-sm px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('pagination.prev') || 'Previous'}
          </button>
          <span className="text-sm px-3 py-1">{t('pagination.page', { current: activePage, total: totalPages }) || `${activePage} / ${totalPages}`}</span>
          <button
            onClick={() => onActivePageChange(activePage + 1)}
            disabled={activePage >= totalPages}
            className="text-sm px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('pagination.next') || 'Next'}
          </button>
        </div>
      )}
    </>
  )
}

function DeletedUsers({
  t,
  deletedUsers,
  deletedPage,
  onRestore,
  onCleanup,
  onDeletedPageChange,
}: {
  t: ReturnType<typeof useTranslations>
  deletedUsers: DeletedUserListResponse | null
  deletedPage: number
  onRestore: (user: DeletedUserResponse) => void
  onCleanup: () => void
  onDeletedPageChange: (v: number) => void
}) {
  const deletedTotalPages = deletedUsers ? Math.ceil(deletedUsers.total / PAGE_SIZE) : 0
  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">
          {t('deletedRetentionNote')}
        </p>
        <button
          onClick={onCleanup}
          className="text-sm bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 transition-colors"
        >
          {t('deletedCleanupButton')}
        </button>
      </div>
      {deletedUsers && (
        <>
          <div className="text-sm text-gray-500 mb-4">{t('totalDeleted', { count: deletedUsers.total })}</div>
          {deletedUsers.total === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">{t('noDeleted')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-gray-500">{t('name')}</th>
                    <th className="text-left py-2 px-3 text-gray-500">{t('email')}</th>
                    <th className="text-left py-2 px-3 text-gray-500">{t('role')}</th>
                    <th className="text-left py-2 px-3 text-gray-500">{t('deletedAt')}</th>
                    <th className="text-left py-2 px-3 text-gray-500">{t('expires')}</th>
                    <th className="text-left py-2 px-3 text-gray-500">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedUsers.users.map((user) => (
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
                        <button onClick={() => onRestore(user)} className="text-xs text-ocean-600 hover:underline">
                          {t('restore')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {deletedTotalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                onClick={() => onDeletedPageChange(deletedPage - 1)}
                disabled={deletedPage <= 1}
                className="text-sm px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('pagination.prev') || 'Previous'}
              </button>
              <span className="text-sm px-3 py-1">{t('pagination.page', { current: deletedPage, total: deletedTotalPages }) || `${deletedPage} / ${deletedTotalPages}`}</span>
              <button
                onClick={() => onDeletedPageChange(deletedPage + 1)}
                disabled={deletedPage >= deletedTotalPages}
                className="text-sm px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('pagination.next') || 'Next'}
              </button>
            </div>
          )}
        </>
      )}
    </>
  )
}

function Invites({
  t,
  invites,
  inviteEmail,
  inviteRole,
  sendingInvite,
  onEmailChange,
  onRoleChange,
  onSend,
}: {
  t: ReturnType<typeof useTranslations>
  invites: Invite[]
  inviteEmail: string
  inviteRole: string
  sendingInvite: boolean
  onEmailChange: (v: string) => void
  onRoleChange: (v: string) => void
  onSend: (preEmail?: string, preRole?: string) => void
}) {
  return (
    <>
      <div className="mb-6 p-4 bg-ocean-50 rounded-lg">
        <h3 className="text-sm font-medium text-ocean-800 mb-3">{t('invitesSendNew')}</h3>
        <div className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder={t('invitesEmailPlaceholder')}
            className="input-field flex-1"
          />
          <select
            value={inviteRole}
            onChange={(e) => onRoleChange(e.target.value)}
            className="input-field w-36"
          >
            <option value="researcher">{t('roles.researcher')}</option>
            <option value="admin">{t('roles.admin')}</option>
          </select>
          <button
            onClick={() => onSend()}
            disabled={sendingInvite}
            className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {sendingInvite ? t('invitesSending') : t('invitesSendButton')}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {t('invitesExpiryNote')}
        </p>
      </div>

      {invites.length === 0 ? (
        <p className="text-gray-400 text-sm py-8 text-center">{t('invitesNone')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 text-gray-500">{t('email')}</th>
                <th className="text-left py-2 px-3 text-gray-500">{t('role')}</th>
                <th className="text-left py-2 px-3 text-gray-500">{t('status')}</th>
                <th className="text-left py-2 px-3 text-gray-500">{t('expires')}</th>
                <th className="text-left py-2 px-3 text-gray-500">{t('joined')}</th>
                <th className="text-left py-2 px-3 text-gray-500">{t('actions')}</th>
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
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">{t('used')}</span>
                      ) : isExpired ? (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs">{t('expired')}</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">{t('pending')}</span>
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
                        onClick={() => onSend(invite.email, invite.role)}
                        disabled={sendingInvite}
                        className="text-xs text-ocean-600 hover:text-ocean-800 underline disabled:opacity-50"
                      >
                        {t('resend')}
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
  )
}

function LoadingSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-4 w-40 bg-gray-200 rounded mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded" />
        ))}
      </div>
    </div>
  )
}
