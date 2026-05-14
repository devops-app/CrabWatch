import { Router } from 'express'
import {
  createUser,
  getUserProfile,
  updateUserProfile,
  listUsers,
  updateUserRole,
  softDeleteUser,
  restoreUser,
  blockUser,
  unblockUser,
} from '../controllers/userController'
import { authMiddleware, requireAuth, resolveUser, requireRole } from '../middleware/auth'
import { registerSchema, updateUserSchema, updateRoleSchema, blockUserSchema, restoreUserSchema } from '../utils/schemas'
import { validate } from '../middleware/validation'

const router: Router = Router()

router.use(authMiddleware)

/**
 * @openapi
 * /api/users/register:
 *   post:
 *     tags: [Users]
 *     summary: Register a new user
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, minLength: 1, maxLength: 100 }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               role: { type: string, enum: [USER, RESEARCHER, ADMIN] }
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/User' }
 *       400:
 *         description: Validation failed or user already exists
 */
router.post('/register', validate(registerSchema), createUser)

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get current user profile
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         observationCount: { type: integer }
 *       401:
 *         description: Authentication required
 */
router.get('/me', requireAuth, resolveUser, getUserProfile)

/**
 * @openapi
 * /api/users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Update current user profile
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, minLength: 1, maxLength: 100 }
 *               avatar: { type: string, format: url, nullable: true }
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Authentication required
 */
router.patch('/me', requireAuth, resolveUser, validate(updateUserSchema), updateUserProfile)

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (Admin/Researcher only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [USER, RESEARCHER, ADMIN] }
 *     responses:
 *       200:
 *         description: Paginated user list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     users: { type: array, items: { $ref: '#/components/schemas/User' } }
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 */
router.get('/', requireAuth, resolveUser, requireRole('ADMIN', 'RESEARCHER'), listUsers)

/**
 * @openapi
 * /api/users/{id}/role:
 *   patch:
 *     tags: [Users]
 *     summary: Update user role (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [USER, RESEARCHER, ADMIN] }
 *     responses:
 *       200:
 *         description: Role updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/User' }
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Admin only
 */
router.patch('/:id/role', requireAuth, resolveUser, requireRole('ADMIN'), validate(updateRoleSchema), updateUserRole)

/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Soft-delete a user (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User soft-deleted
 *       403:
 *         description: Admin only
 */
router.delete('/:id', requireAuth, resolveUser, requireRole('ADMIN'), softDeleteUser)

/**
 * @openapi
 * /api/users/{id}/restore:
 *   post:
 *     tags: [Users]
 *     summary: Restore a soft-deleted user (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User restored
 *       400:
 *         description: User not deleted or retention period exceeded
 *       403:
 *         description: Admin only
 */
router.post('/:id/restore', requireAuth, resolveUser, requireRole('ADMIN'), validate(restoreUserSchema), restoreUser)

/**
 * @openapi
 * /api/users/{id}/block:
 *   post:
 *     tags: [Users]
 *     summary: Block a user (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string, maxLength: 500 }
 *     responses:
 *       200:
 *         description: User blocked
 *       403:
 *         description: Admin only
 */
router.post('/:id/block', requireAuth, resolveUser, requireRole('ADMIN'), validate(blockUserSchema), blockUser)

/**
 * @openapi
 * /api/users/{id}/unblock:
 *   post:
 *     tags: [Users]
 *     summary: Unblock a user (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: User unblocked
 *       403:
 *         description: Admin only
 */
router.post('/:id/unblock', requireAuth, resolveUser, requireRole('ADMIN'), unblockUser)

export default router
