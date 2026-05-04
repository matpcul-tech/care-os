'use client';
import { useState } from 'react';
import { DOCUMENTS } from '@/lib/data';
import { T, O, PAGE_PAD, SECTION_LABEL, CARD_BG, CARD_BORDER } from './ui';

const TYPES = ['All', 'Medical', 'Insurance', 'Legal', 'Care Plan'] as const;
type FilterType = typeof TYPES[number];

export default function VaultPage({ onUpload }: { onUpload: () => void }) {
  const [filter, setFilter] = useState<FilterType>('All');
  const filtered = filter === 'All' ? DOCUMENTS : DOCUMENTS.filter(d => d.type === filter);

  return (
    <div style={PAGE_PAD}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ ...SECTION_LABEL, marginBottom: 0 }}>Document Vault</div>
        <button onClick={onUpload} style={{ background: 'rgba(0,212,184,.15)', border: '1px solid rgba(0,212,184,.25)', borderRadius: 10, padding: '6px 12px', color: '#00d4b8', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: O }}>↑ Upload</button>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {TYPES.map(t => (
          <button key={t} onClick={() => setFilter(t)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 20, fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: O, background: filter === t ? 'rgba(0,212,184,.15)' : CARD_BG, color: filter === t ? '#00d4b8' : '#7a9bbf', border: `1px solid ${filter === t ? 'rgba(0,212,184,.3)' : 'rgba(0,212,184,.14)'}`, whiteSpace: 'nowrap' }}>{t}</button>
        ))}
      </div>

      <div style={{ background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.2)', borderRadius: 12, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16 }}>🔒</span>
        <span style={{ fontSize: 11, color: '#4ade80', fontFamily: T }}>All documents encrypted and HIPAA-ready</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {filtered.map(doc => (
          <div key={doc.id} style={{ background: CARD_BG, border: CARD_BORDER, borderRadius: 14, padding: 14, cursor: 'pointer', transition: 'all .2s' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{doc.icon}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#eef2f8', lineHeight: 1.4, marginBottom: 6 }}>{doc.name}</div>
            <div style={{ fontFamily: T, fontSize: 9, color: '#7a9bbf' }}>{doc.type} · {doc.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
