'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { T, O, PAGE_PAD, SECTION_LABEL, CARD_BG, CARD_BORDER } from './ui';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type Severity = 'critical' | 'informational';

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  user_id: string;
  patient_id: string;
  patient_name: string | null;
}

interface CareCircleRow {
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

interface AlertRow {
  id: string;
  patient_id: string;
  metric: string;
  severity: Severity;
  recommendation: string;
  fired_at: string;
  delivery_count: number;
}

function fmtTime(iso: string) {
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

function loadSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('cc-session');
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

async function refreshSession(s: Session): Promise<Session | null> {
  const r = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    },
  );
  if (!r.ok) return null;
  const data = (await r.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };
  const updated: Session = {
    ...s,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  };
  window.localStorage.setItem('cc-session', JSON.stringify(updated));
  return updated;
}

async function ensureValidSession(s: Session): Promise<Session | null> {
  // Refresh 60s before expiry to avoid edge-of-expiry races.
  if (s.expires_at - 60 > Math.floor(Date.now() / 1000)) return s;
  return refreshSession(s);
}

async function sbAuthed(token: string, path: string): Promise<Response> {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: ANON_KEY,
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });
}

export default function FamilyPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [myRow, setMyRow] = useState<CareCircleRow | null>(null);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = loadSession();
      if (!s) {
        router.push('/signup');
        return;
      }
      const valid = await ensureValidSession(s);
      if (!valid) {
        window.localStorage.removeItem('cc-session');
        router.push('/signup');
        return;
      }
      if (cancelled) return;
      setSession(valid);

      try {
        // Family member's own care_circle row — RLS scopes to member_user_id = auth.uid().
        const myRowRes = await sbAuthed(
          valid.access_token,
          `care_circle?member_user_id=eq.${valid.user_id}&limit=1&select=*`,
        );
        if (!myRowRes.ok) {
          throw new Error(`circle row ${myRowRes.status}: ${await myRowRes.text()}`);
        }
        const rows = (await myRowRes.json()) as CareCircleRow[];
        const me = rows[0];
        if (!me) throw new Error('Could not find your Care Circle row.');
        if (cancelled) return;
        setMyRow(me);

        // Alerts for the linked patient — family-member RLS policy in
        // CareIQ migration 0002 lets us read these.
        const alertsRes = await sbAuthed(
          valid.access_token,
          `care_circle_alerts?patient_id=eq.${me.patient_id}&order=fired_at.desc&limit=50&select=*`,
        );
        if (!alertsRes.ok) {
          throw new Error(`alerts ${alertsRes.status}: ${await alertsRes.text()}`);
        }
        const alertRows = (await alertsRes.json()) as AlertRow[];
        if (cancelled) return;
        setAlerts(alertRows);
      } catch (e) {
        if (cancelled) return;
        setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const signOut = () => {
    window.localStorage.removeItem('cc-session');
    router.push('/signup');
  };

  if (loading) {
    return (
      <div style={PAGE_PAD}>
        <div style={{ fontSize: 12, color: '#7a9bbf', textAlign: 'center', padding: 32 }}>
          Loading your Care Circle…
        </div>
      </div>
    );
  }

  if (error || !session || !myRow) {
    return (
      <div style={PAGE_PAD}>
        <div style={{ ...SECTION_LABEL, marginBottom: 8 }}>Care Circle</div>
        <div
          style={{
            background: 'rgba(232,82,110,.1)',
            border: '1px solid rgba(232,82,110,.3)',
            borderRadius: 12,
            padding: 14,
            fontSize: 11,
            color: '#e8526e',
            marginBottom: 12,
          }}
        >
          {error || 'Session error.'}
        </div>
        <button
          onClick={signOut}
          style={{
            width: '100%',
            padding: '10px 0',
            borderRadius: 10,
            border: '1px solid rgba(0,212,184,.14)',
            cursor: 'pointer',
            background: 'rgba(255,255,255,.06)',
            color: '#eef2f8',
            fontSize: 12,
            fontWeight: 700,
            fontFamily: O,
          }}
        >
          Sign in again
        </button>
      </div>
    );
  }

  const patientName = session.patient_name || 'your loved one';
  const patientRef = session.patient_id.slice(0, 8);
  const lastAlert = alerts[0];

  return (
    <div style={PAGE_PAD}>
      {/* Patient header */}
      <div style={SECTION_LABEL}>You are monitoring</div>
      <div
        style={{
          background: CARD_BG,
          border: CARD_BORDER,
          borderRadius: 14,
          padding: 16,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 22,
            color: '#eef2f8',
            marginBottom: 4,
          }}
        >
          {patientName}
        </div>
        <div style={{ fontFamily: T, fontSize: 9, color: '#7a9bbf' }}>
          Patient ref: {patientRef}…
        </div>
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: CARD_BORDER,
            display: 'flex',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: T,
                fontSize: 9,
                color: '#7a9bbf',
                textTransform: 'uppercase',
                letterSpacing: '.1em',
              }}
            >
              You are
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 3 }}>
              {myRow.member_name}
            </div>
            <div style={{ fontSize: 11, color: '#7a9bbf' }}>{myRow.relationship}</div>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              alignSelf: 'flex-start',
              gap: 4,
              fontFamily: T,
              fontSize: 9,
              padding: '4px 10px',
              borderRadius: 8,
              background:
                myRow.alert_level === 'critical'
                  ? 'rgba(232,82,110,.12)'
                  : 'rgba(0,212,184,.1)',
              color: myRow.alert_level === 'critical' ? '#e8526e' : '#00d4b8',
              border: `1px solid ${myRow.alert_level === 'critical' ? 'rgba(232,82,110,.3)' : 'rgba(0,212,184,.2)'}`,
              textTransform: 'uppercase',
              letterSpacing: '.1em',
            }}
          >
            {myRow.alert_level === 'critical' ? '🚨 Critical only' : '🔔 All alerts'}
          </div>
        </div>
      </div>

      {/* Last alert */}
      <div style={{ ...SECTION_LABEL, margin: '20px 0 10px' }}>Last alert</div>
      {lastAlert ? (
        <div
          style={{
            background:
              lastAlert.severity === 'critical'
                ? 'rgba(232,82,110,.08)'
                : 'rgba(212,168,67,.08)',
            border: `1px solid ${lastAlert.severity === 'critical' ? 'rgba(232,82,110,.3)' : 'rgba(212,168,67,.25)'}`,
            borderRadius: 12,
            padding: 14,
            marginBottom: 12,
          }}
        >
          <div
            style={{ fontFamily: T, fontSize: 9, color: '#7a9bbf', marginBottom: 4 }}
          >
            {fmtTime(lastAlert.fired_at)}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 4,
              color: lastAlert.severity === 'critical' ? '#e8526e' : '#d4a843',
            }}
          >
            {lastAlert.severity === 'critical' ? '🚨 ' : '⚠️ '}
            {lastAlert.metric} · {lastAlert.severity.toUpperCase()}
          </div>
          <div style={{ fontSize: 11, color: '#eef2f8', lineHeight: 1.55 }}>
            {lastAlert.recommendation}
          </div>
        </div>
      ) : (
        <div
          style={{
            background: CARD_BG,
            border: CARD_BORDER,
            borderRadius: 12,
            padding: 14,
            fontSize: 11,
            color: '#4ade80',
            textAlign: 'center',
            marginBottom: 12,
          }}
        >
          ✅ No alerts yet — all monitored vitals are within safe range.
        </div>
      )}

      {/* Alert history */}
      {alerts.length > 1 && (
        <>
          <div style={{ ...SECTION_LABEL, margin: '20px 0 10px' }}>Alert History</div>
          {alerts.slice(1).map((a) => (
            <div
              key={a.id}
              style={{
                background: CARD_BG,
                border: CARD_BORDER,
                borderRadius: 12,
                padding: '12px 14px',
                marginBottom: 8,
              }}
            >
              <div
                style={{ fontFamily: T, fontSize: 9, color: '#7a9bbf', marginBottom: 3 }}
              >
                {fmtTime(a.fired_at)}
              </div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  marginBottom: 2,
                  color: a.severity === 'critical' ? '#e8526e' : '#d4a843',
                }}
              >
                {a.metric} · {a.severity.toUpperCase()}
              </div>
              <div style={{ fontSize: 11, color: '#7a9bbf', lineHeight: 1.55 }}>
                {a.recommendation}
              </div>
            </div>
          ))}
        </>
      )}

      <button
        onClick={signOut}
        style={{
          width: '100%',
          marginTop: 24,
          padding: '10px 0',
          borderRadius: 10,
          border: '1px solid rgba(0,212,184,.14)',
          cursor: 'pointer',
          background: 'rgba(255,255,255,.04)',
          color: '#7a9bbf',
          fontSize: 11,
          fontWeight: 600,
          fontFamily: O,
        }}
      >
        Sign out
      </button>
    </div>
  );
}
