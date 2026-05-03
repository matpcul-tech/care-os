'use client';
import { useState, useEffect, useCallback } from 'react';
import { PATIENT, FEED_ITEMS } from '@/lib/data';
import { T, O, PAGE_PAD, SECTION_LABEL, CARD_BG, CARD_BORDER } from './ui';

// Demo patient UUID — swap for the authenticated user's id when auth is wired.
const DEMO_PATIENT_UUID =
  process.env.NEXT_PUBLIC_DEMO_PATIENT_UUID ||
  '11111111-2222-3333-4444-555555555555';

type AlertLevel = 'critical' | 'informational';

interface CircleMember {
  id: string;
  patient_id: string;
  member_email: string;
  member_name: string;
  relationship: string;
  alert_level: AlertLevel;
  created_at: string;
}

interface DeliveryResult {
  member_id: string;
  email: string;
  sent: boolean;
  id?: string | null;
  reason?: string;
  severity_sent: AlertLevel;
}

interface LastAlert {
  at: string;
  flagged: boolean;
  flagCount: number;
  sentCount: number;
}

const RELATIONSHIPS = [
  'Spouse', 'Daughter', 'Son', 'Parent', 'Sibling',
  'Caregiver', 'Home Health Aide', 'Primary Provider', 'Other',
];

const COLORS = ['#81B29A', '#F2CC8F', '#5B8FA8', '#8B7EC8', '#E07A5F', '#00d4b8'];

function avatarFor(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return COLORS[hash % COLORS.length];
}

function fmtTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function FamilyPage() {
  const [members, setMembers] = useState<CircleMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [relationship, setRelationship] = useState(RELATIONSHIPS[0]);
  const [level, setLevel] = useState<AlertLevel>('informational');

  const [checking, setChecking] = useState(false);
  const [lastAlert, setLastAlert] = useState<LastAlert | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/circle?patient_id=${DEMO_PATIENT_UUID}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load circle');
      setMembers(Array.isArray(data.members) ? data.members : []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const addMember = async () => {
    if (!name.trim() || !email.trim() || !relationship.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch('/api/circle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: DEMO_PATIENT_UUID,
          member_email: email.trim(),
          member_name: name.trim(),
          relationship: relationship.trim(),
          alert_level: level,
          patient_name: PATIENT.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add member');
      setName(''); setEmail(''); setRelationship(RELATIONSHIPS[0]); setLevel('informational');
      setShowForm(false);
      await loadMembers();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const runHealthCheck = async () => {
    setChecking(true);
    setError(null);
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: DEMO_PATIENT_UUID,
          // Demo vitals from data.ts — A1C 7.2 will fire informational alert.
          vitals: { a1c: 7.2, ldl: 142, bp_systolic: 138, bp_diastolic: 86 },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Health check failed');
      const delivery: DeliveryResult[] = Array.isArray(data.delivery) ? data.delivery : [];
      setLastAlert({
        at: data.sent_at,
        flagged: !!data.flagged,
        flagCount: Array.isArray(data.flags) ? data.flags.length : 0,
        sentCount: delivery.filter((d) => d.sent).length,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'rgba(255,255,255,.05)',
    border: CARD_BORDER,
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 12,
    color: '#eef2f8',
    fontFamily: O,
    outline: 'none',
    marginBottom: 8,
  };

  return (
    <div style={PAGE_PAD}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={SECTION_LABEL}>Care Circle</div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            background: showForm ? 'rgba(255,255,255,.06)' : 'linear-gradient(135deg,#00d4b8,#00b89e)',
            border: 'none',
            borderRadius: 10,
            padding: '6px 12px',
            color: showForm ? '#eef2f8' : '#07101f',
            fontSize: 10,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: O,
          }}
        >
          {showForm ? 'Cancel' : '+ Add Member'}
        </button>
      </div>

      {error && (
        <div style={{
          background: 'rgba(232,82,110,.1)', border: '1px solid rgba(232,82,110,.3)',
          borderRadius: 10, padding: '10px 12px', fontSize: 11, color: '#e8526e', marginBottom: 10,
        }}>
          {error}
        </div>
      )}

      {showForm && (
        <div style={{
          background: CARD_BG, border: CARD_BORDER, borderRadius: 14, padding: 14, marginBottom: 12,
        }}>
          <input style={inputStyle} placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <input style={inputStyle} placeholder="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select style={inputStyle} value={relationship} onChange={(e) => setRelationship(e.target.value)}>
            {RELATIONSHIPS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            {(['informational', 'critical'] as AlertLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setLevel(lvl)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 10,
                  border: level === lvl ? '1px solid #00d4b8' : CARD_BORDER,
                  background: level === lvl ? 'rgba(0,212,184,.12)' : 'rgba(255,255,255,.04)',
                  color: level === lvl ? '#00d4b8' : '#7a9bbf',
                  fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: O,
                  textTransform: 'uppercase', letterSpacing: '.1em',
                }}
              >
                {lvl === 'critical' ? '🚨 Critical only' : '🔔 All alerts'}
              </button>
            ))}
          </div>
          <button
            onClick={addMember}
            disabled={adding || !name.trim() || !email.trim()}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg,#00d4b8,#00b89e)',
              color: '#07101f', fontSize: 12, fontWeight: 700, fontFamily: O,
              opacity: adding || !name.trim() || !email.trim() ? 0.5 : 1,
            }}
          >
            {adding ? 'Sending invite…' : 'Add & Send Invite'}
          </button>
        </div>
      )}

      {loading && members.length === 0 && (
        <div style={{ fontSize: 11, color: '#7a9bbf', padding: 20, textAlign: 'center' }}>
          Loading circle…
        </div>
      )}

      {!loading && members.length === 0 && !error && (
        <div style={{
          background: CARD_BG, border: CARD_BORDER, borderRadius: 14,
          padding: 20, textAlign: 'center', fontSize: 12, color: '#7a9bbf', marginBottom: 12,
        }}>
          No circle members yet. Add a family member or caregiver to start receiving alerts.
        </div>
      )}

      {members.map((m) => (
        <div
          key={m.id}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '14px 16px', background: CARD_BG, border: CARD_BORDER,
            borderRadius: 14, marginBottom: 10,
          }}
        >
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: colorFor(m.id),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: T, fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {avatarFor(m.member_name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{m.member_name}</div>
            <div style={{ fontSize: 10, color: '#7a9bbf', marginTop: 2 }}>{m.relationship}</div>
            <div style={{
              fontFamily: T, fontSize: 9, color: '#7a9bbf', marginTop: 3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {m.member_email}
            </div>
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontFamily: T, fontSize: 8, padding: '3px 8px', borderRadius: 6,
            background: m.alert_level === 'critical' ? 'rgba(232,82,110,.12)' : 'rgba(0,212,184,.1)',
            color: m.alert_level === 'critical' ? '#e8526e' : '#00d4b8',
            border: `1px solid ${m.alert_level === 'critical' ? 'rgba(232,82,110,.3)' : 'rgba(0,212,184,.2)'}`,
            textTransform: 'uppercase', letterSpacing: '.1em',
          }}>
            {m.alert_level === 'critical' ? '🚨 Critical' : '🔔 All'}
          </div>
        </div>
      ))}

      {/* HEALTH CHECK CARD */}
      <div style={{ ...SECTION_LABEL, margin: '20px 0 10px' }}>Alerts</div>
      <div style={{
        background: CARD_BG, border: CARD_BORDER, borderRadius: 14, padding: 14, marginBottom: 12,
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Run health check</div>
        <div style={{ fontSize: 11, color: '#7a9bbf', lineHeight: 1.55, marginBottom: 10 }}>
          Evaluate {PATIENT.short}&apos;s latest A1C, LDL, and BP against safe thresholds. The circle is notified by email — no PHI in the message.
        </div>
        <button
          onClick={runHealthCheck}
          disabled={checking || members.length === 0}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg,#8060cc,#6040aa)',
            color: '#eef2f8', fontSize: 12, fontWeight: 700, fontFamily: O,
            opacity: checking || members.length === 0 ? 0.5 : 1,
          }}
        >
          {checking ? 'Checking…' : '🩺 Run health check'}
        </button>
        {lastAlert && (
          <div style={{
            marginTop: 10, padding: '10px 12px', borderRadius: 10,
            background: lastAlert.flagged ? 'rgba(212,168,67,.08)' : 'rgba(74,222,128,.08)',
            border: `1px solid ${lastAlert.flagged ? 'rgba(212,168,67,.25)' : 'rgba(74,222,128,.25)'}`,
            fontSize: 11, lineHeight: 1.55,
          }}>
            <div style={{ fontFamily: T, fontSize: 9, color: '#7a9bbf', marginBottom: 3 }}>
              Last alert: {fmtTime(lastAlert.at)}
            </div>
            {lastAlert.flagged ? (
              <span style={{ color: '#d4a843' }}>
                ⚠️ {lastAlert.flagCount} metric{lastAlert.flagCount === 1 ? '' : 's'} flagged · sent to {lastAlert.sentCount} circle member{lastAlert.sentCount === 1 ? '' : 's'}.
              </span>
            ) : (
              <span style={{ color: '#4ade80' }}>✅ All vitals within safe range. No alerts sent.</span>
            )}
          </div>
        )}
      </div>

      {/* ACTIVITY FEED (kept from existing UI) */}
      <div style={{ ...SECTION_LABEL, margin: '20px 0 10px' }}>Recent Activity</div>
      {FEED_ITEMS.map((a, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', background: a.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {a.avatar}
            </div>
            {i < FEED_ITEMS.length - 1 && (
              <div style={{ width: 1, flex: 1, background: 'rgba(0,212,184,.14)', marginTop: 3 }} />
            )}
          </div>
          <div style={{ flex: 1, paddingBottom: 10 }}>
            <div style={{ fontFamily: T, fontSize: 9, color: '#7a9bbf', marginBottom: 2 }}>{a.time}</div>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>
              {a.who} <span style={{ color: '#7a9bbf', fontWeight: 400 }}>{a.action}</span>
            </div>
            <div style={{ fontSize: 11, color: '#7a9bbf', lineHeight: 1.5 }}>{a.what}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
