'use client';
import { useEffect, useState } from 'react';
import {
  sbAuthed,
  fmtTime,
  type CCSession,
  type AlertRow,
} from '@/lib/cc-data';
import { T, PAGE_PAD, SECTION_LABEL, CARD_BG, CARD_BORDER } from './ui';

const CAREIQ_URL =
  process.env.NEXT_PUBLIC_CAREIQ_URL || 'https://care-iq-sable.vercel.app';

interface ShieldVitals {
  patient_id: string;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  a1c: number | null;
  ldl: number | null;
  hr: number | null;
  spo2: number | null;
  risk_score: number;
  updated_at: string | null;
  decrypted_at: string;
  shield_version: string;
}

function bpStatus(sys: number | null, dia: number | null): 'ok' | 'warn' | 'alert' {
  if (sys === null && dia === null) return 'ok';
  if ((sys ?? 0) >= 140 || (dia ?? 0) >= 90) return 'alert';
  if ((sys ?? 0) >= 130 || (dia ?? 0) >= 80) return 'warn';
  return 'ok';
}
function a1cStatus(v: number | null): 'ok' | 'warn' | 'alert' {
  if (v === null) return 'ok';
  if (v >= 6.5) return 'alert';
  if (v >= 5.7) return 'warn';
  return 'ok';
}
function ldlStatus(v: number | null): 'ok' | 'warn' | 'alert' {
  if (v === null) return 'ok';
  if (v >= 190) return 'alert';
  if (v >= 130) return 'warn';
  return 'ok';
}
function hrStatus(v: number | null): 'ok' | 'warn' | 'alert' {
  if (v === null) return 'ok';
  if (v < 50 || v > 100) return 'alert';
  if (v < 55 || v > 95) return 'warn';
  return 'ok';
}
function spo2Status(v: number | null): 'ok' | 'warn' | 'alert' {
  if (v === null) return 'ok';
  if (v < 90) return 'alert';
  if (v < 95) return 'warn';
  return 'ok';
}

const statusColor = (s: 'ok' | 'warn' | 'alert') =>
  s === 'alert' ? '#e8526e' : s === 'warn' ? '#d4a843' : '#00d4b8';

function shieldTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

const RING_R = 30;
const RING_C = 2 * Math.PI * RING_R;

