import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
import { asyncHandler } from '../utils/errors'
import * as analyticsService from '../services/analytics'

function getQueryStr(req: import('express').Request, key: string): string | undefined {
  const val = req.query[key]
  return typeof val === 'string' ? val : undefined
}

function getPagination(req: import('express').Request) {
  const page = parseInt(getQueryStr(req, 'page') || '1')
  const limit = parseInt(getQueryStr(req, 'limit') || '20')
  return {
    page: isNaN(page) ? 1 : Math.min(Math.max(1, page), 100),
    limit: isNaN(limit) ? 20 : Math.min(Math.max(1, limit), 100),
  }
}

export const getDashboardStats = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const stats = await analyticsService.getDashboardStats()
  res.json({ success: true, data: stats })
})

export const getSizeFrequency = asyncHandler(async (req: AuthRequest, res: Response) => {
  const speciesId = getQueryStr(req, 'speciesId')
  const gender = getQueryStr(req, 'gender')
  const pagination = getPagination(req)
  const data = await analyticsService.getSizeFrequency(speciesId, gender, pagination)
  res.json({ success: true, data })
})

export const getGenderRatio = asyncHandler(async (req: AuthRequest, res: Response) => {
  const speciesId = getQueryStr(req, 'speciesId')
  const dateFrom = getQueryStr(req, 'dateFrom')
  const dateTo = getQueryStr(req, 'dateTo')
  const pagination = getPagination(req)
  const data = await analyticsService.getGenderRatio(speciesId, dateFrom, dateTo, pagination)
  res.json({ success: true, data })
})

export const getConditionIndices = asyncHandler(async (req: AuthRequest, res: Response) => {
  const speciesId = getQueryStr(req, 'speciesId')
  const pagination = getPagination(req)
  const data = await analyticsService.getConditionIndices(speciesId, pagination)
  res.json({ success: true, data })
})

export const getCW50 = asyncHandler(async (req: AuthRequest, res: Response) => {
  const speciesId = getQueryStr(req, 'speciesId')
  const pagination = getPagination(req)
  const data = await analyticsService.getCW50(speciesId, pagination)
  res.json({ success: true, data })
})

export const getSpeciesDistribution = asyncHandler(async (req: AuthRequest, res: Response) => {
  const dateFrom = getQueryStr(req, 'dateFrom')
  const dateTo = getQueryStr(req, 'dateTo')
  const data = await analyticsService.getSpeciesDistribution(dateFrom, dateTo)
  res.json({ success: true, data })
})

export const getTemporalTrends = asyncHandler(async (req: AuthRequest, res: Response) => {
  const speciesId = getQueryStr(req, 'speciesId')
  const pagination = getPagination(req)
  const data = await analyticsService.getTemporalTrends(speciesId, pagination)
  res.json({ success: true, data })
})
