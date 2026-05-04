'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { PATIENT, AI_RESPONSES, type ChatMessage, type ShieldLog } from '@/lib/data';
import { T, O, CARD_BG, CARD_BORDER } from './ui';

const QUICK = [
  "Eleanor's meds today",
  'Visit summary',
  'Family update',
  'This week',
  'Care gap help',
  'Medication side effects',
];

export default function AIPage({
  msgs, setMsgs, addLog,
}: {
  msgs: ChatMessage[];
  setMsgs: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  addLog: (l: ShieldLog) => void;
}) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  const send = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    const userMsg: ChatMessage = { role: 'user', content: msg };
    const newMsgs: ChatMessage[] = [...msgs, userMsg];
    setMsgs([...newMsgs, { role: 'assistant', content: '...' }]);
    setLoading(true);
    try {
      const res = await fetch('/api/shield', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMsgs, patientId: PATIENT.id }),
      });
      if (!res.ok) throw new Error('shield error');
      const data = await res.json();
      setMsgs([...newMsgs, { role: 'assistant', content: data.content || 'Unable to connect.' }]);
      addLog({ ts: new Date().toISOString(), q: msg.substring(0, 50) + (msg.length > 50 ? '...' : ''), action: data.shield?.action || 'CLEAN_PASS', risk: data.shield?.riskLevel || 'LOW' });
    } catch {
      const key = Object.keys(AI_RESPONSES).find(k => msg.toLowerCase().includes(k)) || 'default';
      setMsgs([...newMsgs, { role: 'assistant', content: AI_RESPONSES[key] }]);
      addLog({ ts: new Date().toISOString(), q: msg.substring(0, 50) + (msg.length > 50 ? '...' : ''), action: 'LOCAL_FALLBACK', risk: 'LOW' });
    }
    setLoading(false);
  }, [input, msgs, loading, setMsgs, addLog]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px 18px 0', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#00d4b8,#8060cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>🤝</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>CareCircle AI</div>
          <div style={{ fontFamily: T, fontSize: 9, color: '#00d4b8' }}>Family Care Coordinator · Shield Active</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 7, marginBottom: 10, overflowX: 'auto', scrollbarWidth: 'none', flexShrink: 0 }}>
        {QUICK.map(q => (
          <button key={q} onClick={() => send(q)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 20, fontSize: 10, cursor: 'pointer', border: CARD_BORDER, background: CARD_BG, color: '#7a9bbf', whiteSpace: 'nowrap', fontFamily: O }}>{q}</button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8, scrollbarWidth: 'none', minHeight: 0 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ maxWidth: '88%', marginBottom: 12, marginLeft: m.role === 'user' ? 'auto' : 0 }}>
            <div style={{ padding: '11px 15px', borderRadius: 18, fontSize: 12, lineHeight: 1.65, background: m.role === 'assistant' ? 'rgba(255,255,255,.07)' : 'linear-gradient(135deg,#00d4b8,#00b89e)', border: m.role === 'assistant' ? CARD_BORDER : 'none', color: m.role === 'assistant' ? '#eef2f8' : '#07101f', fontWeight: m.role === 'user' ? 500 : 400, borderBottomRightRadius: m.role === 'user' ? 4 : 18, borderBottomLeftRadius: m.role === 'assistant' ? 4 : 18, whiteSpace: 'pre-wrap' }}>
              {m.content === '...' ? <span style={{ color: '#7a9bbf', fontStyle: 'italic' }}>CareCircle AI is thinking...</span> : m.content}
            </div>
            <div style={{ fontFamily: T, fontSize: 9, color: '#7a9bbf', marginTop: 3 }}>{m.role === 'assistant' ? '🤝 CareCircle AI' : 'You'}</div>
            {m.role === 'assistant' && m.content !== '...' && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: T, fontSize: 8, padding: '2px 7px', borderRadius: 6, marginTop: 4, background: 'rgba(74,222,128,.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,.2)' }}>🔒 Shield Protected</div>}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div style={{ borderTop: CARD_BORDER, padding: '10px 0 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 9 }}>
          <input style={{ flex: 1, background: 'rgba(255,255,255,.05)', border: CARD_BORDER, borderRadius: 24, padding: '11px 17px', fontSize: 12, color: '#eef2f8', fontFamily: O, outline: 'none' }} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={`Ask about ${PATIENT.short}'s care...`} aria-label="Chat input" />
          <button style={{ width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#00d4b8,#00b89e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0, boxShadow: '0 4px 14px rgba(0,212,184,.28)' }} onClick={() => send()} disabled={loading} aria-label="Send">➤</button>
        </div>
      </div>
    </div>
  );
}
