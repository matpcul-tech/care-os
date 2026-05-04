'use client';
import {
  PATIENT, CAREIQ_DATA, CARE_GAPS, AI_SUGGESTIONS, FEED_ITEMS,
  type Medication, type Task,
} from '@/lib/data';
import { T, O, pc, PAGE_PAD, SECTION_LABEL, CARD_BG, CARD_BORDER } from './ui';

export default function HomePage({
  meds, tasks, notifPermission, onRequestNotif, setPage,
}: {
  meds: Medication[];
  tasks: Task[];
  notifPermission: boolean;
  onRequestNotif: () => void;
  setPage: (p: string) => void;
}) {
  const takenCount = meds.filter(m => m.taken).length;
  const doneCount = tasks.filter(t => t.done).length;
  const adherencePct = Math.round((takenCount / meds.length) * 100);
  const lowMeds = meds.filter(m => m.pillsLeft <= 10);

  return (
    <div style={PAGE_PAD}>
      <div style={{ background: 'linear-gradient(135deg, #0C1520, #112240)', borderRadius: 14, padding: '12px 14px', marginBottom: 14, border: '1px solid rgba(0,212,184,0.25)', cursor: 'pointer' }} onClick={() => setPage('careiq')}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>⊕</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#E0BC40' }}>CareIQ — FQHC Alert</div>
              <div style={{ fontSize: 10, color: '#7a9bbf', marginTop: 1 }}>2 critical gaps · {PATIENT.short}&apos;s score: {PATIENT.careiqScore}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 12, color: '#7a9bbf' }}>›</span>
          </div>
        </div>
      </div>

      <div style={{ background: 'linear-gradient(135deg,rgba(0,212,184,.12),rgba(128,96,204,.08))', border: '1px solid rgba(0,212,184,.2)', borderRadius: 18, padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'linear-gradient(135deg,#00d4b8,#8060cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>👵</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#eef2f8' }}>{PATIENT.name}</div>
            <div style={{ fontSize: 11, color: '#7a9bbf', marginTop: 2 }}>{PATIENT.condition}</div>
            <div style={{ fontSize: 10, color: '#7a9bbf', marginTop: 2 }}>{PATIENT.fqhc}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            ['💊', `${takenCount}/${meds.length}`, 'Meds Today', '#00d4b8'],
            ['✅', `${doneCount}/${tasks.length}`, 'Tasks Done', '#4ade80'],
            ['📅', 'Apr 28', 'Next Appt', '#d4a843'],
          ].map(([ico, val, lbl, c], i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,.06)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 16 }}>{ico}</div>
              <div style={{ fontFamily: T, fontSize: 16, fontWeight: 700, color: c as string, marginTop: 3 }}>{val}</div>
              <div style={{ fontSize: 9, color: '#7a9bbf', marginTop: 2 }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: CARD_BG, border: CARD_BORDER, borderRadius: 14, padding: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Today&apos;s Medication Adherence</span>
          <span style={{ fontFamily: T, fontSize: 12, fontWeight: 700, color: adherencePct >= 80 ? '#4ade80' : adherencePct >= 60 ? '#d4a843' : '#e8526e' }}>{adherencePct}%</span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,.06)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${adherencePct}%`, height: '100%', background: `linear-gradient(90deg,${adherencePct >= 80 ? '#4ade80' : adherencePct >= 60 ? '#d4a843' : '#e8526e'},${adherencePct >= 80 ? '#22c55e' : adherencePct >= 60 ? '#b87d10' : '#c03020'})`, borderRadius: 4, transition: 'width .8s ease' }} />
        </div>
        <div style={{ fontSize: 10, color: '#7a9bbf', marginTop: 6 }}>{takenCount} of {meds.length} medications taken today</div>
      </div>

      {lowMeds.length > 0 && (
        <div style={{ background: 'rgba(232,82,110,.08)', border: '1px solid rgba(232,82,110,.25)', borderRadius: 12, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div style={{ flex: 1, fontSize: 11, color: '#eef2f8', lineHeight: 1.5 }}>
            <strong>Refill Alert:</strong> {lowMeds[0].name.split(' ')[0]} has only {lowMeds[0].pillsLeft} pills left. Refill by {lowMeds[0].refillDate}.
          </div>
          <button onClick={() => setPage('meds')} style={{ background: 'rgba(232,82,110,.15)', border: '1px solid rgba(232,82,110,.25)', borderRadius: 8, padding: '5px 10px', color: '#e8526e', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: O }}>View</button>
        </div>
      )}

      <div style={{ background: 'linear-gradient(135deg,rgba(128,96,204,.1),rgba(0,212,184,.05))', border: '1px solid rgba(128,96,204,.2)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 16 }}>🤝</span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>CareCircle AI — Today&apos;s Actions</span>
        </div>
        {AI_SUGGESTIONS.slice(0, 3).map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>{s.icon}</span>
            <span style={{ flex: 1, fontSize: 11, color: '#eef2f8', lineHeight: 1.5 }}>{s.text}</span>
            <button onClick={() => setPage('ai')} style={{ background: 'rgba(0,212,184,.15)', border: '1px solid rgba(0,212,184,.25)', borderRadius: 8, padding: '4px 9px', color: '#00d4b8', fontSize: 9, fontWeight: 700, cursor: 'pointer', fontFamily: O, whiteSpace: 'nowrap' }}>{s.action}</button>
          </div>
        ))}
      </div>

      <div style={{ ...SECTION_LABEL, color: '#00d4b8', margin: '16px 0 8px' }}>CareIQ Clinical Summary</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {CAREIQ_DATA.map((d, i) => (
          <div key={i} style={{ background: CARD_BG, border: `1px solid ${d.color}30`, borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: '#7a9bbf', marginBottom: 4 }}>{d.label}</div>
            <div style={{ fontFamily: T, fontSize: 16, fontWeight: 700, color: d.color }}>{d.value}</div>
            <div style={{ fontSize: 9, color: '#7a9bbf', marginTop: 3 }}>{d.trend}</div>
          </div>
        ))}
      </div>

      <div style={{ ...SECTION_LABEL, color: '#e8526e', margin: '16px 0 8px' }}>Open Care Gaps</div>
      {CARE_GAPS.map((g, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', background: CARD_BG, border: `1px solid ${pc(g.severity)}30`, borderRadius: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{g.ico}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{g.title}</div>
            <div style={{ fontSize: 10, color: '#7a9bbf', marginTop: 2 }}>{g.desc}</div>
          </div>
          <span style={{ fontFamily: T, fontSize: 8, padding: '3px 8px', borderRadius: 8, background: `${pc(g.severity)}18`, color: pc(g.severity), border: `1px solid ${pc(g.severity)}30` }}>{g.severity}</span>
        </div>
      ))}

      <div style={{ ...SECTION_LABEL, margin: '16px 0 8px' }}>Family Activity</div>
      {FEED_ITEMS.slice(0, 4).map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{item.avatar}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#eef2f8', lineHeight: 1.5 }}>
              <strong>{item.who}</strong> {item.action}: {item.what}
            </div>
            <div style={{ fontFamily: T, fontSize: 9, color: '#7a9bbf', marginTop: 2 }}>{item.time}</div>
          </div>
        </div>
      ))}

      {!notifPermission && (
        <div style={{ background: 'rgba(212,168,67,.1)', border: '1px solid rgba(212,168,67,.25)', borderRadius: 14, padding: 14, marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#d4a843', marginBottom: 6 }}>Enable Medication Reminders</div>
          <div style={{ fontSize: 11, color: '#7a9bbf', marginBottom: 10 }}>Get notified when it is time for {PATIENT.short}&apos;s medications.</div>
          <button onClick={onRequestNotif} style={{ background: 'rgba(212,168,67,.2)', border: '1px solid rgba(212,168,67,.3)', borderRadius: 10, padding: '8px 16px', color: '#d4a843', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: O }}>Enable Reminders</button>
        </div>
      )}
    </div>
  );
}
