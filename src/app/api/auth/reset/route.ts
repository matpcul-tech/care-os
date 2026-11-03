import { NextRequest, NextResponse } from 'next/server';
import { validatePassword } from '@/lib/password-policy';
import { checkRateLimit, clientIp } from '@/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

const RATE_LIMIT = { name: 'reset-consume', max: 20, windowSeconds: 900 };

/**
 * Complete a password reset started by Supabase Auth's recovery email. The
 * client passes the recovery access_token from the link fragment. We confirm
 * it with GoTrue, enforce the app password policy, set the new password with
 * that same token, then revoke the recovery session so the link cannot be
 * reused. MFA is still enforced at the next normal login.
 */
export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !ANON_KEY) {
    return NextResponse.json({ error: 'server misconfigured' }, { status: 500 });
  }

  if (!(await checkRateLimit(RATE_LIMIT, clientIp(req)))) {
    return NextResponse.json({ error: 'too many attempts, try again later' }, { status: 429 });
  }

  let body: { access_token?: string; new_password?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'invalid json body' }, { status: 400 });
  }
  const token = (body.access_token || '').trim();
  const newPassword = body.new_password || '';
  if (!token) return NextResponse.json({ error: 'reset token required' }, { status: 400 });

  const auth = { apikey: ANON_KEY, Authorization: `Bearer ${token}` };
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: auth, cache: 'no-store' });
  if (!userRes.ok) {
    return NextResponse.json({ error: 'invalid or expired reset link' }, { status: 400 });
  }
  const user = (await userRes.json()) as { id?: string; email?: string };

  const pw = validatePassword(newPassword, { email: user.email || '' });
  if (!pw.ok) return NextResponse.json({ error: pw.reason }, { status: 400 });

  const upd = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'PUT',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: newPassword }),
    cache: 'no-store',
  });
  if (!upd.ok) {
    return NextResponse.json({ error: 'could not update password' }, { status: 502 });
  }

  // Best effort: end the recovery session (and other sessions) after reset.
  try {
    await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=global`, { method: 'POST', headers: auth, cache: 'no-store' });
  } catch {
    /* ignore */
  }

  return NextResponse.json({ ok: true });
}
