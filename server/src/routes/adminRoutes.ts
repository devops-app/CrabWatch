import { Router } from 'express'
import {
  backupDatabase,
  cleanupDeletedUsers,
  listDeletedUsers,
  listBackups,
  deleteBackup,
  downloadBackup,
} from '../controllers/adminController'
import { createInvite, listInvites, validateInvite } from '../controllers/inviteController'
import * as translationCtrl from '../controllers/translationController'
import { authMiddleware, requireAuth, resolveUser, requireRole } from '../middleware/auth'
import { createInviteSchema, validateInviteSchema, createTranslationSchema, updateTranslationSchema, bulkCreateTranslationSchema } from '../utils/schemas'
import { validate } from '../middleware/validation'

const router: Router = Router()

/** Public — validate invite token (no auth required, used by registration page) */
router.post('/invite/validate', validate(validateInviteSchema), validateInvite)

router.use(authMiddleware)

/**
 * @openapi
 * /api/admin/backup:
 *   post:
 *     tags: [Admin]
 *     summary: Trigger manual database backup (Admin only)
 *     responses:
 *       200:
 *         description: Backup completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     fileName: { type: string }
 *                     filePath: { type: string }
 *                     size: { type: integer }
 *                     timestamp: { type: string, format: date-time }
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin only
 *       500:
 *         description: Backup failed
 */
router.post('/backup', requireAuth, resolveUser, requireRole('ADMIN'), backupDatabase)

/**
 * @openapi
 * /api/admin/backups:
 *   get:
 *     tags: [Admin]
 *     summary: List all backup files (Admin only)
 *     responses:
 *       200:
 *         description: List of backup files
 */
router.get('/backups', requireAuth, resolveUser, requireRole('ADMIN'), listBackups)

/**
 * @openapi
 * /api/admin/backups/{fileName}/download:
 *   get:
 *     tags: [Admin]
 *     summary: Download a backup file (Admin only)
 *     parameters:
 *       - in: path
 *         name: fileName
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Backup file download
 *       404:
 *         description: File not found
 */
router.get('/backups/:fileName/download', requireAuth, resolveUser, requireRole('ADMIN'), downloadBackup)

/**
 * @openapi
 * /api/admin/backups/{fileName}:
 *   delete:
 *     tags: [Admin]
 *     summary: Delete a backup file (Admin only)
 *     parameters:
 *       - in: path
 *         name: fileName
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Backup file deleted
 *       404:
 *         description: File not found
 */
router.delete('/backups/:fileName', requireAuth, resolveUser, requireRole('ADMIN'), deleteBackup)

/**
 * @openapi
 * /api/admin/cleanup-users:
 *   post:
 *     tags: [Admin]
 *     summary: Permanently delete users past retention period (Admin only)
 *     responses:
 *       200:
 *         description: Cleanup completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedCount: { type: integer }
 *                     users: { type: array, items: { type: object } }
 *                     retentionDays: { type: integer }
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin only
 */
router.post('/cleanup-users', requireAuth, resolveUser, requireRole('ADMIN'), cleanupDeletedUsers)

/**
 * @openapi
 * /api/admin/deleted-users:
 *   get:
 *     tags: [Admin]
 *     summary: List soft-deleted users (Admin only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Paginated deleted user list
 */
router.get('/deleted-users', requireAuth, resolveUser, requireRole('ADMIN'), listDeletedUsers)

/**
 * @openapi
 * /api/admin/invite:
 *   post:
 *     tags: [Admin]
 *     summary: Create an invite for a new user (Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string }
 *               role: { type: string, enum: [RESEARCHER, ADMIN] }
 *               expiresInHours: { type: integer, default: 168 }
 *     responses:
 *       201:
 *         description: Invite created
 */
router.post('/invite', requireAuth, resolveUser, requireRole('ADMIN'), validate(createInviteSchema), createInvite)

/**
 * @openapi
 * /api/admin/invites:
 *   get:
 *     tags: [Admin]
 *     summary: List all invites (Admin only)
 *     responses:
 *       200:
 *         description: List of invites
 */
router.get('/invites', requireAuth, resolveUser, requireRole('ADMIN'), listInvites)

// Translation CRUD
router.get('/translations/models', requireAuth, resolveUser, requireRole('ADMIN'), translationCtrl.getTranslatableModels)
router.get('/translations', requireAuth, resolveUser, requireRole('ADMIN'), translationCtrl.listTranslations)
router.get('/translations/:id', requireAuth, resolveUser, requireRole('ADMIN'), translationCtrl.getTranslationById)
router.post('/translations', requireAuth, resolveUser, requireRole('ADMIN'), validate(createTranslationSchema), translationCtrl.createTranslation)
router.post('/translations/bulk', requireAuth, resolveUser, requireRole('ADMIN'), validate(bulkCreateTranslationSchema), translationCtrl.bulkCreateTranslations)
router.post('/translations/upsert', requireAuth, resolveUser, requireRole('ADMIN'), validate(createTranslationSchema), translationCtrl.upsertTranslation)
router.patch('/translations/:id', requireAuth, resolveUser, requireRole('ADMIN'), validate(updateTranslationSchema), translationCtrl.updateTranslation)
router.delete('/translations/:id', requireAuth, resolveUser, requireRole('ADMIN'), translationCtrl.deleteTranslation)

export default router
