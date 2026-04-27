'use client';
import { type Medication } from '@/lib/data';
import { T, O, PAGE_PAD, SECTION_LABEL, CARD_BG, CARD_BORDER } from './ui';

export default function MedsPage({
  meds, onToggle, onAdd,
}: {
  meds: Medication[];
  onToggle: (id: string) => void;
  onAdd: () => void;
}) {
  const takenCount = meds.filter(m => m.taken).length;
  const adherencePct = Math.round((takenCount / meds.length) * 100);
  const lowMeds = meds.filter(m => m.pillsLeft <= 10);

  return (
    <div style={PAGE_PAD}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ ...SECTION_LABEL, marginBottom: 0 }}>Medication Schedule</div>
        <button onClick={onAdd} style={{ background: 'rgba(0,212,184,.15)', border: '1px solid rgba(0,212,184,.25)', borderRadius: 10, padding: '6px 12px', color: '#00d4b8', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: O, display: 'flex', alignItems: 'center', gap: 4 }}>+ Add Med</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
        {[
          [String(takenCount), '#4ade80', 'Taken'],
          [String(meds.length - takenCount), '#e8526e', 'Remaining'],
          [adherencePct + '%', '#d4a843', 'Adherence'],
        ].map(([v, c, l], i) => (
          <div key={i} style={{ background: CARD_BG, border: CARD_BORDER, borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontFamily: T, fontSize: 20, fontWeight: 700, color: c }}>{v}</div>
            <div style={{ fontSize: 9, color: '#7a9bbf', marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>

      {lowMeds.length > 0 && (
        <div style={{ background: 'rgba(232,82,110,.08)', border: '1px solid rgba(232,82,110,.25)', borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>⚠️</span>
          <div style={{ fontSize: 11, color: '#eef2f8', lineHeight: 1.5 }}>
            <strong>Refill Alert:</strong> {lowMeds.map(m => m.name.split(' ')[0]).join(', ')} {lowMeds.length === 1 ? 'is' : 'are'} running low.
          </div>
        </div>
      )}

      {['7:00 AM', '12:00 PM', '8:00 PM'].map(timeSlot => {
        const slotMeds = meds.filter(m => m.time === timeSlot);
        if (!slotMeds.length) return null;
        return (
          <div key={timeSlot} style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: T, fontSize: 9, color: '#7a9bbf', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{timeSlot}</div>
            {slotMeds.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px', background: CARD_BG, border: `1px solid ${m.taken ? 'rgba(74,222,128,.2)' : 'rgba(0,212,184,.14)'}`, borderRadius: 14, marginBottom: 8, transition: 'all .2s' }}>
                <button onClick={() => onToggle(m.id)} style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${m.taken ? '#4ade80' : 'rgba(0,212,184,.3)'}`, background: m.taken ? '#4ade80' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, marginTop: 2, transition: 'all .2s' }}>
                  {m.taken ? '✓' : ''}
                </button>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: m.taken ? '#7a9bbf' : '#eef2f8', textDecoration: m.taken ? 'line-through' : 'none' }}>{m.name}</div>
                  <div style={{ fontSize: 10, color: '#7a9bbf', marginTop: 2 }}>{m.dose} · {m.schedule}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    <span style={{ fontFamily: T, fontSize: 9, padding: '2px 7px', borderRadius: 6, background: m.pillsLeft <= 10 ? 'rgba(232,82,110,.15)' : 'rgba(255,255,255,.06)', color: m.pillsLeft <= 10 ? '#e8526e' : '#7a9bbf', border: `1px solid ${m.pillsLeft <= 10 ? 'rgba(232,82,110,.25)' : 'rgba(255,255,255,.08)'}` }}>{m.pillsLeft} pills left</span>
                    <span style={{ fontFamily: T, fontSize: 9, padding: '2px 7px', borderRadius: 6, background: 'rgba(91,143,168,.12)', color: '#5B8FA8', border: '1px solid rgba(91,143,168,.25)' }}>Refill {m.refillDate}</span>
                    {m.critical && <span style={{ fontFamily: T, fontSize: 9, padding: '2px 7px', borderRadius: 6, background: 'rgba(232,82,110,.15)', color: '#e8526e', border: '1px solid rgba(232,82,110,.25)' }}>Critical</span>}
                  </div>
                  {m.notes && <div style={{ fontSize: 10, color: '#7a9bbf', marginTop: 6, fontStyle: 'italic', lineHeight: 1.5 }}>{m.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
