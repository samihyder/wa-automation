import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { withBasePath } from '@/lib/base-path'
import { getSupabaseCookieOptions } from '@/lib/supabase/cookie-options'

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
} as const

function withNoStore<T extends NextResponse>(response: T): T {
  for (const [key, value] of Object.entries(NO_STORE_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

const AUTH_PATHS = new Set(['/login', '/signup', '/forgot-password', '/reset-password'])
const PROTECTED_PATHS = [
  '/dashboard',
  '/inbox',
  '/contacts',
  '/pipelines',
  '/broadcasts',
  '/automations',
  '/settings',
]

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: getSupabaseCookieOptions(),
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // getUser() transparently refreshes an expired access token, which
  // ROTATES the refresh token and writes the new cookies onto
  // `supabaseResponse` via setAll() above. Any response we return in
  // place of `supabaseResponse` (every redirect / JSON branch below)
  // is a fresh object that does NOT carry those Set-Cookie headers, so
  // the rotated token never reaches the browser. The next request then
  // replays the old, now-consumed refresh token, the refresh fails, and
  // the session wedges — the user gets a broken reload after idling and
  // can only recover by manually clearing cookies (issue #288). Copy the
  // refreshed cookies onto whatever response we hand back to fix that.
  const withRefreshedCookies = <T extends NextResponse>(response: T): T => {
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie)
    })
    return withNoStore(response)
  }

  const pathname = request.nextUrl.pathname
  const isAuthPage = AUTH_PATHS.has(pathname) || pathname.startsWith('/join/')
  const isProtectedPage = PROTECTED_PATHS.some((path) => pathname.startsWith(path))
  const isSessionAware =
    isAuthPage ||
    isProtectedPage ||
    pathname.startsWith('/flows') ||
    pathname.startsWith('/broadcasts') ||
    pathname.startsWith('/auth/')

  // Auth pages - redirect to dashboard if already logged in.
  // Exception: when an invite token is in the query string we
  // send the already-signed-in user to /join/<token> instead so
  // they can accept the invitation in one click. Without this,
  // a forwarded invite link to someone who's already signed in
  // would silently drop them on /dashboard.
  if (user && (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password'
  )) {
    const inviteToken = request.nextUrl.searchParams.get('invite')
    if (
      inviteToken &&
      (pathname === '/login' ||
        pathname === '/signup')
    ) {
      return withRefreshedCookies(
        NextResponse.redirect(
          new URL(
            withBasePath(`/join/${encodeURIComponent(inviteToken)}`),
            request.url,
          ),
        ),
      )
    }
    return withRefreshedCookies(
      NextResponse.redirect(new URL(withBasePath('/dashboard'), request.url)),
    )
  }

  // Protected pages - redirect to login if not authenticated
  if (!user && PROTECTED_PATHS.some((path) => pathname.startsWith(path))) {
    return withRefreshedCookies(
      NextResponse.redirect(new URL(withBasePath('/login'), request.url)),
    )
  }

  // API routes that need auth (not webhooks)
  if (!user && request.nextUrl.pathname.startsWith('/api/whatsapp/') &&
      !request.nextUrl.pathname.includes('/webhook')) {
    return withRefreshedCookies(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )
  }

  if (isSessionAware) {
    return withNoStore(supabaseResponse)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
