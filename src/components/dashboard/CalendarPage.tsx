'use client';
import { DEFAULT_APPOINTMENTS } from '@/lib/data';
import { T, PAGE_PAD, SECTION_LABEL, CARD_BG, CARD_BORDER } from './ui';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CalendarPage() {
  const today = 27;
  const dates = Array.from({ length: 28 }, (_, i) => i + 1);
  const apptDates = [28, 3, 14, 16];

  return (
    <div style={PAGE_PAD}>
      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, color: '#eef2f8', marginTop: 4, marginBottom: 16 }}>April 2026</div>

      <div style={{ background: CARD_BG, border: CARD_BORDER, borderRadius: 14, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 8 }}>
          {DAYS.map(d => (
            <div key={d} style={{ fontFamily: T, fontSize: 9, color: '#7a9bbf', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1, padding: '4px 0' }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
          {dates.map(d => {
            const isToday = d === today;
            const hasAppt = apptDates.includes(d);
            return (
              <div key={d} style={{ position: 'relative', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, fontSize: 12, fontWeight: isToday ? 700 : 400, color: isToday ? '#07101f' : '#eef2f8', background: isToday ? '#00d4b8' : 'transparent', cursor: 'pointer' }}>
                {d}
                {hasAppt && <div style={{ position: 'absolute', bottom: 4, width: 4, height: 4, borderRadius: '50%', background: isToday ? '#07101f' : '#00d4b8' }} />}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ ...SECTION_LABEL, marginTop: 16 }}>All Appointments</div>
      {DEFAULT_APPOINTMENTS.map(appt => (
        <div key={appt.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px', background: CARD_BG, border: CARD_BORDER, borderRadius: 14, marginBottom: 10 }}>
          <div style={{ width: 50, height: 50, borderRadius: 12, background: 'linear-gradient(135deg,rgba(0,212,184,.15),rgba(128,96,204,.1))', border: '1px solid rgba(0,212,184,.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <div style={{ fontFamily: T, fontSize: 9, color: '#7a9bbf', textTransform: 'uppercase' }}>{appt.date.split(' ')[0]}</div>
            <div style={{ fontFamily: T, fontSize: 16, fontWeight: 700, color: '#00d4b8' }}>{appt.date.split(' ')[1]}</div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#eef2f8' }}>{appt.title}</div>
            <div style={{ fontFamily: T, fontSize: 10, color: '#7a9bbf', marginTop: 3 }}>🕐 {appt.time} · 📍 {appt.location}</div>
            <div style={{ fontSize: 11, color: '#7a9bbf', marginTop: 6, lineHeight: 1.5, fontStyle: 'italic' }}>📝 {appt.notes}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
