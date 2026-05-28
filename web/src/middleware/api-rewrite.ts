import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL =
  process.env.BACKEND_URL || 'https://crabwatch-api.azurewebsites.net'

export function apiMiddleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const targetPath = req.nextUrl.pathname + req.nextUrl.search
    return NextResponse.rewrite(`${BACKEND_URL}${targetPath}`)
  }
  return null
}
