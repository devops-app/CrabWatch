import React from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import type { TOptions } from 'i18next'
import { type GateMode } from '@crabwatch/shared'
import { COLORS } from '../../utils/constants'
import { FONT } from '../../utils/fonts'

export type QualityStatus = 'pass' | 'warn' | 'fail'

export interface MobileQualityAssessment {
  blurScore: number
  brightness: number
  brightnessLevel: 'dark' | 'low' | 'good' | 'bright'
  blurStatus: QualityStatus
  brightnessStatus: QualityStatus
  overallStatus: QualityStatus
  issues: string[]
}

export interface QualityOverrideState {
  approved: boolean
  reason: string
}

interface QualityGateCardProps {
  t: (key: string, options?: TOptions) => string
  assessment?: MobileQualityAssessment
  override: QualityOverrideState
  onReasonChange: (value: string) => void
  onApproveOverride: () => void
  onClearOverride: () => void
  onRetake: () => void
  allowOverride?: boolean
}

function statusColor(status: QualityStatus): string {
  if (status === 'pass') return '#16a34a'
  if (status === 'warn') return '#d97706'
  return '#dc2626'
}

export function QualityGateCard({
  t,
  assessment,
  override,
  onReasonChange,
  onApproveOverride,
  onClearOverride,
  onRetake,
  allowOverride = true,
}: QualityGateCardProps) {
  if (!assessment) return null

  const overallColor = statusColor(assessment.overallStatus)

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('quality.title')}</Text>
        <View style={[styles.statusPill, { backgroundColor: `${overallColor}22`, borderColor: overallColor }]}>
          <Text style={[styles.statusText, { color: overallColor }]}>{t(`quality.status.${assessment.overallStatus}`)}</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>{t('quality.blur')}</Text>
          <Text style={styles.metricValue}>{Math.round(assessment.blurScore)}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>{t('quality.brightness')}</Text>
          <Text style={styles.metricValue}>{Math.round(assessment.brightness * 100)}%</Text>
        </View>
      </View>

      {(assessment.overallStatus === 'fail' || assessment.overallStatus === 'warn') ? (
        <>
          <Text style={[styles.failHint, assessment.overallStatus === 'warn' && { color: '#b45309' }]}>
            {assessment.overallStatus === 'fail' ? t('quality.failHint') : t('quality.warnHint')}
          </Text>
          <TextInput
            value={override.reason}
            onChangeText={onReasonChange}
            placeholder={t('quality.reasonPlaceholder')}
            style={styles.reasonInput}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
            accessibilityLabel={t('quality.reasonA11y')}
          />
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.retakeBtn} onPress={onRetake} accessibilityRole="button">
              <Ionicons name="refresh" size={16} color="#ffffff" />
              <Text style={styles.actionText}>{t('quality.retake')}</Text>
            </TouchableOpacity>
            {allowOverride && (!override.approved ? (
              <TouchableOpacity style={styles.overrideBtn} onPress={onApproveOverride} accessibilityRole="button">
                <Ionicons name="warning" size={16} color="#ffffff" />
                <Text style={styles.actionText}>{t('quality.submitAnyway')}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.clearBtn} onPress={onClearOverride} accessibilityRole="button">
                <Text style={styles.clearText}>{t('quality.clearOverride')}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: FONT.base,
    fontWeight: '600',
    color: COLORS.text,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: FONT.sm,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricLabel: {
    fontSize: FONT.sm,
    color: COLORS.textSecondary,
  },
  metricValue: {
    fontSize: FONT.base,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 2,
  },
  failHint: {
    marginTop: 10,
    fontSize: FONT['sm+'],
    color: '#b91c1c',
    fontWeight: '600',
  },
  reasonInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 62,
    fontSize: FONT['sm+'],
    color: COLORS.text,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  retakeBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 10,
    backgroundColor: '#334155',
  },
  overrideBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingVertical: 10,
    backgroundColor: '#b45309',
  },
  clearBtn: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
  },
  clearText: {
    color: COLORS.text,
    fontSize: FONT['sm+'],
    fontWeight: '600',
  },
  actionText: {
    color: '#ffffff',
    fontSize: FONT['sm+'],
    fontWeight: '600',
  },
})
