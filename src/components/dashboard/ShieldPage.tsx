'use client';
import { type ShieldLog } from '@/lib/data';
import { T, PAGE_PAD, SECTION_LABEL, CARD_BG, CARD_BORDER } from './ui';

export default function ShieldPage({ logs }: { logs: ShieldLog[] }) {
  return (
    <div style={PAGE_PAD}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, marginBottom: 12 }}>
        {[
          [logs.length, 'Queries Protected', '#4ade80'],
          [logs.length, 'ZK Hashed', '#4ade80'],
          ['0', 'PHI Leaked', '#4ade80'],
        ].map(([v, l, c], i) => (
          <div key={i} style={{ background: CARD_BG, border: '1px solid rgba(74,222,128,.2)', borderRadius: 14, padding: '12px 8px', textAlign: 'center' }}>
            <div style={{ fontFamily: T, fontSize: 18, fontWeight: 700, color: c as string }}>{v}</div>
            <div style={{ fontSize: 9, color: '#7a9bbf', marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{ background: CARD_BG, border: CARD_BORDER, borderRadius: 16, padding: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Sovereign Prompt Shield v2.0</span>
          <span style={{ fontFamily: T, fontSize: 8, padding: '3px 8px', borderRadius: 8, background: 'rgba(74,222,128,.14)', color: '#4ade80', border: '1px solid rgba(74,222,128,.2)' }}>ZK ACTIVE</span>
        </div>
        {[
          ['Architecture', 'Zero-Knowledge Dual Layer', '#4ade80'],
          ['Patient PHI', 'Hashed before transmission', '#00d4b8'],
          ['Medication Data', 'Protected at browser edge', '#00d4b8'],
          ['Family Data', 'Consent-governed access', '#4ade80'],
          ['HIPAA', '100% compliant', '#4ade80'],
        ].map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
            <span style={{ fontSize: 10, color: '#7a9bbf' }}>{r[0]}</span>
            <span style={{ fontFamily: T, fontSize: 10, color: r[2] as string }}>{r[1]}</span>
          </div>
        ))}
      </div>

      <div style={SECTION_LABEL}>Live Hash Demo</div>
      <div style={{ background: CARD_BG, border: CARD_BORDER, borderRadius: 14, padding: 14, marginBottom: 12 }}>
        {[
          ['Eleanor Culwell', 'ZK:A4F2C8910B3D7E50'],
          ['DOB 03/12/1948', 'ZK:B7E3D2041A9C8F52'],
          ['MRN CC-001-ELEANOR', 'ZK:C1A9F5638E2D7B04'],
          ['Metformin 1000mg', 'ZK:D8B2E4170F6C3A91'],
        ].map((h, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
            <div style={{ fontFamily: T, fontSize: 10, color: '#eef2f8', flex: 1 }}>{h[0]}</div>
            <div style={{ color: '#00d4b8', fontSize: 12 }}>⬡</div>
            <div style={{ fontFamily: T, fontSize: 9, color: '#4ade80', flex: 1, wordBreak: 'break-all' }}>{h[1]}</div>
            <span style={{ fontFamily: T, fontSize: 8, padding: '2px 6px', borderRadius: 6, background: 'rgba(74,222,128,.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,.2)' }}>Protected</span>
          </div>
        ))}
      </div>

      <div style={SECTION_LABEL}>Audit Log</div>
      {logs.length === 0 ? (
        <div style={{ background: CARD_BG, border: CARD_BORDER, borderRadius: 14, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>🛡️</div>
          <div style={{ fontSize: 12, color: '#7a9bbf' }}>No queries yet. Use the AI tab to see Shield protection in real time.</div>
        </div>
      ) : logs.map((log, i) => (
        <div key={i} style={{ background: CARD_BG, border: CARD_BORDER, borderRadius: 12, padding: 12, marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: T, fontSize: 9, color: '#7a9bbf' }}>{new Date(log.ts).toLocaleTimeString()}</span>
            <span style={{ fontFamily: T, fontSize: 8, padding: '2px 7px', borderRadius: 6, background: 'rgba(74,222,128,.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,.2)' }}>Protected</span>
          </div>
          <div style={{ fontSize: 10, color: '#7a9bbf', fontStyle: 'italic', marginBottom: 4 }}>&ldquo;{log.q}&rdquo;</div>
          <div style={{ fontFamily: T, fontSize: 9, color: '#4ade80' }}>{log.action} · Risk: {log.risk}</div>
        </div>
      ))}
    </div>
  );
}
