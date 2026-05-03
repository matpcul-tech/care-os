import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'CareCircle <care@carecircle.health>';

type Severity = 'critical' | 'informational';

interface Vitals {
  a1c?: number | null;
  ldl?: number | null;
  bp_systolic?: number | null;
  bp_diastolic?: number | null;
}

interface AlertsBody {
  patient_id?: string;
  patientId?: string;
  vitals?: Vitals;
}

interface Flag {
  metric: string;
  severity: Severity;
  recommendation: string;
}

interface CircleMember {
  id: string;
  member_email: string;
  member_name: string;
  alert_level: Severity;
}

interface DeliveryResult {
  member_id: string;
  email: string;
  sent: boolean;
  id?: string | null;
  reason?: string;
  severity_sent: Severity;
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function evaluate(v: Vitals): Flag[] {
  const flags: Flag[] = [];

  if (typeof v.a1c === 'number' && v.a1c > 6.4) {
    flags.push({
      metric: 'A1C',
      severity: 'informational',
      recommendation:
        'Hemoglobin A1C is above target. Schedule a primary-care follow-up within 14 days and review medication adherence.',
    });
  }

  if (typeof v.ldl === 'number' && v.ldl > 200) {
    flags.push({
      metric: 'LDL Cholesterol',
      severity: 'critical',
      recommendation:
        'LDL is significantly elevated. Contact the primary-care provider this week to discuss statin therapy and dietary changes.',
    });
  }

  const sys = typeof v.bp_systolic === 'number' ? v.bp_systolic : null;
  const dia = typeof v.bp_diastolic === 'number' ? v.bp_diastolic : null;
  if ((sys !== null && sys > 140) || (dia !== null && dia > 90)) {
    flags.push({
      metric: 'Blood Pressure',
      severity: 'critical',
      recommendation:
        'Blood pressure is above the safe range. Re-check within 24 hours and contact the care team if it remains elevated. Confirm BP medications were taken as prescribed.',
    });
  }

  return flags;
}

async function sb(method: 'GET' | 'POST', path: string) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
    },
    cache: 'no-store',
  });
}

async function sendAlertEmail(args: {
  to: string;
  memberName: string;
  patientId: string;
  flags: Flag[];
}) {
  if (!RESEND_API_KEY) {
    return { sent: false as const, reason: 'RESEND_API_KEY not configured' };
  }

  const hasCritical = args.flags.some((f) => f.severity === 'critical');
  const patientRef = args.patientId.slice(0, 8);
  const subject = hasCritical
    ? `[Critical] CareCircle health alert — Patient ${patientRef}`
    : `CareCircle health alert — Patient ${patientRef}`;

  const items = args.flags
    .map((f) => {
      const color = f.severity === 'critical' ? '#c0392b' : '#b07c00';
      return `
    <li style="margin:0 0 14px">
      <div style="font-weight:600;color:${color}">
        ${f.metric} &middot; ${f.severity.toUpperCase()}
      </div>
      <div style="color:#333">${f.recommendation}</div>
    </li>`;
    })
    .join('');

  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
  <h2 style="color:#00a890;margin:0 0 12px">CareCircle Health Alert</h2>
  <p>Hi ${args.memberName},</p>
  <p>The following metric(s) crossed a threshold and may need attention:</p>
  <ul style="padding-left:18px;margin:12px 0">${items}</ul>
  <p style="font-size:12px;color:#666;margin-top:24px;padding-top:12px;border-top:1px solid #eee">
    Patient reference: <code>${args.patientId}</code><br>
    No raw values or personal information are included. Sign in to CareCircle for full context.<br>
    Protected by the Sovereign Prompt Shield.
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
    return { sent: false as const, reason: `Resend ${r.status}: ${await r.text()}` };
  }
  const data = (await r.json()) as { id?: string };
  return { sent: true as const, id: data.id ?? null };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AlertsBody;
    const patientId = body.patient_id || body.patientId;
    if (!patientId) return bad('patient_id required');
    if (!body.vitals || typeof body.vitals !== 'object') return bad('vitals required');

    const flags = evaluate(body.vitals);
    if (flags.length === 0) {
      return NextResponse.json({
        flagged: false,
        flags: [],
        delivery: [],
        sent_at: new Date().toISOString(),
      });
    }

    const r = await sb(
      'GET',
      `care_circle?patient_id=eq.${encodeURIComponent(patientId)}&select=id,member_email,member_name,alert_level`,
    );
    if (!r.ok) return bad(`Supabase ${r.status}: ${await r.text()}`, 500);
    const allMembers = (await r.json()) as CircleMember[];

    const sentAt = new Date().toISOString();
    const criticalFlags = flags.filter((f) => f.severity === 'critical');

    const delivery: DeliveryResult[] = (
      await Promise.all(
        allMembers.map(async (m) => {
          // Critical-only members never see informational flags.
          const visible = m.alert_level === 'critical' ? criticalFlags : flags;
          if (visible.length === 0) return null;

          const result = await sendAlertEmail({
            to: m.member_email,
            memberName: m.member_name,
            patientId,
            flags: visible,
          });

          return {
            member_id: m.id,
            email: m.member_email,
            severity_sent: m.alert_level,
            ...result,
          } as DeliveryResult;
        }),
      )
    ).filter((d): d is DeliveryResult => d !== null);

    return NextResponse.json({
      flagged: true,
      flags,
      delivery,
      sent_at: sentAt,
    });
  } catch {
    return bad('Internal error', 500);
  }
}
