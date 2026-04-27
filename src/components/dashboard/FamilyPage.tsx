'use client';
import { FAMILY, FEED_ITEMS } from '@/lib/data';
import { T, O, PAGE_PAD, SECTION_LABEL, CARD_BG, CARD_BORDER } from './ui';

export default function FamilyPage() {
  return (
    <div style={PAGE_PAD}>
      <div style={SECTION_LABEL}>Care Team</div>
      {FAMILY.map((f, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: CARD_BG, border: CARD_BORDER, borderRadius: 14, marginBottom: 10 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: T, fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{f.avatar}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{f.name}</div>
            <div style={{ fontSize: 10, color: '#7a9bbf', marginTop: 2 }}>{f.role}</div>
            <div style={{ fontFamily: T, fontSize: 9, color: '#7a9bbf', marginTop: 3 }}>Last contact: {f.lastContact}</div>
          </div>
          <button style={{ background: 'rgba(0,212,184,.1)', border: '1px solid rgba(0,212,184,.2)', borderRadius: 10, padding: '7px 12px', color: '#00d4b8', fontSize: 10, fontWeight: 700, cursor: 'pointer', fontFamily: O }}>Contact</button>
        </div>
      ))}

      <div style={{ ...SECTION_LABEL, margin: '20px 0 10px' }}>Recent Activity</div>
      {FEED_ITEMS.map((a, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{a.avatar}</div>
            {i < FEED_ITEMS.length - 1 && <div style={{ width: 1, flex: 1, background: 'rgba(0,212,184,.14)', marginTop: 3 }} />}
          </div>
          <div style={{ flex: 1, paddingBottom: 10 }}>
            <div style={{ fontFamily: T, fontSize: 9, color: '#7a9bbf', marginBottom: 2 }}>{a.time}</div>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{a.who} <span style={{ color: '#7a9bbf', fontWeight: 400 }}>{a.action}</span></div>
            <div style={{ fontSize: 11, color: '#7a9bbf', lineHeight: 1.5 }}>{a.what}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
