'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  PATIENT, DEFAULT_MEDS, DEFAULT_TASKS,
  type Medication, type Task, type ChatMessage, type ShieldLog,
} from '@/lib/data';
import { load, save } from '@/lib/storage';
import { T, O } from './dashboard/ui';
import HomePage from './dashboard/HomePage';
import MedsPage from './dashboard/MedsPage';
import CalendarPage from './dashboard/CalendarPage';
import TasksPage from './dashboard/TasksPage';
import VaultPage from './dashboard/VaultPage';
import FamilyPage from './dashboard/FamilyPage';
import EmergencyPage from './dashboard/EmergencyPage';
import CareIQPage from './dashboard/CareIQPage';
import ShieldPage from './dashboard/ShieldPage';
import AIPage from './dashboard/AIPage';
import Modals, { type ModalType } from './dashboard/Modals';

const FNAV = [
  { id: 'home', ico: '🏠', lbl: 'Home' },
  { id: 'meds', ico: '💊', lbl: 'Meds' },
  { id: 'calendar', ico: '📅', lbl: 'Cal' },
  { id: 'tasks', ico: '✅', lbl: 'Tasks' },
  { id: 'vault', ico: '🔐', lbl: 'Vault' },
  { id: 'family', ico: '👪', lbl: 'Family' },
  { id: 'ai', ico: '🤝', lbl: 'AI' },
  { id: 'emergency', ico: '🚨', lbl: 'SOS' },
];
const CNAV = [
  { id: 'careiq', ico: '⚕️', lbl: 'CareIQ' },
  { id: 'meds', ico: '💊', lbl: 'Meds' },
  { id: 'tasks', ico: '📋', lbl: 'Tasks' },
  { id: 'ai', ico: '🤝', lbl: 'AI' },
  { id: 'shield', ico: '🔒', lbl: 'Shield' },
];

const INITIAL_CHAT: ChatMessage[] = [
  { role: 'assistant', content: `Hello! I'm the CareCircle AI, here to help you coordinate ${PATIENT.short}'s care. Her medications are 74% on track today and she has 3 open care gaps. Everything you share is protected by the Sovereign Shield. How can I help?` },
];

