import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const ALERT_LEVELS = ['critical', 'informational'] as const;
type AlertLevel = (typeof ALERT_LEVELS)[number];

interface RedeemBody {
  code?: string;
  email?: string;
  password?: string;
  member_name?: string;
  member_phone?: string;
  relationship?: string;
  alert_level?: string;
}

interface InviteRow {
  id: string;
  code: string;
  patient_id: string;
  patient_name: string | null;
  suggested_relationship: string | null;
  suggested_alert_level: AlertLevel | null;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: CORS_HEADERS });
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function lookupInvite(code: string): Promise<InviteRow | null> {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/care_circle_invites?code=eq.${encodeURIComponent(code)}&select=*&limit=1`,
    {
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
      cache: 'no-store',
    },
  );
  if (!r.ok) return null;
  const rows = (await r.json()) as InviteRow[];
  return rows[0] || null;
}

function inviteUsable(invite: InviteRow): { ok: true } | { ok: false; reason: string } {
  if (invite.revoked_at) return { ok: false, reason: 'invite has been revoked' };
  if (invite.used_at) return { ok: false, reason: 'invite has already been redeemed' };
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return { ok: false, reason: 'invite has expired' };
  }
  return { ok: true };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// GET — validate a code without redeeming. Used by the signup page to show
// "You're being added to <patient_name>'s Care Circle" before the family
// member fills in their password.
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const code = (url.searchParams.get('code') || '').trim().toUpperCase();
    if (!code) return bad('code required');

    const invite = await lookupInvite(code);
    if (!invite) return bad('invite not found', 404);

    const usable = inviteUsable(invite);
    if (!usable.ok) return bad(usable.reason, 410);

    return NextResponse.json(
      {
        valid: true,
        patient_name: invite.patient_name,
        suggested_relationship: invite.suggested_relationship,
        suggested_alert_level: invite.suggested_alert_level,
        expires_at: invite.expires_at,
      },
      { headers: CORS_HEADERS },
    );
  } catch {
    return bad('Internal error', 500);
  }
}

// POST — redeem: create family-member auth account, link to patient via
// care_circle row, mark invite used, return a session.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RedeemBody;
    const code = (body.code || '').trim().toUpperCase();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const member_name = (body.member_name || '').trim();
    const member_phone = (body.member_phone || '').trim() || null;
    const relationship = (body.relationship || '').trim();
    const rawLevel = (body.alert_level || '').trim();

    if (!code) return bad('code required');
    if (!isEmail(email)) return bad('valid email required');
    if (password.length < 8) return bad('password must be at least 8 characters');
    if (!member_name) return bad('member_name required');

    const invite = await lookupInvite(code);
    if (!invite) return bad('invite not found', 404);
    const usable = inviteUsable(invite);
    if (!usable.ok) return bad(usable.reason, 410);

    const finalRelationship =
      relationship || invite.suggested_relationship || 'Family';
    const finalAlertLevel: AlertLevel =
      ((rawLevel as AlertLevel) || invite.suggested_alert_level || 'informational');
    if (!ALERT_LEVELS.includes(finalAlertLevel)) {
      return bad('alert_level must be "critical" or "informational"');
    }

    // 1. Create the auth account (email pre-confirmed so they can sign in now).
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: member_name, role: 'care_circle_member' },
      }),
    });

    if (!createRes.ok) {
      const txt = await createRes.text();
      if (
        createRes.status === 422 ||
        txt.includes('already been registered') ||
        txt.includes('already exists') ||
        txt.includes('User already registered')
      ) {
        return bad('an account with this email already exists', 409);
      }
      return bad(`auth create failed: ${createRes.status} ${txt}`, 500);
    }
    const newUser = (await createRes.json()) as { id: string; email: string };

    // 2. Insert the care_circle row linking new auth account to the patient.
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/care_circle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_ROLE,
        Authorization: `Bearer ${SERVICE_ROLE}`,
        Prefer: 'return=representation',
      },
      body: JSON.stringify([
        {
          patient_id: invite.patient_id,
          member_user_id: newUser.id,
          member_email: email,
          member_name,
          member_phone,
          relationship: finalRelationship,
          alert_level: finalAlertLevel,
          invite_id: invite.id,
        },
      ]),
    });

    if (!insertRes.ok) {
      // Roll back the auth account so the user can retry with a fresh row.
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${newUser.id}`, {
        method: 'DELETE',
        headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
      });
      return bad(
        `circle insert failed: ${insertRes.status} ${await insertRes.text()}`,
        500,
      );
    }
    const circleRow = ((await insertRes.json()) as Array<Record<string, unknown>>)[0];

    // 3. Mark the invite as redeemed (best-effort; non-fatal).
    await fetch(
      `${SUPABASE_URL}/rest/v1/care_circle_invites?id=eq.${invite.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
        },
        body: JSON.stringify({
          used_at: new Date().toISOString(),
          used_by: newUser.id,
        }),
      },
    );

    // 4. Issue the family member a session so the client is signed in.
    const tokenRes = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
        body: JSON.stringify({ email, password }),
      },
    );
    const session = tokenRes.ok ? await tokenRes.json() : null;

    return NextResponse.json(
      {
        ok: true,
        user: { id: newUser.id, email: newUser.email },
        circle: circleRow,
        patient: { id: invite.patient_id, name: invite.patient_name },
        session,
      },
      { headers: CORS_HEADERS },
    );
  } catch {
    return bad('Internal error', 500);
  }
}
