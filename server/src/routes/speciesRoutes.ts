import { Router } from 'express'
import {
  listSpecies,
  getSpecies,
  createSpecies,
  updateSpecies,
  deleteSpecies,
  translateSpecies,
} from '../controllers/speciesController'
import { authMiddleware, requireAuth, resolveUser, requireRole } from '../middleware/auth'
import { createSpeciesSchema, updateSpeciesSchema } from '../utils/schemas'
import { validate } from '../middleware/validation'

const router: Router = Router()

router.use(authMiddleware)

/**
 * @openapi
 * /api/species:
 *   get:
 *     tags: [Species]
 *     summary: List all crab species
 *     security: []
 *     responses:
 *       200:
 *         description: List of species
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { $ref: '#/components/schemas/Species' } }
 */
router.get('/', listSpecies)

/**
 * @openapi
 * /api/species/{id}:
 *   get:
 *     tags: [Species]
 *     summary: Get species by ID
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Species details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Species' }
 *       404:
 *         description: Species not found
 */
router.get('/:id/translate', translateSpecies)

/**
 * @openapi
 * /api/species/{id}/translate:
 *   get:
 *     tags: [Species]
 *     summary: Translate species common name and description
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: to
 *         schema: { type: string, enum: [ms, en] }
 *         description: Target locale
 *     responses:
 *       200:
 *         description: Translated species text
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     commonName: { type: string }
 *                     description: { type: string }
 */

router.get('/:id', getSpecies)

/**
 * @openapi
 * /api/species:
 *   post:
 *     tags: [Species]
 *     summary: Create a new species (Admin only)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [scientificName, commonName, description]
 *             properties:
 *               scientificName: { type: string }
 *               commonName: { type: string }
 *               description: { type: string }
 *               keyFeatures:
 *                 type: array
 *                 items: { type: object, properties: { trait: { type: string }, value: { type: string } } }
 *               images: { type: array, items: { type: string, format: url } }
 *               distributionZones:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name: { type: string }
 *                     polygon: { type: array, items: { type: array, items: { type: number } } }
 *     responses:
 *       201:
 *         description: Species created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Species' }
 *       400:
 *         description: Validation failed
 *       403:
 *         description: Admin only
 */
router.post('/', requireAuth, resolveUser, requireRole('ADMIN'), validate(createSpeciesSchema), createSpecies)

/**
 * @openapi
 * /api/species/{id}:
 *   patch:
 *     tags: [Species]
 *     summary: Update species (Admin only)
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
 *               scientificName: { type: string }
 *               commonName: { type: string }
 *               description: { type: string }
 *               keyFeatures: { type: array }
 *               images: { type: array }
 *               distributionZones: { type: array }
 *     responses:
 *       200:
 *         description: Species updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { $ref: '#/components/schemas/Species' }
 *       403:
 *         description: Admin only
 */
router.patch('/:id', requireAuth, resolveUser, requireRole('ADMIN'), validate(updateSpeciesSchema), updateSpecies)

/**
 * @openapi
 * /api/species/{id}:
 *   delete:
 *     tags: [Species]
 *     summary: Delete species (Admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Species deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { nullable: true }
 *       403:
 *         description: Admin only
 */
router.delete('/:id', requireAuth, resolveUser, requireRole('ADMIN'), deleteSpecies)

export default router
