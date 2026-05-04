'use client';
import { PAGE_PAD, SECTION_LABEL, CARD_BG, CARD_BORDER } from './ui';

export default function VaultPage() {
  return (
    <div style={PAGE_PAD}>
      <div style={SECTION_LABEL}>Document Vault</div>
      <div
        style={{
          background: CARD_BG,
          border: CARD_BORDER,
          borderRadius: 14,
          padding: 28,
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 700, color: '#eef2f8', marginBottom: 8 }}>
          Coming soon
        </div>
        <div style={{ fontSize: 11, color: '#7a9bbf', lineHeight: 1.6 }}>
          Lab files in CareIQ are stored as encrypted blobs. Family-side viewing requires a signed
          download URL flow that is not yet built.
        </div>
      </div>
    </div>
  );
}
