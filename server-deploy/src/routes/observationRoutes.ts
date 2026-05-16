import { Router } from 'express'
import {
  createObservation,
  listObservations,
  getObservation,
  validateObservation,
  getPendingObservations,
} from '../controllers/observationController'
import { authMiddleware, requireAuth, resolveUser, requireRole } from '../middleware/auth'
import { createObservationSchema, validateObservationSchema } from '../utils/schemas'
import { validate } from '../middleware/validation'

const router: Router = Router()

router.use(authMiddleware)

/**
 * @openapi
 * /api/observations:
 *   post:
 *     tags: [Observations]
 *     summary: Create a new crab observation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [speciesId, cw, bw, gender, maturationStatus, lat, lng, locationMethod]
 *             properties:
 *               speciesId: { type: string, format: uuid }
 *               cw: { type: number, description: 'Carapace Width (mm)', minimum: 0, maximum: 50 }
 *               bw: { type: number, description: 'Body Weight (g)', minimum: 0, maximum: 5000 }
 *               gender: { type: string, enum: [MALE, FEMALE, UNKNOWN] }
 *               maturationStatus: { type: string, enum: [MATURE, IMMATURE, UNKNOWN] }
 *               lat: { type: number, minimum: -90, maximum: 90 }
 *               lng: { type: number, minimum: -180, maximum: 180 }
 *               locationMethod: { type: string, enum: [GPS, MANUAL] }
 *               photos: { type: array, items: { type: string, format: url } }
 *               notes: { type: string, maxLength: 1000 }
 *     responses:
 *       201:
 *         description: Observation created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Observation' }
 *       400:
 *         description: Validation failed
 */
router.post('/', requireAuth, resolveUser, validate(createObservationSchema), createObservation)

/**
 * @openapi
 * /api/observations:
 *   get:
 *     tags: [Observations]
 *     summary: List observations (filtered by role)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: speciesId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [PENDING, APPROVED, REJECTED] }
 *     responses:
 *       200:
 *         description: Paginated observations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     observations: { type: array, items: { $ref: '#/components/schemas/Observation' } }
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     limit: { type: integer }
 */
router.get('/', requireAuth, resolveUser, listObservations)

/**
 * @openapi
 * /api/observations/pending:
 *   get:
 *     tags: [Observations]
 *     summary: List pending observations (Researcher/Admin only)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: speciesId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Paginated pending observations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     observations: { type: array, items: { $ref: '#/components/schemas/Observation' } }
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     limit: { type: integer }
 *       403:
 *         description: Researcher/Admin only
 */
router.get('/pending', requireAuth, resolveUser, requireRole('RESEARCHER', 'ADMIN'), getPendingObservations)

/**
 * @openapi
 * /api/observations/{id}:
 *   get:
 *     tags: [Observations]
 *     summary: Get observation by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Observation details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Observation' }
 *       404:
 *         description: Observation not found
 */
router.get('/:id', requireAuth, resolveUser, getObservation)

/**
 * @openapi
 * /api/observations/{id}/validate:
 *   patch:
 *     tags: [Observations]
 *     summary: Validate or reject an observation (Researcher/Admin only)
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
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [APPROVED, REJECTED] }
 *               rejectionReason: { type: string, maxLength: 500 }
 *     responses:
 *       200:
 *         description: Observation validated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Observation' }
 *       403:
 *         description: Researcher/Admin only
 */
router.patch('/:id/validate', requireAuth, resolveUser, requireRole('RESEARCHER', 'ADMIN'), validate(validateObservationSchema), validateObservation)

export default router
