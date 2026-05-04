'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Heart } from 'lucide-react';

const T = "'DM Mono',monospace";
const O = "'Outfit',sans-serif";
const P = "'Playfair Display',serif";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface CCSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user_id: string;
  patient_id: string;
  patient_name: string | null;
}

interface CareCircleRow {
  patient_id: string;
  patient_name: string | null;
}

interface SupabaseTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string };
}

interface SupabaseAuthError {
  error_description?: string;
  msg?: string;
  message?: string;
}

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,.04)',
  border: '1px solid rgba(0,212,184,.14)',
  borderRadius: 18,
  padding: 24,
};

const input: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,.05)',
  border: '1px solid rgba(0,212,184,.14)',
  borderRadius: 10,
  padding: '11px 14px',
  fontSize: 13,
  color: '#eef2f8',
  fontFamily: O,
  outline: 'none',
  marginBottom: 10,
};

const label: React.CSSProperties = {
  fontFamily: T,
  fontSize: 9,
  color: '#7a9bbf',
  textTransform: 'uppercase',
  letterSpacing: '.18em',
  marginBottom: 6,
  display: 'block',
};

function readSession(): CCSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('cc-session');
    if (!raw) return null;
    return JSON.parse(raw) as CCSession;
  } catch {
    return null;
  }
}

function sessionStillValid(s: CCSession): boolean {
  return s.expires_at - 60 > Math.floor(Date.now() / 1000);
}

async function refreshSession(s: CCSession): Promise<CCSession | null> {
  const r = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
    {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: s.refresh_token }),
    },
  );
  if (!r.ok) return null;
  const data = (await r.json()) as SupabaseTokenResponse;
  const updated: CCSession = {
    ...s,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at,
  };
  window.localStorage.setItem('cc-session', JSON.stringify(updated));
  return updated;
}

// After password login, query the family member's care_circle row to find
// which patient they're linked to and their name. Reads through RLS scoped
// to member_user_id = auth.uid(), so the JWT must be passed.
async function lookupCircle(
  accessToken: string,
  userId: string,
): Promise<CareCircleRow | null> {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/care_circle?member_user_id=eq.${userId}&select=patient_id,patient_name&limit=1`,
    {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    },
  );
  if (!r.ok) return null;
  const rows = (await r.json()) as CareCircleRow[];
  return rows[0] ?? null;
}

export default function LoginPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = readSession();
      if (!s) {
        if (!cancelled) setChecking(false);
        return;
      }
      if (sessionStillValid(s)) {
        if (!cancelled) router.replace('/app');
        return;
      }
      const refreshed = await refreshSession(s);
      if (cancelled) return;
      if (refreshed) {
        router.replace('/app');
      } else {
        window.localStorage.removeItem('cc-session');
        setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const submit = useCallback(async () => {
    if (submitting) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('A valid email is required.');
      return;
    }
    if (password.length < 1) {
      setError('Password is required.');
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const tokenRes = await fetch(
        `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            password,
          }),
        },
      );

      if (!tokenRes.ok) {
        const errBody = (await tokenRes.json().catch(() => ({}))) as SupabaseAuthError;
        const msg =
          errBody.error_description ||
          errBody.msg ||
          errBody.message ||
          'Login failed. Check your email and password.';
        setError(msg);
        return;
      }

      const data = (await tokenRes.json()) as SupabaseTokenResponse;

      const cc = await lookupCircle(data.access_token, data.user.id);
      if (!cc) {
        setError(
          'Logged in, but no Care Circle membership found for this account. Use your invite link to join a Care Circle.',
        );
        return;
      }

      const session: CCSession = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: data.expires_at,
        user_id: data.user.id,
        patient_id: cc.patient_id,
        patient_name: cc.patient_name,
      };
      window.localStorage.setItem('cc-session', JSON.stringify(session));
      router.replace('/app');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [email, password, submitting, router]);

  if (checking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#07101f',
          color: '#7a9bbf',
          fontFamily: O,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400;500&family=Outfit:wght@300;400;500;600;700&display=swap');
          *{box-sizing:border-box}
        `}</style>
        Checking session...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#07101f',
        fontFamily: O,
        color: '#eef2f8',
        padding: '40px 20px',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400;500&family=Outfit:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box}
        input::placeholder{color:#516a87}
        input:focus{border-color:#00d4b8 !important}
      `}</style>

      <div style={{ maxWidth: 460, margin: '0 auto' }}>
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 28,
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg,#00b89e,#8060cc)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 14px rgba(0,212,184,.3)',
            }}
          >
            <Heart size={16} color="#fff" fill="#fff" />
          </div>
          <div style={{ fontFamily: P, fontSize: 18, color: '#eef2f8' }}>
            CareCircle
          </div>
        </Link>

        <div
          style={{
            fontFamily: T,
            fontSize: 10,
            color: '#00d4b8',
            textTransform: 'uppercase',
            letterSpacing: '.18em',
            marginBottom: 8,
          }}
        >
          Care Circle Login
        </div>
        <h1 style={{ fontFamily: P, fontSize: 28, fontWeight: 300, lineHeight: 1.2, marginBottom: 22 }}>
          Welcome back
        </h1>

        <div style={card}>
          <span style={label}>Email</span>
          <input
            style={input}
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          />

          <span style={label}>Password</span>
          <input
            style={input}
            type="password"
            autoComplete="current-password"
            placeholder=""
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          />

          {error && (
            <div
              style={{
                marginBottom: 12,
                padding: '10px 12px',
                borderRadius: 10,
                fontSize: 11,
                background: 'rgba(232,82,110,.1)',
                border: '1px solid rgba(232,82,110,.3)',
                color: '#e8526e',
              }}
            >
              {error}
            </div>
          )}

          <button
            onClick={submit}
            disabled={submitting}
            style={{
              width: '100%',
              padding: '13px 0',
              borderRadius: 12,
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(135deg,#00d4b8,#00b89e)',
              color: '#07101f',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: O,
              opacity: submitting ? 0.6 : 1,
              boxShadow: '0 0 20px rgba(0,212,184,.3)',
            }}
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>

          <p style={{ marginTop: 18, fontSize: 11, color: '#7a9bbf', textAlign: 'center', lineHeight: 1.6 }}>
            New here?{' '}
            <Link
              href="/signup"
              style={{ color: '#00d4b8', textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              Use your invite code to sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
