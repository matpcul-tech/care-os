import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'CareCircle <care@carecircle.health>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://care-os.vercel.app';

const ALERT_LEVELS = ['critical', 'informational'] as const;
type AlertLevel = (typeof ALERT_LEVELS)[number];

interface AddMemberBody {
  patient_id?: string;
  patientId?: string;
  member_email?: string;
  member_name?: string;
  relationship?: string;
  alert_level?: string;
  patient_name?: string;
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function sb(
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  prefer?: string,
) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
}

async function sendInviteEmail(args: {
  to: string;
  memberName: string;
  patientName: string;
  relationship: string;
  alertLevel: AlertLevel;
}) {
  if (!RESEND_API_KEY) {
    return { sent: false, reason: 'RESEND_API_KEY not configured' };
  }

  const subject = `You've been invited to ${args.patientName}'s Care Circle`;
  const cadence =
    args.alertLevel === 'critical'
      ? 'critical health alerts only'
      : 'all informational and critical health alerts';

  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="color:#00a890;margin:0 0 12px">Welcome to the Care Circle</h2>
  <p>Hi ${args.memberName},</p>
  <p>You've been added to <strong>${args.patientName}</strong>'s CareCircle as their <strong>${args.relationship}</strong>.</p>
  <p>You'll receive <strong>${cadence}</strong>.</p>
  <p>
    <a href="${APP_URL}" style="display:inline-block;padding:10px 18px;background:#00a890;color:#fff;text-decoration:none;border-radius:6px">
      Open CareCircle
    </a>
  </p>
  <p style="font-size:12px;color:#666;margin-top:24px">
    Sent by CareCircle, protected by the Sovereign Prompt Shield. Alerts never include raw PHI.
  </p>
</div>`.trim();

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: args.to, subject, html }),
  });

  if (!r.ok) {
    return { sent: false, reason: `Resend ${r.status}: ${await r.text()}` };
  }
  const data = (await r.json()) as { id?: string };
  return { sent: true, id: data.id ?? null };
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const patientId = url.searchParams.get('patient_id') || url.searchParams.get('patientId');
    if (!patientId) return bad('patient_id required');

    const r = await sb(
      'GET',
      `care_circle?patient_id=eq.${encodeURIComponent(patientId)}&order=created_at.desc`,
    );
    if (!r.ok) return bad(`Supabase ${r.status}: ${await r.text()}`, 500);

    const members = await r.json();
    return NextResponse.json({ members });
  } catch {
    return bad('Internal error', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AddMemberBody;
    const patientId = body.patient_id || body.patientId;
    const member_email = (body.member_email || '').trim().toLowerCase();
    const member_name = (body.member_name || '').trim();
    const relationship = (body.relationship || '').trim();
    const alert_level = ((body.alert_level || 'informational').trim() as AlertLevel);

    if (!patientId) return bad('patient_id required');
    if (!isEmail(member_email)) return bad('valid member_email required');
    if (!member_name) return bad('member_name required');
    if (!relationship) return bad('relationship required');
    if (!ALERT_LEVELS.includes(alert_level)) {
      return bad('alert_level must be "critical" or "informational"');
    }

    const insertRes = await sb(
      'POST',
      'care_circle',
      [{ patient_id: patientId, member_email, member_name, relationship, alert_level }],
      'return=representation',
    );

    if (!insertRes.ok) {
      const txt = await insertRes.text();
      if (insertRes.status === 409 || txt.includes('duplicate')) {
        return bad(`${member_email} is already in this Care Circle`, 409);
      }
      return bad(`Supabase ${insertRes.status}: ${txt}`, 500);
    }

    const rows = (await insertRes.json()) as Array<Record<string, unknown>>;
    const inserted = rows[0];

    const invite = await sendInviteEmail({
      to: member_email,
      memberName: member_name,
      patientName: body.patient_name || 'a CareCircle patient',
      relationship,
      alertLevel: alert_level,
    });

    return NextResponse.json({ member: inserted, invite });
  } catch {
    return bad('Internal error', 500);
  }
}
