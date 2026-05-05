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

// ---------------------------------------------------------------------------
// Shield decrypt response shape. Mirrors /api/shield/decrypt on CareIQ.
// ---------------------------------------------------------------------------
interface ShieldPayload {
  patient_id: string;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  a1c: number | null;
  ldl: number | null;
  hdl: number | null;
  total_cholesterol: number | null;
  fasting_glucose: number | null;
  triglycerides: number | null;
  egfr: number | null;
  crp: number | null;
  hr: number | null;
  steps: number | null;
  spo2: number | null;
  sleep_hours: number | null;
  hrv: number | null;
  active_calories: number | null;
  calories: number | null;
  risk_score: number;
  risk_label: string;
  panel_grade: string;
  panel_flagged: number;
  panel_in_range: number;
  updated_at: string | null;
  decrypted_at: string;
  shield_version: string;
}

// ---------------------------------------------------------------------------
// Color tokens. Mirrors CareIQ Health tab palette so the two surfaces feel
// identical even though the underlying numbers come through the Shield.
// ---------------------------------------------------------------------------
const OK = '#00d4b8';
const WARN = '#d4a843';
const ALERT = '#e8526e';
const PURPLE = '#8060cc';
const GREEN = '#4ade80';

type Status = 'ok' | 'warn' | 'alert' | 'none';
const statusColor = (s: Status): string =>
  s === 'alert' ? ALERT : s === 'warn' ? WARN : s === 'ok' ? OK : '#7a9bbf';

// ---------------------------------------------------------------------------
// Lab spec table. Each entry drives the range bar (zones) + status logic for
// one panel value. Zones must be contiguous and cover [min, max].
// ---------------------------------------------------------------------------
interface LabZone {
  from: number;
  to: number;
  status: Status;
}
interface LabSpec {
  label: string;
  unit: string;
  min: number;
  max: number;
  zones: LabZone[];
  precision: number;
}

const LAB_SPECS: Record<string, LabSpec> = {
  a1c: {
    label: 'A1C',
    unit: '%',
    min: 4,
    max: 10,
    precision: 1,
    zones: [
      { from: 4, to: 5.7, status: 'ok' },
      { from: 5.7, to: 6.5, status: 'warn' },
      { from: 6.5, to: 10, status: 'alert' },
    ],
  },
  ldl: {
    label: 'LDL',
    unit: 'mg/dL',
    min: 50,
    max: 250,
    precision: 0,
    zones: [
      { from: 50, to: 130, status: 'ok' },
      { from: 130, to: 190, status: 'warn' },
      { from: 190, to: 250, status: 'alert' },
    ],
  },
  hdl: {
    label: 'HDL',
    unit: 'mg/dL',
    min: 20,
    max: 100,
    precision: 0,
    zones: [
      { from: 20, to: 30, status: 'alert' },
      { from: 30, to: 40, status: 'warn' },
      { from: 40, to: 100, status: 'ok' },
    ],
  },
  total_cholesterol: {
    label: 'Total Cholesterol',
    unit: 'mg/dL',
    min: 100,
    max: 320,
    precision: 0,
    zones: [
      { from: 100, to: 200, status: 'ok' },
      { from: 200, to: 240, status: 'warn' },
      { from: 240, to: 320, status: 'alert' },
    ],
  },
  fasting_glucose: {
    label: 'Fasting Glucose',
    unit: 'mg/dL',
    min: 60,
    max: 200,
    precision: 0,
    zones: [
      { from: 60, to: 100, status: 'ok' },
      { from: 100, to: 126, status: 'warn' },
      { from: 126, to: 200, status: 'alert' },
    ],
  },
  triglycerides: {
    label: 'Triglycerides',
    unit: 'mg/dL',
    min: 50,
    max: 400,
    precision: 0,
    zones: [
      { from: 50, to: 150, status: 'ok' },
      { from: 150, to: 200, status: 'warn' },
      { from: 200, to: 400, status: 'alert' },
    ],
  },
  egfr: {
    label: 'eGFR',
    unit: 'mL/min',
    min: 0,
    max: 120,
    precision: 0,
    zones: [
      { from: 0, to: 60, status: 'alert' },
      { from: 60, to: 90, status: 'warn' },
      { from: 90, to: 120, status: 'ok' },
    ],
  },
  crp: {
    label: 'CRP',
    unit: 'mg/L',
    min: 0,
    max: 10,
    precision: 1,
    zones: [
      { from: 0, to: 1, status: 'ok' },
      { from: 1, to: 3, status: 'warn' },
      { from: 3, to: 10, status: 'alert' },
    ],
  },
};

