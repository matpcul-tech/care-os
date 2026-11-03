import { NextRequest, NextResponse } from 'next/server';
import { bearerToken, getUserId } from '@/lib/api-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'edge';

/**
 * GET /api/circle/alerts[?patient_id=...]
 *
 * In-app CareIQ alerts for the caller's care circle patient. CareIQ writes
 * rows to care_circle_alerts; this route is how CareCircle reads them.
 *
 * Access is checked twice:
 *   1. Here, with the service role: the caller must be the patient or hold a
 *      care_circle row for that patient (any care_role: admin, caregiver,
 *      viewer). A removed (revoked) member has no row and gets 403.
 *   2. In the database: the alert rows are read with the caller's own JWT,
 *      so the cca_family_select RLS policy applies as well.
 *
 * Only id, metric, severity, recommendation, and fired_at are returned.
 * delivery_summary (member emails and phones) is never selected.
 */

const RATE_LIMIT = { name: 'circle-alerts', max: 60, windowSeconds: 60 };
const LIMIT = 50;

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
const SERVICE_ROLE = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface InAppAlert {
  id: string;
  metric: string;
  severity: 'critical' | 'informational';
  recommendation: string;
  fired_at: string;
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { 'cache-control': 'private, no-store' } });
}

/** The patient ids this user holds a care_circle row for. Fails closed. */
async function grantedPatients(userId: string, patientId: string | null): Promise<string[] | null> {
  if (!SUPABASE_URL || !SERVICE_ROLE) return null;
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/care_circle` +
      `?member_user_id=eq.${encodeURIComponent(userId)}` +
      (patientId ? `&patient_id=eq.${encodeURIComponent(patientId)}` : '') +
      `&select=patient_id&order=created_at.asc&limit=20`,
    {
      headers: { apikey: SERVICE_ROLE, Authorization: `Bearer ${SERVICE_ROLE}` },
      cache: 'no-store',
    },
  );
  if (!r.ok) return null;
  const rows = (await r.json()) as Array<{ patient_id?: string }>;
  if (!Array.isArray(rows)) return null;
  return rows.map((x) => x.patient_id).filter((x): x is string => typeof x === 'string');
}

function clean(row: Record<string, unknown>): InAppAlert | null {
  if (typeof row.id !== 'string' || typeof row.metric !== 'string' || typeof row.fired_at !== 'string') {
    return null;
  }
  return {
    id: row.id,
    metric: row.metric.slice(0, 80),
    severity: row.severity === 'critical' ? 'critical' : 'informational',
    recommendation: typeof row.recommendation === 'string' ? row.recommendation.slice(0, 300) : '',
    fired_at: row.fired_at,
  };
}

export async function GET(req: NextRequest) {
  try {
    const token = bearerToken(req);
    const userId = await getUserId(token);
    if (!userId) return bad('authentication required', 401);

    if (!(await checkRateLimit(RATE_LIMIT, userId))) {
      return bad('rate limit exceeded, please slow down', 429);
    }

    const url = new URL(req.url);
    const asked = url.searchParams.get('patient_id') || url.searchParams.get('patientId');
    if (asked && !UUID.test(asked)) return bad('invalid patient_id');

    let patientId: string;
    if (asked && asked === userId) {
      patientId = asked;
    } else {
      const granted = await grantedPatients(userId, asked);
      if (granted === null) return bad('could not check access', 503);
      if (granted.length === 0) return bad('forbidden', 403);
      patientId = granted[0];
    }

    // Read with the caller's JWT so RLS (cca_family_select) also applies.
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/care_circle_alerts` +
        `?patient_id=eq.${encodeURIComponent(patientId)}` +
        `&select=id,metric,severity,recommendation,fired_at` +
        `&order=fired_at.desc&limit=${LIMIT}`,
      {
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
        cache: 'no-store',
      },
    );
    if (!r.ok) return bad('could not load alerts', 502);
    const rows = (await r.json()) as Array<Record<string, unknown>>;
    const alerts = (Array.isArray(rows) ? rows : [])
      .map(clean)
      .filter((a): a is InAppAlert => a !== null);

    return NextResponse.json(
      { patient_id: patientId, alerts },
      { headers: { 'cache-control': 'private, no-store' } },
    );
  } catch {
    return bad('Internal error', 500);
  }
}
