import { Router } from 'express'
import {
  getDashboardStats,
  getSizeFrequency,
  getGenderRatio,
  getConditionIndices,
  getCW50,
  getSpeciesDistribution,
  getTemporalTrends,
} from '../controllers/analyticsController'
import { authMiddleware, requireAuth, resolveUser, requireRole } from '../middleware/auth'

const router: Router = Router()

router.use(authMiddleware)
router.use(requireAuth)
router.use(resolveUser)

/**
 * @openapi
 * /api/analytics/stats:
 *   get:
 *     tags: [Analytics]
 *     summary: Get dashboard statistics
 *     description: Returns aggregated statistics for the dashboard (Researcher/Admin only)
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalObservations: { type: integer }
 *                     totalSpecies: { type: integer }
 *                     pendingObservations: { type: integer }
 *                     recentObservations: { type: integer }
 *       403:
 *         description: Researcher/Admin only
 */
router.get('/stats', getDashboardStats)

/**
 * @openapi
 * /api/analytics/size-frequency:
 *   get:
 *     tags: [Analytics]
 *     summary: Get carapace width frequency distribution
 *     parameters:
 *       - in: query
 *         name: speciesId
 *         schema: { type: string, format: uuid }
 *       - in: query
*         name: gender
  *         schema: { type: string, enum: [MALE, FEMALE] }
 *     responses:
 *       200:
 *         description: Size frequency data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *       403:
 *         description: Researcher/Admin only
 */
router.get('/size-frequency', getSizeFrequency)

/**
 * @openapi
 * /api/analytics/gender-ratio:
 *   get:
 *     tags: [Analytics]
 *     summary: Get gender ratio analysis
 *     parameters:
 *       - in: query
 *         name: speciesId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Gender ratio data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 *       403:
 *         description: Researcher/Admin only
 */
router.get('/gender-ratio', getGenderRatio)

/**
 * @openapi
 * /api/analytics/condition-indices:
 *   get:
 *     tags: [Analytics]
 *     summary: Get condition indices by species
 *     parameters:
 *       - in: query
 *         name: speciesId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Condition indices data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *       403:
 *         description: Researcher/Admin only
 */
router.get('/condition-indices', getConditionIndices)

/**
 * @openapi
 * /api/analytics/cw50:
 *   get:
 *     tags: [Analytics]
 *     summary: Get CW50 (carapace width at 50% maturity)
 *     parameters:
 *       - in: query
 *         name: speciesId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: CW50 data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: object }
 *       403:
 *         description: Researcher/Admin only
 */
router.get('/cw50', getCW50)

/**
 * @openapi
 * /api/analytics/temporal-trends:
 *   get:
 *     tags: [Analytics]
 *     summary: Get temporal observation trends
 *     parameters:
 *       - in: query
 *         name: speciesId
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Temporal trends data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 *       403:
 *         description: Researcher/Admin only
 */
router.get('/temporal-trends', getTemporalTrends)

/**
 * @openapi
 * /api/analytics/species-distribution:
 *   get:
 *     tags: [Analytics]
 *     summary: Get observation count per species
 *     parameters:
 *       - in: query
 *         name: dateFrom
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dateTo
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Species distribution data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data: { type: array, items: { type: object } }
 */
router.get('/species-distribution', getSpeciesDistribution)

export default router