export default function CareIQPage({ session }: { session: CCSession }) {
  const [vitals, setVitals] = useState<ShieldVitals | null>(null);
  const [vitalsErr, setVitalsErr] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertRow[] | null>(null);
  const [alertsErr, setAlertsErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${CAREIQ_URL}/api/shield/decrypt`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          cache: 'no-store',
        });
        const data = (await r.json().catch(() => ({}))) as Partial<ShieldVitals> & { error?: string };
        if (!r.ok) {
          if (!cancelled) setVitalsErr(data.error || `vitals ${r.status}`);
          return;
        }
        if (!cancelled) setVitals(data as ShieldVitals);
      } catch (e) {
        if (!cancelled) setVitalsErr((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.access_token]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await sbAuthed(
          session.access_token,
          `care_circle_alerts?patient_id=eq.${session.patient_id}&order=fired_at.desc&limit=100&select=*`,
        );
        if (!r.ok) throw new Error(`alerts ${r.status}`);
        const data = (await r.json()) as AlertRow[];
        if (!cancelled) setAlerts(data);
      } catch (e) {
        if (!cancelled) setAlertsErr((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.access_token, session.patient_id]);

  const score = vitals?.risk_score ?? 0;
  const offset = RING_C * (1 - score / 100);
  const scoreColor = score >= 75 ? '#4ade80' : score >= 55 ? '#d4a843' : '#e8526e';
  const scoreLabel = score >= 75 ? 'Low risk' : score >= 55 ? 'Moderate risk' : 'High risk';

  const vitalCells: { label: string; val: string; unit: string; status: 'ok' | 'warn' | 'alert' }[] =
    vitals
      ? [
          {
            label: 'BP',
            val:
              vitals.bp_systolic != null && vitals.bp_diastolic != null
                ? `${vitals.bp_systolic}/${vitals.bp_diastolic}`
                : '—',
            unit: 'mmHg',
            status: bpStatus(vitals.bp_systolic, vitals.bp_diastolic),
          },
          {
            label: 'A1C',
            val: vitals.a1c != null ? vitals.a1c.toFixed(1) : '—',
            unit: '%',
            status: a1cStatus(vitals.a1c),
          },
          {
            label: 'LDL',
            val: vitals.ldl != null ? String(Math.round(vitals.ldl)) : '—',
            unit: 'mg/dL',
            status: ldlStatus(vitals.ldl),
          },
          {
            label: 'HR',
            val: vitals.hr != null ? String(vitals.hr) : '—',
            unit: 'bpm',
            status: hrStatus(vitals.hr),
          },
          {
            label: 'SpO2',
            val: vitals.spo2 != null ? String(vitals.spo2) : '—',
            unit: '%',
            status: spo2Status(vitals.spo2),
          },
        ]
      : [];

  const anyVitalEntered =
    vitals &&
    (vitals.bp_systolic != null ||
      vitals.bp_diastolic != null ||
      vitals.a1c != null ||
      vitals.ldl != null ||
      vitals.hr != null ||
      vitals.spo2 != null);

  const decryptedHHMM = vitals ? shieldTime(vitals.decrypted_at) : '';

  return (
    <div style={PAGE_PAD}>
      {/* Risk score + vitals header */}
      <div
        style={{
          background:
            'linear-gradient(135deg, rgba(0,212,184,.10), rgba(128,96,204,.06))',
          border: '1px solid rgba(0,212,184,.2)',
          borderRadius: 16,
          padding: 16,
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
        }}
      >
        <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
          <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="36" cy="36" r={RING_R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
            <circle
              cx="36"
              cy="36"
              r={RING_R}
              fill="none"
              stroke={scoreColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${RING_C}`}
              strokeDashoffset={vitals ? offset : RING_C}
              style={{ transition: 'stroke-dashoffset 1.4s ease' }}
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div style={{ fontFamily: T, fontSize: 18, fontWeight: 600, color: scoreColor, lineHeight: 1 }}>
              {vitals ? score : '—'}
            </div>
            <div style={{ fontSize: 7, color: '#7a9bbf', textTransform: 'uppercase', letterSpacing: '.12em', marginTop: 2 }}>
              Score
            </div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#eef2f8', marginBottom: 2 }}>
            {vitals ? scoreLabel : 'Loading vitals...'}
          </div>
          <div style={{ fontSize: 11, color: '#7a9bbf', lineHeight: 1.5 }}>
            {vitalsErr
              ? `Vitals not available: ${vitalsErr}`
              : vitals?.updated_at
              ? `Last updated ${fmtTime(vitals.updated_at)}`
              : 'No labs entered yet'}
          </div>
        </div>
      </div>

      {/* Vitals row */}
      <div style={SECTION_LABEL}>Clinical Vitals</div>
      {anyVitalEntered ? (
        <div
          style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            scrollbarWidth: 'none',
            marginBottom: 16,
            paddingBottom: 4,
          }}
        >
          {vitalCells.map((v) => (
            <div
              key={v.label}
              style={{
                flexShrink: 0,
                background: CARD_BG,
                border: `1px solid ${statusColor(v.status)}30`,
                borderRadius: 12,
                padding: '11px 13px',
                minWidth: 96,
              }}
            >
              <div style={{ fontFamily: T, fontSize: 9, color: '#7a9bbf', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 4 }}>
                {v.label}
              </div>
              <div style={{ fontFamily: T, fontSize: 17, fontWeight: 600, color: statusColor(v.status) }}>
                {v.val}
              </div>
              <div style={{ fontSize: 9, color: '#7a9bbf', marginTop: 2 }}>{v.unit}</div>
              <div
                style={{
                  marginTop: 6,
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontFamily: T,
                  fontSize: 7.5,
                  padding: '2px 5px',
                  borderRadius: 5,
                  background: 'rgba(0,212,184,.12)',
                  color: '#00d4b8',
                  border: '1px solid rgba(0,212,184,.28)',
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
                title={`Decrypted ${vitals ? new Date(vitals.decrypted_at).toLocaleString() : ''}`}
              >
                Shield {decryptedHHMM}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            background: CARD_BG,
            border: CARD_BORDER,
            borderRadius: 14,
            padding: 18,
            marginBottom: 16,
            fontSize: 11,
            color: '#7a9bbf',
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          {vitals === null && !vitalsErr
            ? 'Loading vitals from CareIQ...'
            : 'No lab values on file. Vitals appear here after the patient enters them in CareIQ.'}
        </div>
      )}

      {/* Alerts list */}
      <div style={{ ...SECTION_LABEL, margin: '20px 0 10px' }}>Clinical alerts</div>
      {alertsErr && (
        <div
          style={{
            background: 'rgba(232,82,110,.08)',
            border: '1px solid rgba(232,82,110,.25)',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 11,
            color: '#e8526e',
            marginBottom: 12,
          }}
        >
          Could not load alerts: {alertsErr}
        </div>
      )}
      {alerts === null && !alertsErr && (
        <div style={{ fontSize: 11, color: '#7a9bbf', textAlign: 'center', padding: 18 }}>Loading alerts...</div>
      )}
      {alerts !== null && alerts.length === 0 && (
        <div
          style={{
            background: CARD_BG,
            border: CARD_BORDER,
            borderRadius: 12,
            padding: 18,
            textAlign: 'center',
            fontSize: 12,
            color: '#4ade80',
          }}
        >
          No clinical alerts on file. All monitored thresholds are within range.
        </div>
      )}
      {alerts &&
        alerts.map((a) => (
          <div
            key={a.id}
            style={{
              background:
                a.severity === 'critical'
                  ? 'rgba(232,82,110,.06)'
                  : 'rgba(212,168,67,.06)',
              borderLeft: `3px solid ${a.severity === 'critical' ? '#e8526e' : '#d4a843'}`,
              border: CARD_BORDER,
              borderRadius: 12,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#eef2f8' }}>{a.metric}</span>
              <span
                style={{
                  fontFamily: T,
                  fontSize: 8,
                  padding: '2px 8px',
                  borderRadius: 8,
                  background: a.severity === 'critical' ? 'rgba(232,82,110,.15)' : 'rgba(212,168,67,.15)',
                  color: a.severity === 'critical' ? '#e8526e' : '#d4a843',
                  border: `1px solid ${a.severity === 'critical' ? 'rgba(232,82,110,.3)' : 'rgba(212,168,67,.3)'}`,
                  textTransform: 'uppercase',
                  letterSpacing: '.1em',
                }}
              >
                {a.severity}
              </span>
            </div>
            <div style={{ fontFamily: T, fontSize: 9, color: '#7a9bbf', marginBottom: 4 }}>
              {fmtTime(a.fired_at)} · sent to {a.delivery_count} member{a.delivery_count === 1 ? '' : 's'}
            </div>
            <div style={{ fontSize: 11, color: '#eef2f8', lineHeight: 1.6 }}>{a.recommendation}</div>
          </div>
        ))}
    </div>
  );
}
