'use client';
import { PATIENT, EMERGENCY_CONTACTS, type Medication } from '@/lib/data';
import { T, PAGE_PAD, SECTION_LABEL, CARD_BG, CARD_BORDER } from './ui';

export default function EmergencyPage({ meds }: { meds: Medication[] }) {
  const medList = meds.map(m => m.name).join(', ');

  return (
    <div style={PAGE_PAD}>
      <div style={{ background: 'linear-gradient(135deg,rgba(214,64,69,.15),rgba(214,64,69,.05))', border: '1px solid rgba(214,64,69,.3)', borderRadius: 16, padding: 18, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 18 }}>🚨</span>
          <span style={{ fontFamily: T, fontSize: 10, color: '#e8526e', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>Emergency Profile</span>
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#eef2f8', marginTop: 4 }}>{PATIENT.name}</div>
        <div style={{ fontSize: 11, color: '#7a9bbf', marginTop: 2 }}>One-tap profile for first responders &amp; ER staff</div>
        <div style={{ height: 1, background: 'rgba(255,255,255,.06)', margin: '14px 0' }} />
        <div style={{ display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#eef2f8', lineHeight: 1.6 }}>
            <span style={{ fontSize: 14 }}>❤️</span>
            <div><strong>Conditions:</strong> {PATIENT.condition}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#eef2f8', lineHeight: 1.6 }}>
            <span style={{ fontSize: 14 }}>💊</span>
            <div><strong>Medications:</strong> {medList}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#eef2f8', lineHeight: 1.6 }}>
            <span style={{ fontSize: 14 }}>🩸</span>
            <div><strong>Blood Type:</strong> {PATIENT.bloodType}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#eef2f8', lineHeight: 1.6 }}>
            <span style={{ fontSize: 14 }}>⚠️</span>
            <div><strong>Allergies:</strong> {PATIENT.allergies}</div>
          </div>
          <div style={{ display: 'flex', gap: 8, fontSize: 12, color: '#eef2f8', lineHeight: 1.6 }}>
            <span style={{ fontSize: 14 }}>👤</span>
            <div><strong>Primary Contact:</strong> Sarah Culwell — (405) 555-0188</div>
          </div>
        </div>
      </div>

      <div style={SECTION_LABEL}>Emergency Contacts</div>
      {EMERGENCY_CONTACTS.map((c, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', background: CARD_BG, border: CARD_BORDER, borderRadius: 14, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#eef2f8' }}>{c.name}</div>
            <div style={{ fontSize: 10, color: '#7a9bbf', marginTop: 2 }}>{c.relation}</div>
            <div style={{ fontFamily: T, fontSize: 11, color: '#00d4b8', marginTop: 3 }}>{c.phone}</div>
          </div>
          <a href={`tel:${c.phone.replace(/[^\d]/g, '')}`} style={{ background: 'rgba(74,222,128,.15)', border: '1px solid rgba(74,222,128,.3)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#4ade80', fontSize: 16, flexShrink: 0 }}>📞</a>
        </div>
      ))}

      <div style={{ background: 'rgba(91,143,168,.08)', border: '1px solid rgba(91,143,168,.2)', borderRadius: 14, padding: 14, marginTop: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#5B8FA8', marginBottom: 6 }}>📋 Care Notes for ER Staff</div>
        <div style={{ fontSize: 11, color: '#7a9bbf', lineHeight: 1.65 }}>
          Patient prefers to be called &ldquo;Eleanor.&rdquo; She has mild dementia — speak slowly and clearly, and avoid sudden changes.
          Power of attorney on file (Sarah Culwell, daughter). Advance directive specifies full code.
          Pharmacy: CVS on Main St. FQHC: {PATIENT.fqhc}.
        </div>
      </div>
    </div>
  );
}