export default function CareCircleApp() {
  const [showModal, setShowModal] = useState(true);
  const [view, setView] = useState<'family' | 'clinical'>('family');
  const [page, setPage] = useState('home');
  const [meds, setMeds] = useState<Medication[]>(DEFAULT_MEDS);
  const [tasks, setTasks] = useState<Task[]>(DEFAULT_TASKS);
  const [chatMsgs, setChatMsgs] = useState<ChatMessage[]>(INITIAL_CHAT);
  const [shieldLogs, setShieldLogs] = useState<ShieldLog[]>([]);
  const [notifPermission, setNotifPermission] = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setMeds(load('meds', DEFAULT_MEDS));
    setTasks(load('tasks', DEFAULT_TASKS));
    setChatMsgs(load('chat', INITIAL_CHAT));
    setHydrated(true);
    document.body.classList.add('app-shell');
    return () => { document.body.classList.remove('app-shell'); };
  }, []);

  useEffect(() => { if (hydrated) save('meds', meds); }, [meds, hydrated]);
  useEffect(() => { if (hydrated) save('tasks', tasks); }, [tasks, hydrated]);
  useEffect(() => { if (hydrated) save('chat', chatMsgs); }, [chatMsgs, hydrated]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      setNotifPermission(true);
    }
  }, []);

  const enableNotif = useCallback(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission().then(p => {
        if (p === 'granted') {
          setNotifPermission(true);
          new Notification('🎉 CareCircle Notifications Enabled', { body: `You'll receive reminders for ${PATIENT.short}'s care.` });
        }
      });
    }
  }, []);

  const toggleMed = (id: string) => setMeds(prev => prev.map(m => m.id === id ? { ...m, taken: !m.taken } : m));
  const toggleTask = (id: string) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const addMed = (m: Medication) => setMeds(prev => [...prev, m]);
  const addTask = (t: Task) => setTasks(prev => [...prev, t]);
  const addLog = (l: ShieldLog) => setShieldLogs(prev => [l, ...prev].slice(0, 20));

  const nav = view === 'family' ? FNAV : CNAV;
  const validPages = nav.map(n => n.id);
  const activePage = validPages.includes(page) ? page : nav[0].id;

  const renderPage = () => {
    switch (activePage) {
      case 'meds': return <MedsPage meds={meds} onToggle={toggleMed} onAdd={() => setModal('addMed')} />;
      case 'calendar': return <CalendarPage />;
      case 'tasks': return <TasksPage tasks={tasks} onToggle={toggleTask} onAdd={() => setModal('addTask')} />;
      case 'vault': return <VaultPage onUpload={() => setModal('upload')} />;
      case 'family': return <FamilyPage />;
      case 'emergency': return <EmergencyPage meds={meds} />;
      case 'ai': return <AIPage msgs={chatMsgs} setMsgs={setChatMsgs} addLog={addLog} />;
      case 'careiq': return <CareIQPage meds={meds} />;
      case 'shield': return <ShieldPage logs={shieldLogs} />;
      default: return <HomePage meds={meds} tasks={tasks} notifPermission={notifPermission} onRequestNotif={enableNotif} setPage={setPage} />;
    }
  };

  return (
    <>
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(7,16,31,.96)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#0c1a2e', border: '1px solid #00d4b8', borderRadius: 20, padding: 32, maxWidth: 480, width: '100%', textAlign: 'center', boxShadow: '0 0 60px rgba(0,212,184,.2)' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🛡️</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 20, color: '#00d4b8', marginBottom: 8 }}>Child Data Protection Active</div>
            <div style={{ fontSize: 13, color: '#7a9bbf', lineHeight: 1.75, marginBottom: 18 }}>
              CareCircle hashes all patient identifiers, medication names, and family data at your device before any AI processing. {PATIENT.short}&apos;s care information never reaches a commercial server in readable form.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center', marginBottom: 22 }}>
              {[['Eleanor Culwell', 'ZK:A4F2C891'], ['DOB:1948-03-12', 'ZK:B7E3D204'], ['MRN:CC-001', 'ZK:C1A9F563'], ['Metformin', 'ZK:D8B2E417']].map(([k, v], i) => (
                <div key={i} style={{ background: 'rgba(0,212,184,.08)', border: '1px solid rgba(0,212,184,.2)', borderRadius: 6, padding: '4px 10px', fontFamily: T, fontSize: 10, color: '#00d4b8' }}>
                  {k} <span style={{ color: '#7a9bbf', fontSize: 9 }}>{v}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowModal(false)} style={{ background: 'linear-gradient(135deg,#0d2e1e,#156040)', color: '#faf0dc', border: 'none', borderRadius: 10, padding: '13px 32px', fontFamily: O, fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 20px rgba(0,212,184,.3)' }}>
              Enter CareCircle ⬡
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: 480, margin: '0 auto', background: '#07101f', fontFamily: O, color: '#eef2f8', position: 'relative' }}>

        <div style={{ flexShrink: 0, padding: '14px 18px 12px', background: 'rgba(7,16,31,.97)', borderBottom: '1px solid rgba(0,212,184,.14)', backdropFilter: 'blur(20px)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg,#00b89e,#8060cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 4px 18px rgba(0,212,184,.25)' }}>🤝</div>
              <div>
                <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, color: '#eef2f8' }}>CareCircle</div>
                <div style={{ fontFamily: T, fontSize: 8, color: '#00d4b8', letterSpacing: '.18em', textTransform: 'uppercase', marginTop: 1 }}>FQHC Elder Care Coordination</div>
              </div>
            </Link>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{PATIENT.name}</div>
              <div style={{ fontFamily: T, fontSize: 9, color: '#7a9bbf', marginTop: 1 }}>{PATIENT.id}</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: T, fontSize: 8, color: '#4ade80', marginTop: 3 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 2s infinite' }} />SHIELD ON
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 5, padding: '8px 18px', background: 'rgba(7,16,31,.95)', borderBottom: '1px solid rgba(0,212,184,.14)', flexShrink: 0 }}>
          <button onClick={() => { setView('family'); setPage('home'); }} style={{ flex: 1, padding: '7px 0', borderRadius: 20, border: `1px solid ${view === 'family' ? 'transparent' : 'rgba(0,212,184,.14)'}`, background: view === 'family' ? 'linear-gradient(135deg,#00d4b8,#00b89e)' : 'rgba(255,255,255,.04)', color: view === 'family' ? '#07101f' : '#7a9bbf', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: O }}>👪 Family View</button>
          <button onClick={() => { setView('clinical'); setPage('careiq'); }} style={{ flex: 1, padding: '7px 0', borderRadius: 20, border: `1px solid ${view === 'clinical' ? 'transparent' : 'rgba(0,212,184,.14)'}`, background: view === 'clinical' ? 'linear-gradient(135deg,#8060cc,#6040aa)' : 'rgba(255,255,255,.04)', color: view === 'clinical' ? '#eef2f8' : '#7a9bbf', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: O }}>⚕️ Clinical View</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', minHeight: 0 }}>
          {renderPage()}
        </div>

        <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, zIndex: 20, background: 'rgba(7,16,31,.97)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(0,212,184,.14)', display: 'flex', padding: '7px 0 14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {nav.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{ flex: '1 0 auto', minWidth: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 4px', cursor: 'pointer', border: 'none', background: 'none', color: activePage === n.id ? '#00d4b8' : '#7a9bbf', fontFamily: O, transition: 'color .2s' }}>
              <span style={{ fontSize: 18 }}>{n.ico}</span>
              <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>{n.lbl}</span>
            </button>
          ))}
        </div>
      </div>

      <Modals
        type={modal}
        onClose={() => setModal(null)}
        onAddMed={addMed}
        onAddTask={addTask}
        onEnableNotif={enableNotif}
      />
    </>
  );
}
