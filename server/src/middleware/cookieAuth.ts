import { Response } from 'express'

const COOKIE_NAME = 'auth_token'

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  })
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    path: '/',
  })
}

export function getAuthCookie(req: { cookies: Record<string, string> }): string | undefined {
  return req.cookies[COOKIE_NAME]
}
