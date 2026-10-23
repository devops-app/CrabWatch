import React, { useState, useCallback } from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useTranslation } from 'react-i18next'
import { UsersTab } from './tabs/UsersTab'
import { SpeciesTab } from './tabs/SpeciesTab'
import { BackupTab } from './tabs/BackupTab'
import { EngagementTab } from './tabs/EngagementTab'
import { styles } from './tabs/styles'

type Tab = 'users' | 'species' | 'backup' | 'engagement'

export function AdminScreen() {
  const { t } = useTranslation('admin')
  const [activeTab, setActiveTab] = useState<Tab>('users')
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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'users', label: t('tab.users') },
    { key: 'species', label: t('tab.species') },
    { key: 'backup', label: t('tab.backup') },
    { key: 'engagement', label: t('tab.engagement') },
  ]

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
        {activeTab === 'users' && <UsersTab flash={flash} />}
        {activeTab === 'species' && <SpeciesTab flash={flash} />}
        {activeTab === 'backup' && <BackupTab flash={flash} />}
        {activeTab === 'engagement' && <EngagementTab flash={flash} />}
      </View>
    </View>
  )
}
