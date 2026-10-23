import { StyleSheet } from 'react-native'
import { COLORS } from '../../../utils/constants'
import { FONT } from '../../../utils/fonts'

export const styles = StyleSheet.create({
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
  searchBtn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
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
