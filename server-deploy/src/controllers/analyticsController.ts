import { Response } from 'express'
import { AuthRequest } from '../middleware/auth'
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

export async function getDashboardStats(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const stats = await analyticsService.getDashboardStats()
    res.json({ success: true, data: stats })
  } catch (error: unknown) {
    console.error('Dashboard stats error:', error)
    res.status(500).json({ success: false, error: 'Failed to get dashboard stats' })
  }
}

export async function getSizeFrequency(req: AuthRequest, res: Response): Promise<void> {
  try {
    const speciesId = getQueryStr(req, 'speciesId')
    const gender = getQueryStr(req, 'gender')
    const pagination = getPagination(req)
    const data = await analyticsService.getSizeFrequency(speciesId, gender, pagination)
    res.json({ success: true, data })
  } catch (error: unknown) {
    console.error('Size frequency error:', error)
    res.status(500).json({ success: false, error: 'Failed to get size frequency' })
  }
}

export async function getGenderRatio(req: AuthRequest, res: Response): Promise<void> {
  try {
    const speciesId = getQueryStr(req, 'speciesId')
    const dateFrom = getQueryStr(req, 'dateFrom')
    const dateTo = getQueryStr(req, 'dateTo')
    const pagination = getPagination(req)
    const data = await analyticsService.getGenderRatio(speciesId, dateFrom, dateTo, pagination)
    res.json({ success: true, data })
  } catch (error: unknown) {
    console.error('Gender ratio error:', error)
    res.status(500).json({ success: false, error: 'Failed to get gender ratio' })
  }
}

export async function getConditionIndices(req: AuthRequest, res: Response): Promise<void> {
  try {
    const speciesId = getQueryStr(req, 'speciesId')
    const pagination = getPagination(req)
    const data = await analyticsService.getConditionIndices(speciesId, pagination)
    res.json({ success: true, data })
  } catch (error: unknown) {
    console.error('Condition indices error:', error)
    res.status(500).json({ success: false, error: 'Failed to get condition indices' })
  }
}

export async function getCW50(req: AuthRequest, res: Response): Promise<void> {
  try {
    const speciesId = getQueryStr(req, 'speciesId')
    const pagination = getPagination(req)
    const data = await analyticsService.getCW50(speciesId, pagination)
    res.json({ success: true, data })
  } catch (error: unknown) {
    console.error('CW50 error:', error)
    res.status(500).json({ success: false, error: 'Failed to get CW50' })
  }
}

export async function getSpeciesDistribution(req: AuthRequest, res: Response): Promise<void> {
  try {
    const dateFrom = getQueryStr(req, 'dateFrom')
    const dateTo = getQueryStr(req, 'dateTo')
    const data = await analyticsService.getSpeciesDistribution(dateFrom, dateTo)
    res.json({ success: true, data })
  } catch (error: unknown) {
    console.error('Species distribution error:', error)
    res.status(500).json({ success: false, error: 'Failed to get species distribution' })
  }
}

export async function getTemporalTrends(req: AuthRequest, res: Response): Promise<void> {
  try {
    const speciesId = getQueryStr(req, 'speciesId')
    const pagination = getPagination(req)
    const data = await analyticsService.getTemporalTrends(speciesId, pagination)
    res.json({ success: true, data })
  } catch (error: unknown) {
    console.error('Temporal trends error:', error)
    res.status(500).json({ success: false, error: 'Failed to get temporal trends' })
  }
}
