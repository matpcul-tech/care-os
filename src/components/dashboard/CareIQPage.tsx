'use client';
import { useState } from 'react';
import {
  PATIENT, CAREIQ_VITALS, CAREIQ_DOMAINS, CAREIQ_PROTOCOLS,
  CAREIQ_INSIGHTS, SHARED_FROM_FAMILY, CARE_GAPS,
  type Medication,
} from '@/lib/data';
import { T, PAGE_PAD, SECTION_LABEL, CARD_BG, CARD_BORDER } from './ui';

const scoreColor = (s: number) => s >= 75 ? '#4ade80' : s >= 55 ? '#d4a843' : '#e8526e';
const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'gaps', label: 'Care Gaps' },
  { id: 'insights', label: 'AI Insights' },
  { id: 'shared', label: 'Family Data' },
] as const;

export default function CareIQPage({ meds }: { meds: Medication[] }) {
  const [tab, setTab] = useState<typeof tabs[number]['id']>('overview');
  const adherencePct = Math.round((meds.filter(m => m.taken).length / meds.length) * 100);
  const criticalGaps = CARE_GAPS.filter(g => g.severity === 'high').length;

  return (
    <div style={PAGE_PAD}>
      <div style={{ background: 'linear-gradient(135deg, #0C1520, #112240)', borderRadius: 16, padding: 16, marginBottom: 16, border: '1px solid rgba(0,212,184,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#00d4b8,#8060cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⊕</div>
            <div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, fontWeight: 600, color: '#E0BC40' }}>CareIQ</div>
              <div style={{ fontFamily: T, fontSize: 9, color: '#00d4b8', letterSpacing: '.15em', textTransform: 'uppercase', marginTop: 1 }}>FQHC Clinical Connection</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 20, padding: '3px 8px' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 8, color: '#4ade80', fontFamily: T, letterSpacing: '.1em' }}>SHIELD ON</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#eef2f8' }}>{PATIENT.name}</div>
            <div style={{ fontFamily: T, fontSize: 10, color: '#7a9bbf', marginTop: 1 }}>{PATIENT.id}</div>
            <div style={{ fontSize: 10, color: '#7a9bbf', marginTop: 2 }}>{PATIENT.fqhc}</div>
          </div>
          <div style={{ position: 'relative', width: 64, height: 64 }}>
            <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
              <circle cx="32" cy="32" r="26" fill="none" stroke="url(#ciqGrad)" strokeWidth="5" strokeLinecap="round" strokeDasharray="163.4" strokeDashoffset={163.4 * (1 - PATIENT.careiqScore / 100)} />
              <defs>
                <linearGradient id="ciqGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#00d4b8" />
                  <stop offset="100%" stopColor="#8060cc" />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontFamily: T, fontSize: 18, fontWeight: 600, color: '#00d4b8', lineHeight: 1 }}>{PATIENT.careiqScore}</div>
              <div style={{ fontSize: 7, color: '#7a9bbf', textTransform: 'uppercase', letterSpacing: '.1em' }}>Score</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 11, color: '#eef2f8', fontWeight: 600 }}>{PATIENT.careiqRisk} Risk</div>
          <div style={{ fontFamily: T, fontSize: 10, color: '#00d4b8', background: 'rgba(0,212,184,0.1)', padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(0,212,184,0.2)' }}>↑ {PATIENT.trend}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', background: tab === t.id ? '#112240' : CARD_BG, color: tab === t.id ? '#00d4b8' : '#7a9bbf', border: tab === t.id ? '1px solid rgba(0,212,184,0.4)' : CARD_BORDER }}>{t.label}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          <div style={SECTION_LABEL}>Clinical Vitals</div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, scrollbarWidth: 'none' }}>
            {CAREIQ_VITALS.map((v, i) => (
              <div key={i} style={{ flexShrink: 0, background: CARD_BG, border: CARD_BORDER, borderRadius: 14, padding: '10px 14px', minWidth: 92 }}>
                <div style={{ fontSize: 14, marginBottom: 4 }}>{v.icon}</div>
                <div style={{ fontFamily: T, fontSize: 14, fontWeight: 500, color: v.status === 'ok' ? '#00d4b8' : v.status === 'warn' ? '#d4a843' : '#e8526e' }}>{v.val}</div>
                <div style={{ fontSize: 8, color: '#7a9bbf' }}>{v.unit}</div>
                <div style={{ fontSize: 9, color: '#7a9bbf', marginTop: 2 }}>{v.name}</div>
              </div>
            ))}
          </div>

          <div style={SECTION_LABEL}>Risk Domains</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
            {CAREIQ_DOMAINS.map((d, i) => (
              <div key={i} style={{ background: CARD_BG, border: CARD_BORDER, borderRadius: 14, padding: 14 }}>
                <div style={{ fontSize: 10, color: '#7a9bbf', marginBottom: 8 }}>{d.icon} {d.name}</div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 2, marginBottom: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${d.score}%`, background: scoreColor(d.score), borderRadius: 2 }} />
                </div>
                <div style={{ fontFamily: T, fontSize: 17, fontWeight: 500, color: scoreColor(d.score) }}>{d.score}<span style={{ fontSize: 10, color: '#7a9bbf' }}>/100</span></div>
              </div>
            ))}
          </div>

          <div style={SECTION_LABEL}>Active FQHC Protocols</div>
          {CAREIQ_PROTOCOLS.map((p, i) => (
            <div key={i} style={{ background: CARD_BG, border: CARD_BORDER, borderRadius: 14, padding: 14, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#eef2f8' }}>{p.name}</span>
                <span style={{ fontFamily: T, fontSize: 12, color: p.color, background: `${p.color}18`, padding: '2px 8px', borderRadius: 8, border: `1px solid ${p.color}40` }}>{p.pct}%</span>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${p.pct}%`, background: p.color, borderRadius: 3 }} />
              </div>
              <div style={{ fontSize: 10, color: '#7a9bbf' }}>{p.detail}</div>
            </div>
          ))}

          <div style={{ background: CARD_BG, border: CARD_BORDER, borderRadius: 14, padding: 14, marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#eef2f8', marginBottom: 4 }}>Med Adherence (CareCircle → CareIQ)</div>
            <div style={{ fontFamily: T, fontSize: 22, fontWeight: 700, color: adherencePct >= 80 ? '#4ade80' : adherencePct >= 60 ? '#d4a843' : '#e8526e', marginBottom: 6 }}>{adherencePct}%</div>
            <div style={{ fontSize: 10, color: '#7a9bbf' }}>Family-logged adherence shared with {PATIENT.fqhc}</div>
          </div>
        </>
      )}

      {tab === 'gaps' && (
        <>
          <div style={{ background: 'rgba(232,82,110,.08)', border: '1px solid rgba(232,82,110,.25)', borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <span style={{ fontSize: 11, color: '#e8526e', fontWeight: 500 }}>{criticalGaps} critical {criticalGaps === 1 ? 'gap needs' : 'gaps need'} attention from the family care team</span>
          </div>
          {CARE_GAPS.map((g, i) => (
            <div key={i} style={{ background: CARD_BG, borderLeft: `3px solid ${g.severity === 'high' ? '#e8526e' : g.severity === 'medium' ? '#d4a843' : '#4ade80'}`, border: CARD_BORDER, borderRadius: 12, padding: 12, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{g.ico}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#eef2f8' }}>{g.title}</span>
              </div>
              <div style={{ fontSize: 11, color: '#7a9bbf', marginBottom: 8, lineHeight: 1.5 }}>{g.desc}</div>
              <span style={{ fontFamily: T, fontSize: 9, padding: '2px 8px', borderRadius: 8, background: `${g.severity === 'high' ? '#e8526e' : g.severity === 'medium' ? '#d4a843' : '#4ade80'}18`, color: g.severity === 'high' ? '#e8526e' : g.severity === 'medium' ? '#d4a843' : '#4ade80', border: `1px solid ${g.severity === 'high' ? '#e8526e' : g.severity === 'medium' ? '#d4a843' : '#4ade80'}40`, textTransform: 'uppercase' }}>{g.severity}</span>
            </div>
          ))}
          <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(0,212,184,.06)', borderRadius: 12, fontSize: 11, color: '#7a9bbf', lineHeight: 1.6 }}>
            💡 These gaps are shared directly from {PATIENT.short}&apos;s FQHC. Family care tasks can help close them — head to the Tasks tab to assign gap-related actions.
          </div>
        </>
      )}

      {tab === 'insights' && (
        <>
          <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(0,212,184,.06)', border: '1px solid rgba(0,212,184,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🧬</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#eef2f8' }}>CareIQ Clinical Intelligence</div>
              <div style={{ fontSize: 9, color: '#7a9bbf', fontFamily: T, marginTop: 1 }}>Insights from {PATIENT.fqhc} · Shield Protected</div>
            </div>
          </div>
          {CAREIQ_INSIGHTS.map((ins, i) => (
            <div key={i} style={{ borderRadius: 14, padding: 14, marginBottom: 10, borderLeft: `3px solid ${ins.type === 'crit' ? '#e8526e' : ins.type === 'watch' ? '#d4a843' : '#4ade80'}`, background: ins.type === 'crit' ? 'rgba(232,82,110,.06)' : ins.type === 'watch' ? 'rgba(212,168,67,.06)' : 'rgba(74,222,128,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{ins.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#eef2f8' }}>{ins.title}</span>
              </div>
              <div style={{ fontSize: 12, color: '#7a9bbf', lineHeight: 1.65, marginBottom: 8 }}>{ins.body}</div>
              <div style={{ fontFamily: T, fontSize: 9, color: '#7a9bbf' }}>AI Confidence: {ins.conf}</div>
            </div>
          ))}
        </>
      )}

      {tab === 'shared' && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#eef2f8', marginBottom: 4 }}>What Your Family Shares with the FQHC</div>
            <div style={{ fontSize: 11, color: '#7a9bbf', lineHeight: 1.6 }}>The following CareCircle data is shared with {PATIENT.short}&apos;s care team at {PATIENT.fqhc}. All data is Shield-protected before transmission.</div>
          </div>
          {SHARED_FROM_FAMILY.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: CARD_BG, border: CARD_BORDER, borderRadius: 14, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${item.color}18`, border: `1px solid ${item.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: '#7a9bbf' }}>{item.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#eef2f8', marginTop: 2 }}>{item.val}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 20, padding: '2px 8px' }}>
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#4ade80' }} />
                <span style={{ fontSize: 8, color: '#4ade80', fontFamily: T }}>SHARED</span>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(0,212,184,.06)', borderRadius: 12, fontSize: 11, color: '#7a9bbf', lineHeight: 1.6 }}>
            🔒 Medication names, diagnoses, and personal identifiers are hashed by Sovereign Shield before leaving this device. The FQHC receives protected clinical summaries, never raw family data.
          </div>
        </>
      )}
    </div>
  );
}
