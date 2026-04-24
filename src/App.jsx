import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Home, Pill, Calendar, CheckSquare, FolderLock, Bot, Activity,
  Bell, Plus, Check, Clock, User, Send, Phone, Heart, X,
  Upload, ChevronRight, Shield, AlertCircle, Settings, ArrowLeft,
  Stethoscope, TrendingUp, AlertTriangle, CheckCircle
} from 'lucide-react'
import { load, save } from './storage'
import { requestPermission, scheduleMedReminders, sendNotification } from './notifications'
import {
  FAMILY_MEMBERS, DEFAULT_MEDS, DEFAULT_APPOINTMENTS, DEFAULT_TASKS,
  DOCUMENTS, EMERGENCY_CONTACTS, AI_SUGGESTIONS, FEED_ITEMS, AI_RESPONSES
} from './data'
import './App.css'

// ─── Helper ───
const getMember = (id) => FAMILY_MEMBERS.find(m => m.id === id)

// ─── CareIQ FQHC Data for Dorothy ───
const CAREIQ_DATA = {
  patient: {
    name: 'Dorothy M.',
    id: 'CIQ-2026-00089',
    fqhc: 'Riverside Community Health Center',
    provider: 'Dr. Maria Santos, MD',
    nextVisit: 'Apr 28, 2026',
    score: 62,
    risk: 'Moderate',
    trend: '+4.1% since last visit',
  },
  vitals: [
    { icon: '❤️', val: '142/88', unit: 'mmHg', name: 'Blood Pressure', status: 'warn' },
    { icon: '🩸', val: '7.1', unit: 'A1C %', name: 'Glycemic', status: 'warn' },
    { icon: '🔬', val: '198', unit: 'mg/dL', name: 'LDL Chol.', status: 'warn' },
    { icon: '⚡', val: '74', unit: 'bpm', name: 'Heart Rate', status: 'ok' },
  ],
  domains: [
    { name: 'Cardiovascular', score: 62, icon: '❤️' },
    { name: 'Metabolic', score: 58, icon: '🔬' },
    { name: 'Renal', score: 74, icon: '💧' },
    { name: 'Mental Health', score: 78, icon: '🧠' },
  ],
  gaps: [
    { icon: '👁', text: 'Retinal eye exam overdue 14 months', priority: 'critical', id: 1 },
    { icon: '🫀', text: 'Blood pressure follow-up within 2 weeks', priority: 'critical', id: 2 },
    { icon: '🩺', text: 'Podiatry referral for diabetic foot exam', priority: 'moderate', id: 3 },
    { icon: '💉', text: 'Flu vaccination not on record this season', priority: 'routine', id: 4 },
  ],
  insights: [
    {
      type: 'crit',
      icon: '⚠️',
      title: 'LDL Elevated — Cardiovascular Risk',
      body: "Dorothy's LDL of 198 mg/dL significantly elevates 10-year cardiovascular risk. CareIQ recommends statin evaluation and dietary protocol within 14 days. Share this with the family care team.",
      conf: '94%',
    },
    {
      type: 'watch',
      icon: '📈',
      title: 'A1C Trending — Monitor Closely',
      body: "A1C at 7.1% is within management range but has increased from 6.8% at last visit. CareIQ flags this for attention. Ensure Dorothy's Metformin schedule is being followed consistently.",
      conf: '89%',
    },
    {
      type: 'pos',
      icon: '✅',
      title: 'Blood Pressure Medication Adherence',
      body: "CareCircle medication logs show Lisinopril adherence at 91% this month. This is directly contributing to cardiovascular stability. Keep up the great coordination.",
      conf: '97%',
    },
  ],
  protocols: [
    { name: 'Diabetes Management', pct: 45, color: '#E07A5F', detail: 'A1C target 6.5% — Week 8 of 18' },
    { name: 'Cardiovascular Defense', pct: 32, color: '#D64045', detail: 'LDL target <170 mg/dL' },
    { name: 'Blood Pressure Control', pct: 67, color: '#5B8FA8', detail: 'Target <130/80 — Improving' },
  ],
  sharedFromFamily: [
    { icon: '💊', label: 'Medications Logged Today', val: '2 of 4', color: '#81B29A' },
    { icon: '📅', label: 'Next Family Appointment', val: 'Apr 3 — Cardiology', color: '#5B8FA8' },
    { icon: '✅', label: 'Open Care Tasks', val: '5 pending', color: '#E07A5F' },
    { icon: '👨‍👩‍👦', label: 'Active Caregivers', val: 'Matt, Sarah, James', color: '#8B7EC8' },
  ],
}

// ─── Shield Hash ───
async function shieldHash(text) {
  try {
    const enc = new TextEncoder()
    const buf = await window.crypto.subtle.digest('SHA-256', enc.encode(text + 'CIQ-CAREIQ-SHIELD-2026'))
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16).toUpperCase()
  } catch { return 'SHIELD-ACTIVE' }
}

