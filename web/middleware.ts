import { NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './src/i18n/routing'

const intlMiddleware = createMiddleware(routing)

export default function middleware(req) {
  // Explicitly redirect root to default locale
  if (req.nextUrl.pathname === '/') {
    return NextResponse.redirect(
      new URL(`/${routing.defaultLocale}`, req.url)
    )
  }
  return intlMiddleware(req)
}

export const config = {
  matcher: [
    '/',
    '/(auth|dashboard|public)/:path*',
    '/((?!api|_next|_vercel|favicon.ico|static).*)',
  ],
}
