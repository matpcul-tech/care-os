'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  loadSession,
  ensureValidSession,
  type CCSession,
} from '@/lib/cc-data';
import { type ChatMessage, type ShieldLog } from '@/lib/data';
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

// Emoji bottom-nav restored to match the original CareCircle aesthetic.
// All labels are short. Icons are emoji glyphs.
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

export default function CareCircleApp() {
  const router = useRouter();
  const [session, setSession] = useState<CCSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'family' | 'clinical'>('family');
  const [page, setPage] = useState('home');
  const [chatMsgs, setChatMsgs] = useState<ChatMessage[]>([]);
  const [shieldLogs, setShieldLogs] = useState<ShieldLog[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = loadSession();
      if (!s) {
        router.push('/login');
        return;
      }
      const valid = await ensureValidSession(s);
      if (cancelled) return;
      if (!valid) {
        window.localStorage.removeItem('cc-session');
        router.push('/login');
        return;
      }
      setSession(valid);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const addLog = useCallback(
    (l: ShieldLog) => setShieldLogs((prev) => [l, ...prev].slice(0, 20)),
    [],
  );

  const signOut = useCallback(() => {
    window.localStorage.removeItem('cc-session');
    router.push('/login');
  }, [router]);

  if (loading || !session) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#07101f',
          color: '#7a9bbf',
          fontFamily: O,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
        }}
      >
        Loading dashboard...
      </div>
    );
  }

  const nav = view === 'family' ? FNAV : CNAV;
  const validPages = nav.map((n) => n.id);
  const activePage = validPages.includes(page) ? page : nav[0].id;
  const patientLabel = session.patient_name || `Patient ${session.patient_id.slice(0, 8)}`;

  const renderPage = () => {
    switch (activePage) {
      case 'meds':
        return <MedsPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'tasks':
        return <TasksPage />;
      case 'vault':
        return <VaultPage />;
      case 'family':
        return <FamilyPage />;
      case 'emergency':
        return <EmergencyPage session={session} />;
      case 'ai':
        return (
          <AIPage session={session} msgs={chatMsgs} setMsgs={setChatMsgs} addLog={addLog} />
        );
      case 'careiq':
        return <CareIQPage session={session} />;
      case 'shield':
        return <ShieldPage logs={shieldLogs} />;
      default:
        return <HomePage session={session} setPage={setPage} />;
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        maxWidth: 480,
        margin: '0 auto',
        background: '#07101f',
        fontFamily: O,
        color: '#eef2f8',
        position: 'relative',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Mono:wght@300;400;500&family=Outfit:wght@300;400;500;600;700&display=swap');
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
      `}</style>

      <div
        style={{
          flexShrink: 0,
          padding: '14px 18px 12px',
          background: 'rgba(7,16,31,.97)',
          borderBottom: '1px solid rgba(0,212,184,.14)',
          backdropFilter: 'blur(20px)',
          zIndex: 10,
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background:
              'linear-gradient(90deg,transparent,#00d4b8,#8060cc,#00d4b8,transparent)',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <Link
            href="/"
            style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', minWidth: 0 }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: 'linear-gradient(135deg,#00b89e,#8060cc)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                color: '#fff',
                boxShadow: '0 4px 18px rgba(0,212,184,.25)',
                flexShrink: 0,
              }}
            >
              {'🤝'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 16, color: '#eef2f8' }}>
                CareCircle
              </div>
              <div
                style={{
                  fontFamily: T,
                  fontSize: 8,
                  color: '#00d4b8',
                  letterSpacing: '.18em',
                  textTransform: 'uppercase',
                  marginTop: 1,
                }}
              >
                Family Coordination
              </div>
            </div>
          </Link>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>{patientLabel}</div>
            <div style={{ fontFamily: T, fontSize: 9, color: '#7a9bbf', marginTop: 1 }}>
              {session.patient_id.slice(0, 8)}...
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontFamily: T,
                fontSize: 8,
                color: '#4ade80',
                marginTop: 3,
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#4ade80',
                  animation: 'pulse 2s infinite',
                }}
              />
              SHIELD ON
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 5,
          padding: '8px 18px',
          background: 'rgba(7,16,31,.95)',
          borderBottom: '1px solid rgba(0,212,184,.14)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => {
            setView('family');
            setPage('home');
          }}
          style={{
            flex: 1,
            padding: '7px 0',
            borderRadius: 20,
            border: `1px solid ${view === 'family' ? 'transparent' : 'rgba(0,212,184,.14)'}`,
            background:
              view === 'family'
                ? 'linear-gradient(135deg,#00d4b8,#00b89e)'
                : 'rgba(255,255,255,.04)',
            color: view === 'family' ? '#07101f' : '#7a9bbf',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: O,
            boxShadow: view === 'family' ? '0 0 14px rgba(0,212,184,.25)' : 'none',
          }}
        >
          {'👪'} Family View
        </button>
        <button
          onClick={() => {
            setView('clinical');
            setPage('careiq');
          }}
          style={{
            flex: 1,
            padding: '7px 0',
            borderRadius: 20,
            border: `1px solid ${view === 'clinical' ? 'transparent' : 'rgba(0,212,184,.14)'}`,
            background:
              view === 'clinical'
                ? 'linear-gradient(135deg,#8060cc,#6040aa)'
                : 'rgba(255,255,255,.04)',
            color: view === 'clinical' ? '#eef2f8' : '#7a9bbf',
            fontSize: 11,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: O,
            boxShadow: view === 'clinical' ? '0 0 14px rgba(128,96,204,.25)' : 'none',
          }}
        >
          {'⚕️'} Clinical View
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none', minHeight: 0 }}>
        {renderPage()}
        <div style={{ padding: '12px 18px 24px' }}>
          <button
            onClick={signOut}
            style={{
              width: '100%',
              padding: '10px 0',
              borderRadius: 10,
              border: '1px solid rgba(0,212,184,.14)',
              cursor: 'pointer',
              background: 'rgba(255,255,255,.04)',
              color: '#7a9bbf',
              fontSize: 11,
              fontWeight: 600,
              fontFamily: O,
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 480,
          zIndex: 20,
          background: 'rgba(7,16,31,.97)',
          backdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(0,212,184,.14)',
          display: 'flex',
          padding: '7px 0 14px',
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        {nav.map((n) => (
          <button
            key={n.id}
            onClick={() => setPage(n.id)}
            style={{
              flex: '1 0 auto',
              minWidth: 56,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              padding: '6px 4px',
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              color: activePage === n.id ? '#00d4b8' : '#7a9bbf',
              fontFamily: O,
              transition: 'color .2s',
            }}
          >
            <span style={{ fontSize: 18 }}>{n.ico}</span>
            <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: '.05em', textTransform: 'uppercase' }}>
              {n.lbl}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
