'use client';
import { PAGE_PAD, SECTION_LABEL, CARD_BG, CARD_BORDER } from './ui';

export default function TasksPage() {
  return (
    <div style={PAGE_PAD}>
      <div style={SECTION_LABEL}>Care Tasks</div>
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
          Care task assignments are not in the current schema. Coordination between family members
          will land here once a tasks table is added.
        </div>
      </div>
    </div>
  );
}