function valueStatus(spec: LabSpec, value: number): Status {
  for (const z of spec.zones) {
    if (value >= z.from && value < z.to) return z.status;
  }
  // Past max: clamp to last zone status.
  return spec.zones[spec.zones.length - 1].status;
}

// ---------------------------------------------------------------------------
// Vitals chip status helpers (top vitals row).
// ---------------------------------------------------------------------------
function bpStatus(sys: number | null, dia: number | null): Status {
  if (sys === null && dia === null) return 'none';
  if ((sys ?? 0) >= 140 || (dia ?? 0) >= 90) return 'alert';
  if ((sys ?? 0) >= 130 || (dia ?? 0) >= 80) return 'warn';
  return 'ok';
}
function hrStatus(v: number | null): Status {
  if (v === null) return 'none';
  if (v < 50 || v > 100) return 'alert';
  if (v < 55 || v > 95) return 'warn';
  return 'ok';
}
function spo2Status(v: number | null): Status {
  if (v === null) return 'none';
  if (v < 90) return 'alert';
  if (v < 95) return 'warn';
  return 'ok';
}
function sleepStatus(v: number | null): Status {
  if (v === null) return 'none';
  if (v < 6 || v > 10) return 'alert';
  if (v < 7 || v > 9) return 'warn';
  return 'ok';
}
function stepsStatus(v: number | null): Status {
  if (v === null) return 'none';
  if (v < 4000) return 'alert';
  if (v < 7000) return 'warn';
  return 'ok';
}

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

function gradeColor(grade: string): string {
  if (grade === 'A') return OK;
  if (grade === 'B') return GREEN;
  if (grade === 'C') return WARN;
  if (grade === 'D' || grade === 'F') return ALERT;
  return '#7a9bbf';
}

function riskColor(score: number): string {
  if (score >= 75) return GREEN;
  if (score >= 55) return WARN;
  return ALERT;
}

// ---------------------------------------------------------------------------
// Visual primitives.
// ---------------------------------------------------------------------------