// ══════════════════════════════════════════
// CAREIQ TAB — FQHC EDITION
// ══════════════════════════════════════════

function CareIQPage() {
  const [tab, setTab] = useState('overview')
  const [shieldActive, setShieldActive] = useState(false)
  const [shieldHash_, setShieldHash_] = useState('')

  useEffect(() => {
    shieldHash('Dorothy M. CIQ-2026-00089').then(h => {
      setShieldHash_(h)
      setShieldActive(true)
    })
  }, [])

  const scoreColor = (s) => s >= 75 ? '#81B29A' : s >= 55 ? '#F2CC8F' : '#E07A5F'
  const riskBadgeStyle = (r) => r === 'critical'
    ? { background: '#FDEAEA', color: '#D64045', border: '1px solid #D6404540' }
    : r === 'moderate'
    ? { background: '#FDF6EA', color: '#C89020', border: '1px solid #C8902040' }
    : { background: '#EDF7F1', color: '#81B29A', border: '1px solid #81B29A40' }

  return (
    <div className="page-content">

      {/* CareIQ Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0C1520, #112240)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        border: '1px solid rgba(0,212,184,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#00d4b8,#8060cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⊕</div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: '#E0BC40' }}>CareIQ</div>
                <div style={{ fontSize: 9, color: '#00d4b8', letterSpacing: '0.15em', textTransform: 'uppercase', fontFamily: 'monospace' }}>FQHC Clinical Connection</div>
              </div>
            </div>
          </div>
          {shieldActive && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 20, padding: '3px 8px' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
              <span style={{ fontSize: 8, color: '#4ade80', fontFamily: 'monospace', letterSpacing: '0.1em' }}>SHIELD ON</span>
            </div>
          )}
        </div>

        {/* Patient ID */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#eef2f8' }}>{CAREIQ_DATA.patient.name}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#7a9bbf', marginTop: 1 }}>{CAREIQ_DATA.patient.id}</div>
            <div style={{ fontSize: 10, color: '#7a9bbf', marginTop: 2 }}>{CAREIQ_DATA.patient.fqhc}</div>
          </div>
          {/* Score Ring */}
          <div style={{ position: 'relative', width: 64, height: 64 }}>
            <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
              <circle cx="32" cy="32" r="26" fill="none" stroke="url(#ciqGrad)" strokeWidth="5"
                strokeLinecap="round" strokeDasharray="163.4"
                strokeDashoffset={163.4 * (1 - CAREIQ_DATA.patient.score / 100)} />
              <defs>
                <linearGradient id="ciqGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00d4b8" />
                  <stop offset="100%" stopColor="#8060cc" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 18, fontWeight: 600, color: '#00d4b8', lineHeight: 1 }}>{CAREIQ_DATA.patient.score}</div>
              <div style={{ fontSize: 7, color: '#7a9bbf', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Score</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 11, color: '#eef2f8', fontWeight: 600 }}>{CAREIQ_DATA.patient.risk} Risk</div>
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#00d4b8', background: 'rgba(0,212,184,0.1)', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(0,212,184,0.2)' }}>↑ {CAREIQ_DATA.patient.trend}</div>
        </div>
      </div>

      {/* Sub Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'gaps', label: 'Care Gaps' },
          { id: 'insights', label: 'AI Insights' },
          { id: 'shared', label: 'Family Data' },
          { id: 'shield', label: '🔒 Shield' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontSize: 11, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s',
            background: tab === t.id ? '#112240' : 'var(--bg-card)',
            color: tab === t.id ? '#00d4b8' : 'var(--text-secondary)',
            border: tab === t.id ? '1px solid rgba(0,212,184,0.4)' : '1px solid var(--border)',
          }}>{t.label}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <>
          {/* Vitals */}
          <div className="section-header">
            <span className="section-title">Clinical Vitals</span>
            <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#7a9bbf' }}>From {CAREIQ_DATA.patient.fqhc}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, scrollbarWidth: 'none' }}>
            {CAREIQ_DATA.vitals.map((v, i) => (
              <div key={i} style={{ flexShrink: 0, background: '#0C1520', border: '1px solid rgba(0,212,184,0.14)', borderRadius: 14, padding: '10px 14px', minWidth: 88 }}>
                <div style={{ fontSize: 14, marginBottom: 4 }}>{v.icon}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 500, color: v.status === 'ok' ? '#00d4b8' : v.status === 'warn' ? '#d4a843' : '#e8526e' }}>{v.val}</div>
                <div style={{ fontSize: 8, color: '#7a9bbf' }}>{v.unit}</div>
                <div style={{ fontSize: 9, color: '#7a9bbf', marginTop: 2 }}>{v.name}</div>
              </div>
            ))}
          </div>

          {/* Risk Domains */}
          <div className="section-header">
            <span className="section-title">Risk Domains</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {CAREIQ_DATA.domains.map((d, i) => (
              <div key={i} style={{ background: '#0C1520', border: '1px solid rgba(0,212,184,0.14)', borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 10, color: '#7a9bbf', marginBottom: 8 }}>{d.icon} {d.name}</div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, marginBottom: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${d.score}%`, background: `linear-gradient(90deg,${scoreColor(d.score)},${scoreColor(d.score)}88)`, borderRadius: 2 }} />
                </div>
                <div style={{ fontFamily: 'monospace', fontSize: 17, fontWeight: 500, color: scoreColor(d.score) }}>{d.score}<span style={{ fontSize: 10, color: '#7a9bbf' }}>/100</span></div>
              </div>
            ))}
          </div>

          {/* Active Protocols */}
          <div className="section-header">
            <span className="section-title">Active FQHC Protocols</span>
          </div>
          {CAREIQ_DATA.protocols.map((p, i) => (
            <div key={i} className="card" style={{ background: '#0C1520', border: '1px solid rgba(0,212,184,0.14)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#eef2f8' }}>{p.name}</span>
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: p.color, background: `${p.color}18`, padding: '2px 8px', borderRadius: 8, border: `1px solid ${p.color}40` }}>{p.pct}%</span>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${p.pct}%`, background: `linear-gradient(90deg,${p.color},${p.color}88)`, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 10, color: '#7a9bbf' }}>{p.detail}</div>
            </div>
          ))}

          {/* Next Appointment */}
          <div className="card" style={{ background: '#0C1520', border: '1px solid rgba(0,212,184,0.14)', marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(0,212,184,0.1)', border: '1px solid rgba(0,212,184,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏥</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#eef2f8' }}>{CAREIQ_DATA.patient.provider}</div>
                <div style={{ fontSize: 10, color: '#7a9bbf', marginTop: 2 }}>Next visit: {CAREIQ_DATA.patient.nextVisit}</div>
                <div style={{ fontSize: 10, color: '#00d4b8', marginTop: 2 }}>{CAREIQ_DATA.patient.fqhc}</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* CARE GAPS */}
      {tab === 'gaps' && (
        <>
          <div style={{ background: '#FDEAEA', border: '1px solid #D6404530', borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14} color="#D64045" />
            <span style={{ fontSize: 12, color: '#D64045', fontWeight: 500 }}>{CAREIQ_DATA.gaps.filter(g => g.priority === 'critical').length} critical gaps need attention from the family care team</span>
          </div>
          {CAREIQ_DATA.gaps.map((gap) => (
            <div key={gap.id} className="card" style={{ borderLeft: `3px solid ${gap.priority === 'critical' ? '#D64045' : gap.priority === 'moderate' ? '#C89020' : '#81B29A'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{gap.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 6 }}>{gap.text}</div>
                  <span style={{ ...riskBadgeStyle(gap.priority), fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 8, fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                    {gap.priority.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 8, padding: '10px 14px', background: 'var(--bg-warm)', borderRadius: 12, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            💡 These gaps are shared directly from Dorothy's FQHC. Your family care tasks can help close them. Tap the Tasks tab to assign gap-related actions to family members.
          </div>
        </>
      )}

      {/* AI INSIGHTS */}
      {tab === 'insights' && (
        <>
          <div style={{ marginBottom: 14, padding: '10px 14px', background: '#0C1520', border: '1px solid rgba(0,212,184,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🧬</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#eef2f8' }}>CareIQ Clinical Intelligence</div>
              <div style={{ fontSize: 9, color: '#7a9bbf', fontFamily: 'monospace', marginTop: 1 }}>Insights shared from {CAREIQ_DATA.patient.fqhc} · Shield Protected</div>
            </div>
          </div>
          {CAREIQ_DATA.insights.map((ins, i) => (
            <div key={i} style={{
              borderRadius: 14, padding: 14, marginBottom: 10,
              borderLeft: `3px solid ${ins.type === 'crit' ? '#D64045' : ins.type === 'watch' ? '#C89020' : '#81B29A'}`,
              background: ins.type === 'crit' ? '#FFF8F8' : ins.type === 'watch' ? '#FFFBF0' : '#F0FBF5',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{ins.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{ins.title}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 8 }}>{ins.body}</div>
              <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'var(--text-muted)' }}>AI Confidence: {ins.conf}</div>
            </div>
          ))}
        </>
      )}

      {/* FAMILY DATA SHARED WITH FQHC */}
      {tab === 'shared' && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>What Your Family Shares with the FQHC</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>The following CareCircle data is shared with Dorothy's care team at Riverside Community Health. All data is Shield-protected before transmission.</div>
          </div>
          {CAREIQ_DATA.sharedFromFamily.map((item, i) => (
            <div key={i} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}18`, border: `1px solid ${item.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginTop: 2 }}>{item.val}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 20, padding: '2px 8px' }}>
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#4ade80' }} />
                  <span style={{ fontSize: 8, color: '#4ade80', fontFamily: 'monospace' }}>SHARED</span>
                </div>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 8, padding: '10px 14px', background: 'var(--bg-warm)', borderRadius: 12, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            🔒 Medication names, diagnoses, and personal identifiers are hashed by Sovereign Shield before leaving this device. The FQHC receives protected clinical summaries, never raw family data.
          </div>
        </>
      )}

      {/* SHIELD TAB */}
      {tab === 'shield' && (
        <>
          <div style={{ background: '#0C1520', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 16, padding: 16, marginBottom: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>⬡</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#4ade80', marginBottom: 6, fontFamily: 'monospace', letterSpacing: '0.1em' }}>SOVEREIGN SHIELD ACTIVE</div>
            <div style={{ fontSize: 11, color: '#7a9bbf', lineHeight: 1.7 }}>Dorothy's health data is protected by zero-knowledge cryptography. Sensitive identifiers are hashed at this device before any data reaches the CareIQ clinical system.</div>
          </div>
          <div className="card" style={{ background: '#0C1520', border: '1px solid rgba(0,212,184,0.14)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#eef2f8', marginBottom: 12 }}>Active Hash — Dorothy's Session</div>
            {[
              ['Patient Name', 'Dorothy M.', `ZK:${shieldHash_.substring(0, 8)}`],
              ['Patient ID', 'CIQ-2026-00089', `ZK:${shieldHash_.substring(8, 16)}`],
              ['Diagnosis', 'Type 2 Diabetes', 'ZK:D8B2E417'],
              ['Medications', 'Metformin, Lisinopril', 'ZK:C1A9F563'],
              ['FQHC', 'Riverside Community Health', 'ZK:A4F2C891'],
            ].map(([label, original, hash], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 9, color: '#7a9bbf', marginBottom: 1, fontFamily: 'monospace' }}>{label}</div>
                  <div style={{ fontSize: 10, color: '#eef2f8' }}>{original}</div>
                </div>
                <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#4ade80' }}>{hash}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{ background: '#0C1520', border: '1px solid rgba(0,212,184,0.14)', marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#eef2f8', marginBottom: 10 }}>Compliance Status</div>
            {[
              ['HIPAA Privacy Rule', '100% Compliant', '#4ade80'],
              ['PHI Transmission', 'Zero raw PHI sent', '#4ade80'],
              ['Data Residency', 'FQHC-controlled', '#00d4b8'],
              ['Family Consent', 'Active — Dorothy', '#00d4b8'],
              ['Shield Version', 'Sovereign Shield v2.0', '#8060cc'],
            ].map(([k, v, c], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <span style={{ fontSize: 10, color: '#7a9bbf' }}>{k}</span>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: c }}>{v}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ══════════════════════════════════════════
// EXISTING PAGES (unchanged)
// ══════════════════════════════════════════

function DashboardPage({ meds, tasks, setMeds, setPage }) {
  const taken = meds.filter(m => m.taken).length
  const pending = tasks.filter(t => !t.done).length

  return (
    <div className="page-content">
      {/* CareIQ Alert Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0C1520, #112240)',
        borderRadius: 14, padding: '12px 14px', marginBottom: 14,
        border: '1px solid rgba(0,212,184,0.25)', cursor: 'pointer',
      }} onClick={() => setPage('careiq')}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⊕</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#E0BC40' }}>CareIQ — FQHC Alert</div>
              <div style={{ fontSize: 10, color: '#7a9bbf', marginTop: 1 }}>2 critical gaps · Dorothy's score: 62</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
            <ChevronRight size={14} color="#7a9bbf" />
          </div>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat-chip">
          <div className="stat-number green">{taken}/{meds.length}</div>
          <div className="stat-label">Meds Taken</div>
        </div>
        <div className="stat-chip">
          <div className="stat-number accent">{pending}</div>
          <div className="stat-label">Open Tasks</div>
        </div>
        <div className="stat-chip">
          <div className="stat-number blue">2</div>
          <div className="stat-label">This Week</div>
        </div>
      </div>

      <div className="ai-banner">
        <div className="ai-banner-header">
          <Bot size={16} /> CareCircle AI — Today's Actions
        </div>
        {AI_SUGGESTIONS.slice(0, 3).map((s, i) => (
          <div key={i} className="ai-suggestion">
            <span className="ai-suggestion-icon">{s.icon}</span>
            <span className="ai-suggestion-text">{s.text}</span>
            <button className="ai-suggestion-btn" onClick={() => setPage('ai')}>{s.action}</button>
          </div>
        ))}
      </div>

      <div className="section-header">
        <span className="section-title">Today's Medications</span>
        <button className="section-action" onClick={() => setPage('meds')}>See all</button>
      </div>
      {meds.map(med => (
        <div key={med.id} className="card">
          <div className="card-row">
            <button
              className={`med-status ${med.taken ? 'med-taken' : 'med-pending'}`}
              onClick={() => setMeds(prev => prev.map(m => m.id === med.id ? { ...m, taken: !m.taken } : m))}
            >
              {med.taken && <Check size={16} />}
            </button>
            <div className="card-content">
              <div className="card-title">{med.name}</div>
              <div className="card-subtitle">{med.schedule}</div>
              {med.pillsLeft <= 10 && (
                <div className="refill-warning">
                  <AlertCircle size={12} /> {med.pillsLeft} pills left — refill by {med.refillDate}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      <div className="section-header">
        <span className="section-title">Upcoming Appointments</span>
        <button className="section-action" onClick={() => setPage('calendar')}>See all</button>
      </div>
      {DEFAULT_APPOINTMENTS.slice(0, 2).map(appt => (
        <div key={appt.id} className="card">
          <div className="card-row">
            <div className="appt-date-block">
              <div className="appt-day">{appt.date.split(' ')[1]}</div>
              <div className="appt-month">{appt.date.split(' ')[0]}</div>
            </div>
            <div className="appt-divider" />
            <div className="card-content">
              <div className="card-title">{appt.title}</div>
              <div className="card-subtitle">
                <Clock size={12} /> {appt.time} · {appt.location}
              </div>
            </div>
          </div>
        </div>
      ))}

      <div className="section-header">
        <span className="section-title">Family Activity</span>
      </div>
      {FEED_ITEMS.map((item, i) => (
        <div key={i} className="feed-item">
          <div className="feed-avatar" style={{ background: item.color }}>{item.avatar}</div>
          <div>
            <div className="feed-text">
              <span className="feed-who">{item.who}</span> {item.action}: {item.what}
            </div>
            <div className="feed-time">{item.time}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function MedsPage({ meds, setMeds, setModal }) {
  return (
    <div className="page-content">
      <div className="page-top-row">
        <span className="page-title">Medications</span>
        <button className="add-btn" onClick={() => setModal('addMed')}>
          <Plus size={16} /> Add Med
        </button>
      </div>
      {meds.some(m => m.pillsLeft <= 10) && (
        <div className="card alert-card">
          <span>⚠️</span>
          <span><strong>Refill Alert:</strong> Amlodipine 5mg has only 6 pills remaining. Refill by Apr 10.</span>
        </div>
      )}
      <div className="section-header">
        <span className="section-title">Morning</span>
        <span className="section-count">{meds.filter(m => m.schedule.includes('AM') || m.schedule.includes('Morning')).length} medications</span>
      </div>
      {meds.filter(m => m.schedule.includes('AM') || m.schedule.includes('Morning')).map(med => (
        <div key={med.id} className="card">
          <div className="card-row">
            <button className={`med-status ${med.taken ? 'med-taken' : 'med-pending'}`}
              onClick={() => setMeds(prev => prev.map(m => m.id === med.id ? { ...m, taken: !m.taken } : m))}>
              {med.taken && <Check size={16} />}
            </button>
            <div className="card-content">
              <div className="card-title">{med.name}</div>
              <div className="card-subtitle">{med.schedule}</div>
              <div className="badge-row">
                <span className="badge badge-neutral">{med.pillsLeft} pills left</span>
                <span className="badge badge-blue">Refill {med.refillDate}</span>
              </div>
              {med.notes && <div className="card-note">{med.notes}</div>}
            </div>
          </div>
        </div>
      ))}
      <div className="section-header">
        <span className="section-title">Evening</span>
        <span className="section-count">{meds.filter(m => m.schedule.includes('PM') && !m.schedule.includes('AM')).length} medication</span>
      </div>
      {meds.filter(m => m.schedule.includes('PM') && !m.schedule.includes('AM')).map(med => (
        <div key={med.id} className="card">
          <div className="card-row">
            <button className={`med-status ${med.taken ? 'med-taken' : 'med-pending'}`}
              onClick={() => setMeds(prev => prev.map(m => m.id === med.id ? { ...m, taken: !m.taken } : m))}>
              {med.taken && <Check size={16} />}
            </button>
            <div className="card-content">
              <div className="card-title">{med.name}</div>
              <div className="card-subtitle">{med.schedule}</div>
              {med.pillsLeft <= 10 && <div className="refill-warning"><AlertCircle size={12} /> Low supply — {med.pillsLeft} left</div>}
              {med.notes && <div className="card-note">{med.notes}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function CalendarPage() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const dates = [31, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
  const hasAppt = [3, 7, 14, 16]
  return (
    <div className="page-content">
      <div className="page-title" style={{ marginTop: 8, marginBottom: 16 }}>April 2026</div>
      <div className="cal-grid">
        {days.map(d => <div key={d} className="cal-day-label">{d}</div>)}
        {dates.map((d, i) => (
          <div key={i} className={`cal-date ${d === 1 ? 'today' : ''} ${d < 1 ? 'muted' : ''}`}>
            {d}
            {hasAppt.includes(d) && <div className={`cal-dot ${d === 1 ? 'white' : ''}`} />}
          </div>
        ))}
      </div>
      <div className="section-header"><span className="section-title">All Appointments</span></div>
      {DEFAULT_APPOINTMENTS.map(appt => (
        <div key={appt.id} className="card">
          <div className="card-row">
            <div className="appt-date-block">
              <div className="appt-day">{appt.date.split(' ')[1]}</div>
              <div className="appt-month">{appt.date.split(' ')[0]}</div>
            </div>
            <div className="appt-divider" />
            <div className="card-content">
              <div className="card-title">{appt.title}</div>
              <div className="card-subtitle"><Clock size={12} /> {appt.time} · {appt.location}</div>
              <div className="card-note">📝 {appt.notes}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function TasksPage({ tasks, setTasks, setModal }) {
  const toggle = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const pending = tasks.filter(t => !t.done).sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 }
    return p[a.priority] - p[b.priority]
  })
  const completed = tasks.filter(t => t.done)

  const renderTask = (task, faded = false) => {
    const member = getMember(task.assignee)
    return (
      <div key={task.id} className="card" style={faded ? { opacity: 0.5 } : {}}>
        <div className="card-row" style={{ alignItems: 'flex-start' }}>
          <button className={`task-checkbox ${task.done ? 'checked' : ''}`} onClick={() => toggle(task.id)}>
            {task.done && <Check size={12} />}
          </button>
          <div className="card-content">
            <div className={`task-text ${task.done ? 'done' : ''}`}>{task.text}</div>
            <div className="task-meta">
              <span className="task-assignee">
                <span className="assignee-dot" style={{ background: member?.color }}>{member?.avatar}</span>
                {member?.name?.split(' ')[0] || task.assignee}
              </span>
              {!task.done && <span className={`priority-tag priority-${task.priority}`}>{task.priority}</span>}
              <span className="task-due">Due {task.due}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="page-top-row">
        <span className="page-title">Care Tasks</span>
        <button className="add-btn" onClick={() => setModal('addTask')}><Plus size={16} /> Add Task</button>
      </div>
      {pending.map(t => renderTask(t))}
      {completed.length > 0 && (
        <>
          <div className="section-header"><span className="section-title muted">Completed</span></div>
          {completed.map(t => renderTask(t, true))}
        </>
      )}
    </div>
  )
}

function DocsPage({ setModal }) {
  const [filter, setFilter] = useState('All')
  const types = ['All', 'Medical', 'Insurance', 'Legal', 'Care Plan']
  const filtered = filter === 'All' ? DOCUMENTS : DOCUMENTS.filter(d => d.type === filter)
  return (
    <div className="page-content">
      <div className="page-top-row">
        <span className="page-title">Document Vault</span>
        <button className="add-btn" onClick={() => setModal('upload')}><Upload size={16} /> Upload</button>
      </div>
      <div className="doc-filter-row">
        {types.map(t => <button key={t} className={`doc-filter ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>{t}</button>)}
      </div>
      <div className="security-badge"><Shield size={16} /><span>All documents encrypted and HIPAA-ready</span></div>
      <div className="doc-grid">
        {filtered.map(doc => (
          <div key={doc.id} className="doc-card">
            <div className="doc-icon">{doc.icon}</div>
            <div className="doc-name">{doc.name}</div>
            <div className="doc-meta">{doc.type} · {doc.date}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AIPage() {
  const [messages, setMessages] = useState(() => load('ai-chat', [
    { role: 'bot', text: "Hi Matt! I'm your CareCircle assistant. I can help manage Mom's care — from medication schedules to appointment prep to keeping siblings updated. What can I do for you?" }
  ]))
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const chatEnd = useRef(null)

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, typing])
  useEffect(() => { save('ai-chat', messages) }, [messages])

  const send = useCallback((text) => {
    if (!text.trim()) return
    setMessages(prev => [...prev, { role: 'user', text: text.trim() }])
    setInput('')
    setTyping(true)
    const key = Object.keys(AI_RESPONSES).find(k => text.toLowerCase().includes(k)) || 'default'
    setTimeout(() => {
      setTyping(false)
      setMessages(prev => [...prev, { role: 'bot', text: AI_RESPONSES[key] }])
    }, 1000 + Math.random() * 800)
  }, [])

  return (
    <div className="page-content" style={{ paddingBottom: 80, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)' }}>
      <div className="page-title" style={{ marginTop: 8, marginBottom: 12, flexShrink: 0 }}>AI Care Assistant</div>
      <div className="quick-actions" style={{ flexShrink: 0 }}>
        <button className="quick-action" onClick={() => send('Summarize last visit')}>📋 Visit Summary</button>
        <button className="quick-action" onClick={() => send('Draft family update')}>👨‍👩‍👦 Family Update</button>
        <button className="quick-action" onClick={() => send("What's coming up")}>📅 This Week</button>
      </div>
      <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>{msg.text}</div>
        ))}
        {typing && <div className="chat-bubble bot"><div className="typing-dots"><span /><span /><span /></div></div>}
        <div ref={chatEnd} />
      </div>
      <div className="chat-input-row" style={{ flexShrink: 0 }}>
        <input className="chat-input" placeholder="Ask about Mom's care..." value={input}
          onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)} />
        <button className="chat-send" onClick={() => send(input)}><Send size={18} /></button>
      </div>
    </div>
  )
}

function EmergencyPage() {
  return (
    <div className="page-content">
      <div className="page-title" style={{ marginTop: 8, marginBottom: 16 }}>Emergency Profile</div>
      <div className="emergency-card">
        <h3>Dorothy M. (Mom)</h3>
        <div className="emergency-subtitle">One-tap profile for first responders & ER staff</div>
        <div className="emergency-detail"><Heart size={14} /> <strong>Conditions:</strong>&nbsp;Type 2 Diabetes, Hypertension, Mild OA</div>
        <div className="emergency-detail"><Pill size={14} /> <strong>Medications:</strong>&nbsp;Lisinopril 10mg, Metformin 500mg, Amlodipine 5mg, Vitamin D3</div>
        <div className="emergency-detail"><span>🩸</span> <strong>Blood Type:</strong>&nbsp;O+</div>
        <div className="emergency-detail"><span>⚠️</span> <strong>Allergies:</strong>&nbsp;Penicillin, Sulfa drugs</div>
        <div className="emergency-detail"><User size={14} /> <strong>Primary Contact:</strong>&nbsp;Matt — (405) 555-0188</div>
      </div>
      <div className="section-header"><span className="section-title">Emergency Contacts</span></div>
      {EMERGENCY_CONTACTS.map((c, i) => (
        <div key={i} className="contact-card">
          <div className="contact-info"><h4>{c.name}</h4><span>{c.relation} · {c.phone}</span></div>
          <button className="call-btn"><Phone size={16} /></button>
        </div>
      ))}
      <div className="er-notes">
        <strong>📋 Care Notes for ER Staff</strong><br />
        Patient prefers to be called "Dorothy." She has mild hearing loss — speak clearly facing her.
        Power of attorney is on file (Matt, eldest child). Advance directive specifies full code. Pharmacy: CVS on Main St.
      </div>
    </div>
  )
}

// ══════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════

function ModalSheet({ type, onClose, onAddMed, onAddTask }) {
  const [form, setForm] = useState({})
  if (!type) return null
  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        {type === 'addMed' && (
          <>
            <div className="modal-title">Add Medication</div>
            <div className="form-field"><label className="form-label">Medication Name</label><input className="form-input" placeholder="e.g., Lisinopril 10mg" onChange={e => update('name', e.target.value)} /></div>
            <div className="form-field"><label className="form-label">Schedule</label><input className="form-input" placeholder="e.g., 8:00 AM daily" onChange={e => update('schedule', e.target.value)} /></div>
            <div className="form-field"><label className="form-label">Pills Remaining</label><input className="form-input" type="number" placeholder="30" onChange={e => update('pillsLeft', parseInt(e.target.value) || 30)} /></div>
            <div className="form-field"><label className="form-label">Notes</label><input className="form-input" placeholder="e.g., Take with food" onChange={e => update('notes', e.target.value)} /></div>
            <button className="btn-primary" onClick={() => { if (form.name) { onAddMed({ id: Date.now(), name: form.name, schedule: form.schedule || 'As directed', taken: false, refillDate: 'TBD', pillsLeft: form.pillsLeft || 30, forPerson: 'mom', notes: form.notes || '' }); onClose() } }}>Add Medication</button>
          </>
        )}
        {type === 'addTask' && (
          <>
            <div className="modal-title">Add Care Task</div>
            <div className="form-field"><label className="form-label">Task Description</label><input className="form-input" placeholder="e.g., Call pharmacy about refill" onChange={e => update('text', e.target.value)} /></div>
            <div className="form-field">
              <label className="form-label">Assign To</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {FAMILY_MEMBERS.filter(m => m.id !== 'mom').map(m => (
                  <button key={m.id} className={`quick-action ${form.assignee === m.id ? 'active' : ''}`} onClick={() => update('assignee', m.id)}>
                    <span className="assignee-dot" style={{ background: m.color, display: 'inline-flex', width: 16, height: 16, borderRadius: '50%', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', fontWeight: 700 }}>{m.avatar}</span>
                    {' '}{m.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Priority</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['high', 'medium', 'low'].map(p => (
                  <button key={p} className={`quick-action ${form.priority === p ? 'active' : ''}`} onClick={() => update('priority', p)}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-primary" onClick={() => { if (form.text) { onAddTask({ id: Date.now(), text: form.text, assignee: form.assignee || 'you', priority: form.priority || 'medium', done: false, due: 'TBD' }); onClose() } }}>Add Task</button>
          </>
        )}
        {type === 'upload' && (
          <>
            <div className="modal-title">Upload Document</div>
            <div className="upload-zone"><Upload size={24} /><div style={{ marginTop: 8, fontWeight: 500 }}>Tap to upload or take a photo</div><div style={{ fontSize: 12, marginTop: 4 }}>PDF, JPG, PNG up to 25MB</div></div>
            <div className="form-field">
              <label className="form-label">Document Type</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{['Medical', 'Insurance', 'Legal', 'Care Plan'].map(t => <button key={t} className="doc-filter">{t}</button>)}</div>
            </div>
            <div className="form-field"><label className="form-label">Label (optional)</label><input className="form-input" placeholder="e.g., Lab Results — March" /></div>
            <button className="btn-primary" onClick={onClose}>Upload Document</button>
          </>
        )}
        {type === 'notifications' && (
          <>
            <div className="modal-title">Notification Settings</div>
            <div style={{ fontSize: 14, color: '#7A7570', marginBottom: 20, lineHeight: 1.6 }}>CareCircle can send you reminders for medications, upcoming appointments, and task deadlines.</div>
            <button className="btn-primary" onClick={async () => { const granted = await requestPermission(); if (granted) { sendNotification('🎉 Notifications Enabled', "You'll now receive medication reminders and care alerts.") } onClose() }}>Enable Notifications</button>
            <button style={{ width: '100%', padding: 14, marginTop: 8, background: 'transparent', border: '1px solid #EDE8E3', borderRadius: 10, fontSize: 14, color: '#7A7570', cursor: 'pointer', fontFamily: 'inherit' }} onClick={onClose}>Maybe Later</button>
          </>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════

export default function App() {
  const [page, setPage] = useState('home')
  const [meds, setMeds] = useState(() => load('meds', DEFAULT_MEDS))
  const [tasks, setTasks] = useState(() => load('tasks', DEFAULT_TASKS))
  const [modal, setModal] = useState(null)
  const [notifPrompted, setNotifPrompted] = useState(() => load('notif-prompted', false))

  useEffect(() => { save('meds', meds) }, [meds])
  useEffect(() => { save('tasks', tasks) }, [tasks])

  useEffect(() => {
    if (Notification.permission === 'granted') scheduleMedReminders(meds)
  }, [meds])

  useEffect(() => {
    if (!notifPrompted && 'Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(() => { setModal('notifications'); setNotifPrompted(true); save('notif-prompted', true) }, 3000)
      return () => clearTimeout(timer)
    }
  }, [notifPrompted])

  const addMed = (med) => setMeds(prev => [...prev, med])
  const addTask = (task) => setTasks(prev => [...prev, task])

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'meds', icon: Pill, label: 'Meds' },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
    { id: 'docs', icon: FolderLock, label: 'Vault' },
    { id: 'ai', icon: Bot, label: 'AI' },
    { id: 'careiq', icon: Stethoscope, label: 'CareIQ' },
    { id: 'emergency', icon: Activity, label: 'SOS' },
  ]

  return (
    <div className="app-shell">
      <div className="app-header">
        <div className="header-left">
          <h1 className="header-title">CareCircle</h1>
          <span className="header-subtitle">
            {page === 'careiq'
              ? '⊕ FQHC Edition — Dorothy'
              : 'Caring for Mom (Dorothy)'}
          </span>
        </div>
        <div className="header-right">
          <button className="notif-btn" onClick={() => setModal('notifications')}>
            <Bell size={18} />
            <div className="notif-dot" />
          </button>
          <div className="avatar-sm" style={{ background: '#3D405B' }}>M</div>
        </div>
      </div>

      {page === 'home' && <DashboardPage meds={meds} tasks={tasks} setMeds={setMeds} setPage={setPage} />}
      {page === 'meds' && <MedsPage meds={meds} setMeds={setMeds} setModal={setModal} />}
      {page === 'calendar' && <CalendarPage />}
      {page === 'tasks' && <TasksPage tasks={tasks} setTasks={setTasks} setModal={setModal} />}
      {page === 'docs' && <DocsPage setModal={setModal} />}
      {page === 'ai' && <AIPage />}
      {page === 'careiq' && <CareIQPage />}
      {page === 'emergency' && <EmergencyPage />}

      <nav className="nav-bar">
        {navItems.map(item => (
          <button key={item.id}
            className={`nav-item ${page === item.id ? 'active' : ''} ${item.id === 'careiq' ? 'careiq-nav' : ''}`}
            onClick={() => setPage(item.id)}>
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <ModalSheet type={modal} onClose={() => setModal(null)} onAddMed={addMed} onAddTask={addTask} />
    </div>
  )
}
