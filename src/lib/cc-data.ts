'use client';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export type Severity = 'critical' | 'informational';

export interface CCSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user_id: string;
  patient_id: string;
  patient_name: string | null;
}

export interface AlertRow {
  id: string;
  patient_id: string;
  metric: string;
  severity: Severity;
  recommendation: string;
  fired_at: string;
  delivery_count: number;
}

export interface CircleRow {
  id: string;
  patient_id: string;
  member_user_id: string;
  member_email: string;
  member_name: string;
  member_phone: string | null;
  relationship: string;
  alert_level: Severity;
  created_at: string;
}

export function loadSession(): CCSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('cc-session');
    if (!raw) return null;
    return JSON.parse(raw) as CCSession;
  } catch {
    return null;
  }
}

export async function refreshSession(s: CCSession): Promise<CCSession | null> {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: s.refresh_token }),
  });
  if (!r.ok) return null;
  const data = (await r.json()) as { access_token: string; refresh_token: string; expires_at: number };
  const updated: CCSession = {
    ...s,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  };
  window.localStorage.setItem('cc-session', JSON.stringify(updated));
  return updated;
}

export async function ensureValidSession(s: CCSession): Promise<CCSession | null> {
  if (s.expires_at - 60 > Math.floor(Date.now() / 1000)) return s;
  return refreshSession(s);
}

export async function sbAuthed(token: string, path: string): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
}

export function fmtTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