function ShieldBadge({ decryptedAt }: { decryptedAt: string }) {
  const hhmm = shieldTime(decryptedAt);
  return (
    <div
      title={`Decrypted ${new Date(decryptedAt).toLocaleString()}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: T,
        fontSize: 7.5,
        padding: '2px 5px',
        borderRadius: 5,
        background: 'rgba(0,212,184,.12)',
        color: OK,
        border: '1px solid rgba(0,212,184,.28)',
        letterSpacing: '.08em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      Shield {hhmm}
    </div>
  );
}

function RangeBar({
  spec,
  value,
}: {
  spec: LabSpec;
  value: number;
}) {
  const pct = (n: number) =>
    Math.max(0, Math.min(100, ((n - spec.min) / (spec.max - spec.min)) * 100));
  const markerPct = pct(value);
  return (
    <div
      style={{
        position: 'relative',
        height: 6,
        borderRadius: 3,
        overflow: 'visible',
        background: 'rgba(255,255,255,.04)',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: 3,
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        {spec.zones.map((z, i) => {
          const w = pct(z.to) - pct(z.from);
          return (
            <div
              key={i}
              style={{
                width: `${w}%`,
                background:
                  z.status === 'ok'
                    ? 'rgba(0,212,184,.35)'
                    : z.status === 'warn'
                    ? 'rgba(212,168,67,.35)'
                    : 'rgba(232,82,110,.35)',
              }}
            />
          );
        })}
      </div>
      {/* Marker line at the patient's value */}
      <div
        style={{
          position: 'absolute',
          left: `${markerPct}%`,
          top: -3,
          bottom: -3,
          width: 2,
          background: '#eef2f8',
          borderRadius: 1,
          transform: 'translateX(-1px)',
          boxShadow: '0 0 6px rgba(238,242,248,.6)',
        }}
      />
    </div>
  );
}

function LabRow({
  specKey,
  value,
  decryptedAt,
}: {
  specKey: keyof typeof LAB_SPECS;
  value: number;
  decryptedAt: string;
}) {
  const spec = LAB_SPECS[specKey];
  const status = valueStatus(spec, value);
  const valStr = value.toFixed(spec.precision);
  return (
    <div
      style={{
        background: CARD_BG,
        border: CARD_BORDER,
        borderRadius: 12,
        padding: '12px 14px',
        marginBottom: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontFamily: T,
            fontSize: 9,
            color: '#7a9bbf',
            textTransform: 'uppercase',
            letterSpacing: '.14em',
          }}
        >
          {spec.label}
        </div>
        <div
          style={{
            fontFamily: T,
            fontSize: 17,
            fontWeight: 600,
            color: statusColor(status),
          }}
        >
          {valStr}
          <span
            style={{
              fontSize: 10,
              fontWeight: 400,
              color: '#7a9bbf',
              marginLeft: 4,
            }}
          >
            {spec.unit}
          </span>
        </div>
      </div>
      <RangeBar spec={spec} value={value} />
      <div style={{ marginTop: 10 }}>
        <ShieldBadge decryptedAt={decryptedAt} />
      </div>
    </div>
  );
}

function WearableTile({
  label,
  value,
  unit,
  status,
  decryptedAt,
}: {
  label: string;
  value: string;
  unit: string;
  status: Status;
  decryptedAt: string;
}) {
  return (
    <div
      style={{
        background: CARD_BG,
        border: `1px solid ${statusColor(status)}30`,
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div
        style={{
          fontFamily: T,
          fontSize: 9,
          color: '#7a9bbf',
          textTransform: 'uppercase',
          letterSpacing: '.12em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: T,
          fontSize: 19,
          fontWeight: 600,
          color: statusColor(status),
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 9, color: '#7a9bbf', marginTop: 2 }}>{unit}</div>
      <div style={{ marginTop: 8 }}>
        <ShieldBadge decryptedAt={decryptedAt} />
      </div>
    </div>
  );
}

function VitalChip({
  label,
  val,
  unit,
  status,
  decryptedAt,
}: {
  label: string;
  val: string;
  unit: string;
  status: Status;
  decryptedAt: string;
}) {
  return (
    <div
      style={{
        flexShrink: 0,
        background: CARD_BG,
        border: `1px solid ${statusColor(status)}30`,
        borderRadius: 12,
        padding: '11px 13px',
        minWidth: 96,
      }}
    >
      <div
        style={{
          fontFamily: T,
          fontSize: 9,
          color: '#7a9bbf',
          textTransform: 'uppercase',
          letterSpacing: '.12em',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: T,
          fontSize: 17,
          fontWeight: 600,
          color: statusColor(status),
        }}
      >
        {val}
      </div>
      <div style={{ fontSize: 9, color: '#7a9bbf', marginTop: 2 }}>{unit}</div>
      <div style={{ marginTop: 6 }}>
        <ShieldBadge decryptedAt={decryptedAt} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Risk ring: matches CareIQ's gradient (teal -> purple) and animated stroke.
// ---------------------------------------------------------------------------
const RING_R = 37;
const RING_C = 2 * Math.PI * RING_R;

function RiskRing({ score, loaded }: { score: number; loaded: boolean }) {
  const offset = RING_C * (1 - score / 100);
  const stroke = riskColor(score);
  return (
    <div style={{ position: 'relative', width: 92, height: 92, flexShrink: 0 }}>
      <svg width="92" height="92" viewBox="0 0 92 92" style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id="cc-rg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={OK} />
            <stop offset="100%" stopColor={PURPLE} />
          </linearGradient>
        </defs>
        <circle cx="46" cy="46" r={RING_R} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
        <circle
          cx="46"
          cy="46"
          r={RING_R}
          fill="none"
          stroke="url(#cc-rg)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${RING_C}`}
          strokeDashoffset={loaded ? offset : RING_C}
          style={{ transition: 'stroke-dashoffset 1.6s cubic-bezier(.2,.8,.2,1)' }}
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
        <div
          style={{
            fontFamily: T,
            fontSize: 24,
            fontWeight: 600,
            color: stroke,
            lineHeight: 1,
          }}
        >
          {loaded ? score : ''}
        </div>
        <div
          style={{
            fontSize: 7,
            color: '#7a9bbf',
            textTransform: 'uppercase',
            letterSpacing: '.18em',
            marginTop: 3,
          }}
        >
          Score
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export default function CareIQPage({ session }: { session: CCSession }) {
  const [payload, setPayload] = useState<ShieldPayload | null>(null);
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
        const data = (await r.json().catch(() => ({}))) as Partial<ShieldPayload> & {
          error?: string;
        };
        if (!r.ok) {
          if (!cancelled) setVitalsErr(data.error || `vitals ${r.status}`);
          return;
        }
        if (!cancelled) setPayload(data as ShieldPayload);
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

  const loaded = payload !== null;
  const score = payload?.risk_score ?? 0;
  const decryptedAt = payload?.decrypted_at ?? new Date().toISOString();

  // Top vitals chips. We only render a chip when a real value is present.
  const vitalChips: { label: string; val: string; unit: string; status: Status }[] = [];
  if (payload) {
    if (payload.bp_systolic !== null && payload.bp_diastolic !== null) {
      vitalChips.push({
        label: 'BP',
        val: `${payload.bp_systolic}/${payload.bp_diastolic}`,
        unit: 'mmHg',
        status: bpStatus(payload.bp_systolic, payload.bp_diastolic),
      });
    }
    if (payload.a1c !== null) {
      vitalChips.push({
        label: 'A1C',
        val: payload.a1c.toFixed(1),
        unit: '%',
        status: valueStatus(LAB_SPECS.a1c, payload.a1c),
      });
    }
    if (payload.ldl !== null) {
      vitalChips.push({
        label: 'LDL',
        val: String(Math.round(payload.ldl)),
        unit: 'mg/dL',
        status: valueStatus(LAB_SPECS.ldl, payload.ldl),
      });
    }
    if (payload.hr !== null) {
      vitalChips.push({
        label: 'HR',
        val: String(payload.hr),
        unit: 'bpm',
        status: hrStatus(payload.hr),
      });
    }
    if (payload.spo2 !== null) {
      vitalChips.push({
        label: 'SpO2',
        val: String(payload.spo2),
        unit: '%',
        status: spo2Status(payload.spo2),
      });
    }
  }

  // Full blood panel rows in the order CareIQ presents them.
  const bloodPanelRows: { specKey: keyof typeof LAB_SPECS; value: number }[] = [];
  if (payload) {
    if (payload.ldl !== null) bloodPanelRows.push({ specKey: 'ldl', value: payload.ldl });
    if (payload.total_cholesterol !== null)
      bloodPanelRows.push({ specKey: 'total_cholesterol', value: payload.total_cholesterol });
    if (payload.hdl !== null) bloodPanelRows.push({ specKey: 'hdl', value: payload.hdl });
    if (payload.a1c !== null) bloodPanelRows.push({ specKey: 'a1c', value: payload.a1c });
    if (payload.fasting_glucose !== null)
      bloodPanelRows.push({ specKey: 'fasting_glucose', value: payload.fasting_glucose });
    if (payload.egfr !== null) bloodPanelRows.push({ specKey: 'egfr', value: payload.egfr });
    if (payload.crp !== null) bloodPanelRows.push({ specKey: 'crp', value: payload.crp });
    if (payload.triglycerides !== null)
      bloodPanelRows.push({ specKey: 'triglycerides', value: payload.triglycerides });
  }

  // Wearable tiles, only if a real value is present.
  const wearableTiles: { label: string; value: string; unit: string; status: Status }[] = [];
  if (payload) {
    if (payload.hr !== null) {
      wearableTiles.push({
        label: 'Heart Rate',
        value: String(payload.hr),
        unit: 'bpm',
        status: hrStatus(payload.hr),
      });
    }
    if (payload.steps !== null) {
      wearableTiles.push({
        label: 'Steps',
        value: payload.steps.toLocaleString(),
        unit: 'today',
        status: stepsStatus(payload.steps),
      });
    }
    if (payload.spo2 !== null) {
      wearableTiles.push({
        label: 'SpO2',
        value: String(payload.spo2),
        unit: '%',
        status: spo2Status(payload.spo2),
      });
    }
    if (payload.sleep_hours !== null) {
      wearableTiles.push({
        label: 'Sleep',
        value: payload.sleep_hours.toFixed(1),
        unit: 'hours',
        status: sleepStatus(payload.sleep_hours),
      });
    }
    if (payload.hrv !== null) {
      wearableTiles.push({
        label: 'HRV',
        value: String(Math.round(payload.hrv)),
        unit: 'ms',
        status: 'ok',
      });
    }
    if (payload.active_calories !== null) {
      wearableTiles.push({
        label: 'Active Calories',
        value: String(Math.round(payload.active_calories)),
        unit: 'kcal',
        status: 'ok',
      });
    }
  }

  return (
    <div style={PAGE_PAD}>
      {/* Risk score header card */}
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
        <RiskRing score={score} loaded={loaded} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 18,
              color: '#eef2f8',
              marginBottom: 4,
            }}
          >
            {loaded ? payload!.risk_label : 'Loading vitals...'}
          </div>
          <div style={{ fontSize: 11, color: '#7a9bbf', lineHeight: 1.5, marginBottom: 6 }}>
            {vitalsErr
              ? `Vitals not available: ${vitalsErr}`
              : payload?.updated_at
              ? `Last updated ${fmtTime(payload.updated_at)}`
              : 'No labs entered yet'}
          </div>
          {loaded && <ShieldBadge decryptedAt={decryptedAt} />}
        </div>
      </div>

      {/* Panel summary card */}
      {loaded && (payload!.panel_in_range > 0 || payload!.panel_flagged > 0) && (
        <div
          style={{
            background: CARD_BG,
            border: CARD_BORDER,
            borderRadius: 14,
            padding: 14,
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <div
            style={{
              flexShrink: 0,
              width: 56,
              height: 56,
              borderRadius: 14,
              background: `${gradeColor(payload!.panel_grade)}20`,
              border: `1px solid ${gradeColor(payload!.panel_grade)}55`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: T,
              fontSize: 26,
              fontWeight: 700,
              color: gradeColor(payload!.panel_grade),
            }}
          >
            {payload!.panel_grade}
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: T,
                fontSize: 9,
                color: '#7a9bbf',
                textTransform: 'uppercase',
                letterSpacing: '.14em',
                marginBottom: 4,
              }}
            >
              Panel grade
            </div>
            <div style={{ display: 'flex', gap: 14, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <div>
                <span
                  style={{
                    fontFamily: T,
                    fontSize: 17,
                    fontWeight: 600,
                    color: ALERT,
                  }}
                >
                  {payload!.panel_flagged}
                </span>{' '}
                <span style={{ fontSize: 10, color: '#7a9bbf' }}>flagged</span>
              </div>
              <div>
                <span
                  style={{
                    fontFamily: T,
                    fontSize: 17,
                    fontWeight: 600,
                    color: OK,
                  }}
                >
                  {payload!.panel_in_range}
                </span>{' '}
                <span style={{ fontSize: 10, color: '#7a9bbf' }}>in range</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Vitals chip row */}
      {vitalChips.length > 0 && (
        <>
          <div style={SECTION_LABEL}>Vitals</div>
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
            {vitalChips.map((v) => (
              <VitalChip key={v.label} {...v} decryptedAt={decryptedAt} />
            ))}
          </div>
        </>
      )}

      {/* Full blood panel section */}
      {bloodPanelRows.length > 0 && (
        <>
          <div style={{ ...SECTION_LABEL, margin: '20px 0 10px' }}>Full Blood Panel</div>
          {bloodPanelRows.map((r) => (
            <LabRow
              key={r.specKey}
              specKey={r.specKey}
              value={r.value}
              decryptedAt={decryptedAt}
            />
          ))}
        </>
      )}

      {/* Wearable metrics section */}
      {wearableTiles.length > 0 && (
        <>
          <div style={{ ...SECTION_LABEL, margin: '20px 0 10px' }}>Wearable Metrics</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8,
              marginBottom: 16,
            }}
          >
            {wearableTiles.map((t) => (
              <WearableTile key={t.label} {...t} decryptedAt={decryptedAt} />
            ))}
          </div>
        </>
      )}

      {/* No data message */}
      {loaded && bloodPanelRows.length === 0 && wearableTiles.length === 0 && !vitalsErr && (
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
          No lab values or wearable data on file. Numbers appear here after the patient enters labs in CareIQ or syncs a wearable.
        </div>
      )}

      {/* Clinical alerts */}
      <div style={{ ...SECTION_LABEL, margin: '20px 0 10px' }}>Clinical alerts</div>
      {alertsErr && (
        <div
          style={{
            background: 'rgba(232,82,110,.08)',
            border: '1px solid rgba(232,82,110,.25)',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 11,
            color: ALERT,
            marginBottom: 12,
          }}
        >
          Could not load alerts: {alertsErr}
        </div>
      )}
      {alerts === null && !alertsErr && (
        <div style={{ fontSize: 11, color: '#7a9bbf', textAlign: 'center', padding: 18 }}>
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
            color: GREEN,
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
              borderLeft: `3px solid ${a.severity === 'critical' ? ALERT : WARN}`,
              border: CARD_BORDER,
              borderRadius: 12,
              padding: 12,
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: '#eef2f8' }}>{a.metric}</span>
              <span
                style={{
                  fontFamily: T,
                  fontSize: 8,
                  padding: '2px 8px',
                  borderRadius: 8,
                  background:
                    a.severity === 'critical' ? 'rgba(232,82,110,.15)' : 'rgba(212,168,67,.15)',
                  color: a.severity === 'critical' ? ALERT : WARN,
                  border: `1px solid ${
                    a.severity === 'critical' ? 'rgba(232,82,110,.3)' : 'rgba(212,168,67,.3)'
                  }`,
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
