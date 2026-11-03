import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';
import { appUrl } from '@/lib/app-url';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

const IP_LIMIT = { name: 'reset-req-ip', max: 15, windowSeconds: 900 };
const EMAIL_LIMIT = { name: 'reset-req-email', max: 5, windowSeconds: 900 };

// Generic response: never reveal whether an email is registered.
const GENERIC = { ok: true, message: 'If an account exists for that email, a reset link has been sent.' };

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

/**
 * Start a password reset using Supabase Auth's built-in recovery flow
 * (POST /auth/v1/recover). Supabase resolves the user by their auth email,
 * so no care_circle row is required, mints and stores the single-use
 * recovery token itself, and sends the email through the project's
 * configured Auth mailer. The link lands on <app>/reset with a recovery
 * session in the URL fragment. Always returns the same generic message so an
 * attacker cannot enumerate accounts.
 */
export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !ANON_KEY) {
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 });
  }

  if (!(await checkRateLimit(IP_LIMIT, clientIp(req)))) {
    return NextResponse.json({ error: 'too many attempts, try again later' }, { status: 429 });
  }

  let email = '';
  try {
    email = (((await req.json()) as { email?: string }).email || '').trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }
  if (!isEmail(email)) return NextResponse.json({ error: 'valid email required' }, { status: 400 });

  if (!(await checkRateLimit(EMAIL_LIMIT, email))) {
    return NextResponse.json(GENERIC);
  }

  const redirectTo = `${appUrl()}/reset`;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
        body: JSON.stringify({ email }),
        cache: 'no-store',
      },
    );
    if (!r.ok) {
      // Log status only (no email, no body) so ops can see mailer problems
      // such as SMTP not configured or the Auth email rate limit being hit.
      console.error(`[request-reset] Supabase recover failed with status ${r.status}; check Auth SMTP settings and redirect URL allow list`);
    }
  } catch {
    console.error('[request-reset] Supabase recover request errored (network)');
  }

  return NextResponse.json(GENERIC);
}
