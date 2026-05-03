import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/register', '/', '/landing', '/auth/callback']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes, subscribe pages, and static/api paths
  if (
    PUBLIC_ROUTES.some(route => pathname === route) ||
    pathname.startsWith('/subscribe') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api')
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in → redirect to login
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Check subscription status
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at, current_period_end, is_exempt')
    .eq('user_id', user.id)
    .single()

  const now = new Date()

  const hasAccess =
    sub &&
    (
      // Developer / friends & family — bypass all checks
      sub.is_exempt === true ||
      // Active trial
      (sub.status === 'trial' && new Date(sub.trial_ends_at) > now) ||
      // Paid subscription within period
      (sub.status === 'active' && sub.current_period_end && new Date(sub.current_period_end) > now)
    )

  if (!hasAccess) {
    return NextResponse.redirect(new URL('/subscribe', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
