import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/register', '/', '/landing', '/tour', '/demo', '/auth/callback', '/terms', '/privacy']

// Routes whose page code still ships but is retired from the product:
// removed from every menu and now also unreachable by direct URL. We
// redirect instead of deleting the folders so the (real) automations
// code can be revived later if wanted. ai-tools is a non-functional
// mockup — keeping it reachable would let a paying user stumble onto a
// fake feature, which is exactly the credibility risk we're avoiding.
const RETIRED_ROUTES = ['/ai-tools', '/plants', '/automations']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Hard-retire dead modules — bounce any direct-URL access back to the
  // dashboard before doing anything else.
  if (RETIRED_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Allow public routes, subscribe pages, and static/api paths
  if (
    PUBLIC_ROUTES.some(route => pathname === route) ||
    pathname.startsWith('/tour/') ||             // Marketing tour (read-only, no auth)
    pathname.startsWith('/admin/setup') ||        // One-time owner setup helper
    pathname.startsWith('/admin/setup/') ||
    pathname.startsWith('/subscribe') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/q/')   // Public quote share links
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

  // ── Subscription enforcement ───────────────────────────────────────────────
  // Master switch. Defaults OFF so a deploy never silently locks anyone out —
  // flip NEXT_PUBLIC_ENFORCE_SUBSCRIPTION=true in Vercel only once the owner
  // exemption + the subscriptions table are verified. While off, the app
  // behaves exactly like the old pilot mode.
  if (process.env.NEXT_PUBLIC_ENFORCE_SUBSCRIPTION !== 'true') {
    return response
  }

  // Safety net #1 — owner emails are NEVER gated, so the business owner can't
  // accidentally lock himself out of his own product. Comma-separated list in
  // NEXT_PUBLIC_OWNER_EMAILS.
  const exemptEmails = (process.env.NEXT_PUBLIC_OWNER_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (user.email && exemptEmails.includes(user.email.toLowerCase())) {
    return response
  }

  const now = Date.now()

  // Trial is derived from the account creation date — not from any DB row.
  // This is deliberate: a fresh user always has a reliable created_at, so
  // there's no "missing subscriptions row → wrongly blocked on day one" bug
  // (which is exactly what the old commented code would have caused).
  const TRIAL_DAYS = 7
  const createdAtMs = user.created_at ? new Date(user.created_at).getTime() : null
  const inTrial = createdAtMs !== null && now - createdAtMs < TRIAL_DAYS * 86400000

  // Paid access comes from the subscriptions table (written by the Meshulam
  // webhook on a successful charge). Safety net #2 — we FAIL OPEN on any query
  // error: a transient DB hiccup or a missing table must never lock out a
  // paying customer. Worst case while misconfigured = enforcement is simply
  // inert, never wrongful denial.
  let paidOrExempt = false
  try {
    const { data: sub, error } = await supabase
      .from('subscriptions')
      .select('status, current_period_end, is_exempt')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) return response
    if (sub) {
      paidOrExempt =
        sub.is_exempt === true ||
        (sub.status === 'active' &&
          !!sub.current_period_end &&
          new Date(sub.current_period_end).getTime() > now)
    }
  } catch {
    return response
  }

  if (paidOrExempt || inTrial) return response

  // Trial over and no active subscription → send to the paywall.
  return NextResponse.redirect(new URL('/subscribe', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
