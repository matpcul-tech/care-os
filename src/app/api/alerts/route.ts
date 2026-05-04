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

interface PersistedAlert {
  id: string;
  metric: string;
  severity: Severity;
  fired_at: string;
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

async function sb(method: 'GET' | 'POST', path: string, body?: unknown, prefer?: string) {
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

// Persist one row per fired flag to public.care_circle_alerts so the family
// dashboard can read alert history via RLS. Best-effort: failures are returned
// but don't fail the request — emails already went out.
async function persistAlerts(args: {
  patientId: string;
  flags: Flag[];
  members: CircleMember[];
  delivery: DeliveryResult[];
  firedAt: string;
}): Promise<{ alerts: PersistedAlert[]; persistError: string | null }> {
  const deliveryByMember = new Map<string, DeliveryResult>();
  for (const d of args.delivery) deliveryByMember.set(d.member_id, d);

  // For each flag, the visible recipients are:
  //   - all 'informational' members (they see everything)
  //   - all members if the flag is critical (critical members also see it)
  const visibleFor = (flag: Flag) =>
    args.members.filter(
      (m) => m.alert_level === 'informational' || flag.severity === 'critical',
    );

  const rows = args.flags.map((flag) => {
    const visible = visibleFor(flag);
    const sent: Array<{ member_id: string; email: string }> = [];
    const failed: Array<{ member_id: string; email: string; reason: string }> = [];
    for (const m of visible) {
      const d = deliveryByMember.get(m.id);
      if (!d) continue;
      if (d.sent) sent.push({ member_id: m.id, email: m.member_email });
      else failed.push({ member_id: m.id, email: m.member_email, reason: d.reason || 'failed' });
    }
    return {
      patient_id: args.patientId,
      metric: flag.metric,
      severity: flag.severity,
      recommendation: flag.recommendation,
      fired_at: args.firedAt,
      delivery_count: sent.length,
      delivery_summary: { sent, failed },
    };
  });

  if (rows.length === 0) return { alerts: [], persistError: null };

  const r = await sb('POST', 'care_circle_alerts', rows, 'return=representation');
  if (!r.ok) {
    return { alerts: [], persistError: `care_circle_alerts insert ${r.status}: ${await r.text()}` };
  }
  const inserted = (await r.json()) as Array<{
    id: string;
    metric: string;
    severity: Severity;
    fired_at: string;
  }>;
  return {
    alerts: inserted.map((a) => ({
      id: a.id,
      metric: a.metric,
      severity: a.severity,
      fired_at: a.fired_at,
    })),
    persistError: null,
  };
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
        alerts: [],
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

    const { alerts, persistError } = await persistAlerts({
      patientId,
      flags,
      members: allMembers,
      delivery,
      firedAt: sentAt,
    });

    return NextResponse.json({
      flagged: true,
      flags,
      delivery,
      alerts,
      sent_at: sentAt,
      ...(persistError ? { persist_warning: persistError } : {}),
    });
  } catch {
    return bad('Internal error', 500);
  }
}
