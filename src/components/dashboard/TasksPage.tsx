'use client';
import { FAMILY, type Task } from '@/lib/data';
import { T, O, pc, PAGE_PAD, SECTION_LABEL, CARD_BG } from './ui';

const getMember = (id: string) => FAMILY.find(m => m.id === id);

export default function TasksPage({
  tasks, onToggle, onAdd,
}: {
  tasks: Task[];
  onToggle: (id: string) => void;
  onAdd: () => void;
}) {
  const doneCount = tasks.filter(t => t.done).length;

  return (
    <div style={PAGE_PAD}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ ...SECTION_LABEL, marginBottom: 0 }}>Care Tasks · {doneCount}/{tasks.length} done</div>
        <button onClick={onAdd} style={{ background: 'rgba(0,212,184,.15)', border: '1px solid rgba(0,212,184,.25)', borderRadius: 10, padding: '6px 12px', color: '#00d4b8', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: O }}>+ Add Task</button>
      </div>

      {(['high', 'medium', 'low'] as const).map(priority => {
        const pt = tasks.filter(t => t.priority === priority);
        if (!pt.length) return null;
        const labels = { high: 'Urgent', medium: 'This Week', low: 'Routine' } as const;
        return (
          <div key={priority} style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: T, fontSize: 9, color: pc(priority), textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>{labels[priority]}</div>
            {pt.map(t => {
              const m = getMember(t.assignee);
              return (
                <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px', background: CARD_BG, border: `1px solid ${t.done ? 'rgba(74,222,128,.15)' : pc(t.priority) + '20'}`, borderRadius: 14, marginBottom: 8, opacity: t.done ? .6 : 1, transition: 'all .2s' }}>
                  <button onClick={() => onToggle(t.id)} style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${t.done ? '#4ade80' : pc(t.priority)}`, background: t.done ? '#4ade80' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0, marginTop: 1, transition: 'all .2s' }}>
                    {t.done ? '✓' : ''}
                  </button>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.done ? '#7a9bbf' : '#eef2f8', textDecoration: t.done ? 'line-through' : 'none' }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: '#7a9bbf', marginTop: 3, lineHeight: 1.5 }}>{t.desc}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      {m && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#eef2f8' }}>
                          <span style={{ width: 16, height: 16, borderRadius: '50%', background: m.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff', fontWeight: 700 }}>{m.avatar}</span>
                          {m.name.split(' ')[0]}
                        </span>
                      )}
                      <span style={{ fontFamily: T, fontSize: 9, color: pc(t.priority) }}>Due: {t.due}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
