'use client';
import { useEffect, useState } from 'react';
import {
  sbAuthed,
  fmtTime,
  type CCSession,
  type AlertRow,
} from '@/lib/cc-data';
import { T, PAGE_PAD, SECTION_LABEL, CARD_BG, CARD_BORDER } from './ui';

export default function CareIQPage({ session }: { session: CCSession }) {
  const [alerts, setAlerts] = useState<AlertRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        if (cancelled) return;
        setAlerts(data);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session.access_token, session.patient_id]);

  return (
    <div style={PAGE_PAD}>
      <div style={SECTION_LABEL}>Clinical alerts (CareIQ)</div>
      <div style={{ background: CARD_BG, border: CARD_BORDER, borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#eef2f8', fontWeight: 600, marginBottom: 4 }}>
          Threshold breaches reported by CareIQ
        </div>
        <div style={{ fontSize: 11, color: '#7a9bbf', lineHeight: 1.55 }}>
          Each row is a metric whose value crossed a clinical threshold. Source: the patient&apos;s
          encrypted vitals are evaluated server-side; only metric, severity, and a recommendation
          are surfaced here. No raw values, no PHI.
        </div>
      </div>

      {error && (
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
          Could not load alerts: {error}
        </div>
      )}

      {alerts === null && !error && (
        <div style={{ fontSize: 11, color: '#7a9bbf', textAlign: 'center', padding: 24 }}>
          Loading alerts...
        </div>
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

      {alerts && alerts.length > 0 && (
        <>
          <div style={{ ...SECTION_LABEL, margin: '20px 0 10px' }}>
            {alerts.length} event{alerts.length === 1 ? '' : 's'}, newest first
          </div>
          {alerts.map((a) => (
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
                    background:
                      a.severity === 'critical'
                        ? 'rgba(232,82,110,.15)'
                        : 'rgba(212,168,67,.15)',
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
              <div style={{ fontSize: 11, color: '#eef2f8', lineHeight: 1.6 }}>
                {a.recommendation}
              </div>
            </div>
          ))}
        </>
      )}

      <div style={{ ...SECTION_LABEL, margin: '24px 0 10px' }}>Vitals, labs, protocols</div>
      <div
        style={{
          background: CARD_BG,
          border: CARD_BORDER,
          borderRadius: 14,
          padding: 18,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: '#eef2f8', marginBottom: 8 }}>
          Coming soon
        </div>
        <div style={{ fontSize: 11, color: '#7a9bbf', lineHeight: 1.6 }}>
          Real BP, A1C, LDL, HR, and SpO2 numbers are encrypted in CareIQ&apos;s health_history.
          Family-readable values require a CareIQ-side mirror table or a decrypted endpoint that
          authorizes against the family member&apos;s JWT. Not yet shipped.
        </div>
      </div>
    </div>
  );
}
