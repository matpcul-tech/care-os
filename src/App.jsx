import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Home, Pill, Calendar, CheckSquare, FolderLock, Bot, Activity,
  Bell, Plus, Check, Clock, User, Send, Phone, Heart, X,
  Upload, ChevronRight, Shield, AlertCircle, Settings, ArrowLeft
} from 'lucide-react'
import { load, save } from './storage'
import { requestPermission, scheduleMedReminders, sendNotification } from './notifications'
import {
  FAMILY_MEMBERS, DEFAULT_MEDS, DEFAULT_APPOINTMENTS, DEFAULT_TASKS,
  DOCUMENTS, EMERGENCY_CONTACTS, AI_SUGGESTIONS, FEED_ITEMS, AI_RESPONSES
} from './data'
import './App.css'

// ─── Helper ───
const getMember = (id) => FAMILY_MEMBERS.find(m => m.id === id)

// ══════════════════════════════════════════
// PAGES
// ══════════════════════════════════════════

function DashboardPage({ meds, tasks, setMeds, setPage }) {
  const taken = meds.filter(m => m.taken).length
  const pending = tasks.filter(t => !t.done).length

  return (
    <div className="page-content">
      {/* Stats */}
      <div className="stat-row">
        <div className="stat-chip">
          <div className="stat-number green">{taken}/{meds.length}</div>
          <div className="stat-label">Meds Taken</div>
        </div>
        <div className="stat-chip">
          <div className="stat-number accent">{pending}</div>
          <div className="stat-label">Open Tasks</div>
        </div>
        <div className="stat-chip">
          <div className="stat-number blue">2</div>
          <div className="stat-label">This Week</div>
        </div>
      </div>

      {/* AI Suggestions */}
      <div className="ai-banner">
        <div className="ai-banner-header">
          <Bot size={16} /> CareCircle AI — Today's Actions
        </div>
        {AI_SUGGESTIONS.slice(0, 3).map((s, i) => (
          <div key={i} className="ai-suggestion">
            <span className="ai-suggestion-icon">{s.icon}</span>
            <span className="ai-suggestion-text">{s.text}</span>
            <button className="ai-suggestion-btn" onClick={() => setPage('ai')}>{s.action}</button>
          </div>
        ))}
      </div>

      {/* Meds */}
      <div className="section-header">
        <span className="section-title">Today's Medications</span>
        <button className="section-action" onClick={() => setPage('meds')}>See all</button>
      </div>
      {meds.map(med => (
        <div key={med.id} className="card">
          <div className="card-row">
            <button
              className={`med-status ${med.taken ? 'med-taken' : 'med-pending'}`}
              onClick={() => setMeds(prev => prev.map(m => m.id === med.id ? { ...m, taken: !m.taken } : m))}
            >
              {med.taken && <Check size={16} />}
            </button>
            <div className="card-content">
              <div className="card-title">{med.name}</div>
              <div className="card-subtitle">{med.schedule}</div>
              {med.pillsLeft <= 10 && (
                <div className="refill-warning">
                  <AlertCircle size={12} /> {med.pillsLeft} pills left — refill by {med.refillDate}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Appointments */}
      <div className="section-header">
        <span className="section-title">Upcoming Appointments</span>
        <button className="section-action" onClick={() => setPage('calendar')}>See all</button>
      </div>
      {DEFAULT_APPOINTMENTS.slice(0, 2).map(appt => (
        <div key={appt.id} className="card">
          <div className="card-row">
            <div className="appt-date-block">
              <div className="appt-day">{appt.date.split(' ')[1]}</div>
              <div className="appt-month">{appt.date.split(' ')[0]}</div>
            </div>
            <div className="appt-divider" />
            <div className="card-content">
              <div className="card-title">{appt.title}</div>
              <div className="card-subtitle">
                <Clock size={12} /> {appt.time} · {appt.location}
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Activity Feed */}
      <div className="section-header">
        <span className="section-title">Family Activity</span>
      </div>
      {FEED_ITEMS.map((item, i) => (
        <div key={i} className="feed-item">
          <div className="feed-avatar" style={{ background: item.color }}>{item.avatar}</div>
          <div>
            <div className="feed-text">
              <span className="feed-who">{item.who}</span> {item.action}: {item.what}
            </div>
            <div className="feed-time">{item.time}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function MedsPage({ meds, setMeds, setModal }) {
  return (
    <div className="page-content">
      <div className="page-top-row">
        <span className="page-title">Medications</span>
        <button className="add-btn" onClick={() => setModal('addMed')}>
          <Plus size={16} /> Add Med
        </button>
      </div>

      {meds.some(m => m.pillsLeft <= 10) && (
        <div className="card alert-card">
          <span>⚠️</span>
          <span><strong>Refill Alert:</strong> Amlodipine 5mg has only 6 pills remaining. Refill by Apr 10.</span>
        </div>
      )}

      <div className="section-header">
        <span className="section-title">Morning</span>
        <span className="section-count">{meds.filter(m => m.schedule.includes('AM') || m.schedule.includes('Morning')).length} medications</span>
      </div>
      {meds.filter(m => m.schedule.includes('AM') || m.schedule.includes('Morning')).map(med => (
        <div key={med.id} className="card">
          <div className="card-row">
            <button
              className={`med-status ${med.taken ? 'med-taken' : 'med-pending'}`}
              onClick={() => setMeds(prev => prev.map(m => m.id === med.id ? { ...m, taken: !m.taken } : m))}
            >
              {med.taken && <Check size={16} />}
            </button>
            <div className="card-content">
              <div className="card-title">{med.name}</div>
              <div className="card-subtitle">{med.schedule}</div>
              <div className="badge-row">
                <span className="badge badge-neutral">{med.pillsLeft} pills left</span>
                <span className="badge badge-blue">Refill {med.refillDate}</span>
              </div>
              {med.notes && <div className="card-note">{med.notes}</div>}
            </div>
          </div>
        </div>
      ))}

      <div className="section-header">
        <span className="section-title">Evening</span>
        <span className="section-count">{meds.filter(m => m.schedule.includes('PM') && !m.schedule.includes('AM')).length} medication</span>
      </div>
      {meds.filter(m => m.schedule.includes('PM') && !m.schedule.includes('AM')).map(med => (
        <div key={med.id} className="card">
          <div className="card-row">
            <button
              className={`med-status ${med.taken ? 'med-taken' : 'med-pending'}`}
              onClick={() => setMeds(prev => prev.map(m => m.id === med.id ? { ...m, taken: !m.taken } : m))}
            >
              {med.taken && <Check size={16} />}
            </button>
            <div className="card-content">
              <div className="card-title">{med.name}</div>
              <div className="card-subtitle">{med.schedule}</div>
              {med.pillsLeft <= 10 && (
                <div className="refill-warning">
                  <AlertCircle size={12} /> Low supply — {med.pillsLeft} left
                </div>
              )}
              {med.notes && <div className="card-note">{med.notes}</div>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function CalendarPage() {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
  const dates = [31,1,2,3,4,5,6,7,8,9,10,11,12,13]
  const hasAppt = [3,7,14,16]

  return (
    <div className="page-content">
      <div className="page-title" style={{ marginTop: 8, marginBottom: 16 }}>April 2026</div>

      <div className="cal-grid">
        {days.map(d => <div key={d} className="cal-day-label">{d}</div>)}
        {dates.map((d, i) => (
          <div key={i} className={`cal-date ${d === 1 ? 'today' : ''} ${d < 1 ? 'muted' : ''}`}>
            {d}
            {hasAppt.includes(d) && <div className={`cal-dot ${d === 1 ? 'white' : ''}`} />}
          </div>
        ))}
      </div>

      <div className="section-header">
        <span className="section-title">All Appointments</span>
      </div>
      {DEFAULT_APPOINTMENTS.map(appt => (
        <div key={appt.id} className="card">
          <div className="card-row">
            <div className="appt-date-block">
              <div className="appt-day">{appt.date.split(' ')[1]}</div>
              <div className="appt-month">{appt.date.split(' ')[0]}</div>
            </div>
            <div className="appt-divider" />
            <div className="card-content">
              <div className="card-title">{appt.title}</div>
              <div className="card-subtitle"><Clock size={12} /> {appt.time} · {appt.location}</div>
              <div className="card-note">📝 {appt.notes}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function TasksPage({ tasks, setTasks, setModal }) {
  const toggle = (id) => setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const pending = tasks.filter(t => !t.done).sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 }
    return p[a.priority] - p[b.priority]
  })
  const completed = tasks.filter(t => t.done)

  const renderTask = (task, faded = false) => {
    const member = getMember(task.assignee)
    return (
      <div key={task.id} className="card" style={faded ? { opacity: 0.5 } : {}}>
        <div className="card-row" style={{ alignItems: 'flex-start' }}>
          <button className={`task-checkbox ${task.done ? 'checked' : ''}`} onClick={() => toggle(task.id)}>
            {task.done && <Check size={12} />}
          </button>
          <div className="card-content">
            <div className={`task-text ${task.done ? 'done' : ''}`}>{task.text}</div>
            <div className="task-meta">
              <span className="task-assignee">
                <span className="assignee-dot" style={{ background: member?.color }}>{member?.avatar}</span>
                {member?.name?.split(' ')[0] || task.assignee}
              </span>
              {!task.done && <span className={`priority-tag priority-${task.priority}`}>{task.priority}</span>}
              <span className="task-due">Due {task.due}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="page-top-row">
        <span className="page-title">Care Tasks</span>
        <button className="add-btn" onClick={() => setModal('addTask')}>
          <Plus size={16} /> Add Task
        </button>
      </div>
      {pending.map(t => renderTask(t))}
      {completed.length > 0 && (
        <>
          <div className="section-header">
            <span className="section-title muted">Completed</span>
          </div>
          {completed.map(t => renderTask(t, true))}
        </>
      )}
    </div>
  )
}

function DocsPage({ setModal }) {
  const [filter, setFilter] = useState('All')
  const types = ['All', 'Medical', 'Insurance', 'Legal', 'Care Plan']
  const filtered = filter === 'All' ? DOCUMENTS : DOCUMENTS.filter(d => d.type === filter)

  return (
    <div className="page-content">
      <div className="page-top-row">
        <span className="page-title">Document Vault</span>
        <button className="add-btn" onClick={() => setModal('upload')}>
          <Upload size={16} /> Upload
        </button>
      </div>

      <div className="doc-filter-row">
        {types.map(t => (
          <button key={t} className={`doc-filter ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>{t}</button>
        ))}
      </div>

      <div className="security-badge">
        <Shield size={16} />
        <span>All documents encrypted and HIPAA-ready</span>
      </div>

      <div className="doc-grid">
        {filtered.map(doc => (
          <div key={doc.id} className="doc-card">
            <div className="doc-icon">{doc.icon}</div>
            <div className="doc-name">{doc.name}</div>
            <div className="doc-meta">{doc.type} · {doc.date}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AIPage() {
  const [messages, setMessages] = useState(() => load('ai-chat', [
    { role: 'bot', text: "Hi Matt! I'm your CareCircle assistant. I can help manage Mom's care — from medication schedules to appointment prep to keeping siblings updated. What can I do for you?" }
  ]))
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const chatEnd = useRef(null)

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  useEffect(() => {
    save('ai-chat', messages)
  }, [messages])

  const send = useCallback((text) => {
    if (!text.trim()) return
    const userMsg = { role: 'user', text: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)

    const key = Object.keys(AI_RESPONSES).find(k => text.toLowerCase().includes(k)) || 'default'

    setTimeout(() => {
      setTyping(false)
      setMessages(prev => [...prev, { role: 'bot', text: AI_RESPONSES[key] }])
    }, 1000 + Math.random() * 800)
  }, [])

  return (
    <div className="page-content" style={{ paddingBottom: 80, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)' }}>
      <div className="page-title" style={{ marginTop: 8, marginBottom: 12, flexShrink: 0 }}>AI Care Assistant</div>

      <div className="quick-actions" style={{ flexShrink: 0 }}>
        <button className="quick-action" onClick={() => send('Summarize last visit')}>📋 Visit Summary</button>
        <button className="quick-action" onClick={() => send('Draft family update')}>👨‍👩‍👦 Family Update</button>
        <button className="quick-action" onClick={() => send("What's coming up")}>📅 This Week</button>
      </div>

      <div className="chat-messages" style={{ flex: 1, overflowY: 'auto' }}>
        {messages.map((msg, i) => (
          <div key={i} className={`chat-bubble ${msg.role}`}>{msg.text}</div>
        ))}
        {typing && (
          <div className="chat-bubble bot">
            <div className="typing-dots"><span /><span /><span /></div>
          </div>
        )}
        <div ref={chatEnd} />
      </div>

      <div className="chat-input-row" style={{ flexShrink: 0 }}>
        <input
          className="chat-input"
          placeholder="Ask about Mom's care..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send(input)}
        />
        <button className="chat-send" onClick={() => send(input)}>
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}

function EmergencyPage() {
  return (
    <div className="page-content">
      <div className="page-title" style={{ marginTop: 8, marginBottom: 16 }}>Emergency Profile</div>

      <div className="emergency-card">
        <h3>Dorothy M. (Mom)</h3>
        <div className="emergency-subtitle">One-tap profile for first responders & ER staff</div>
        <div className="emergency-detail"><Heart size={14} /> <strong>Conditions:</strong>&nbsp;Type 2 Diabetes, Hypertension, Mild OA</div>
        <div className="emergency-detail"><Pill size={14} /> <strong>Medications:</strong>&nbsp;Lisinopril 10mg, Metformin 500mg, Amlodipine 5mg, Vitamin D3</div>
        <div className="emergency-detail"><span>🩸</span> <strong>Blood Type:</strong>&nbsp;O+</div>
        <div className="emergency-detail"><span>⚠️</span> <strong>Allergies:</strong>&nbsp;Penicillin, Sulfa drugs</div>
        <div className="emergency-detail"><User size={14} /> <strong>Primary Contact:</strong>&nbsp;Matt — (405) 555-0188</div>
      </div>

      <div className="section-header">
        <span className="section-title">Emergency Contacts</span>
      </div>
      {EMERGENCY_CONTACTS.map((c, i) => (
        <div key={i} className="contact-card">
          <div className="contact-info">
            <h4>{c.name}</h4>
            <span>{c.relation} · {c.phone}</span>
          </div>
          <button className="call-btn"><Phone size={16} /></button>
        </div>
      ))}

      <div className="er-notes">
        <strong>📋 Care Notes for ER Staff</strong><br />
        Patient prefers to be called "Dorothy." She has mild hearing loss — speak clearly facing her.
        Power of attorney is on file (Matt, eldest child). Advance directive specifies full code. Pharmacy: CVS on Main St.
      </div>
    </div>
  )
}

// ══════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════

function ModalSheet({ type, onClose, onAddMed, onAddTask }) {
  const [form, setForm] = useState({})

  if (!type) return null

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />

        {type === 'addMed' && (
          <>
            <div className="modal-title">Add Medication</div>
            <div className="form-field">
              <label className="form-label">Medication Name</label>
              <input className="form-input" placeholder="e.g., Lisinopril 10mg" onChange={e => update('name', e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Schedule</label>
              <input className="form-input" placeholder="e.g., 8:00 AM daily" onChange={e => update('schedule', e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Pills Remaining</label>
              <input className="form-input" type="number" placeholder="30" onChange={e => update('pillsLeft', parseInt(e.target.value) || 30)} />
            </div>
            <div className="form-field">
              <label className="form-label">Notes</label>
              <input className="form-input" placeholder="e.g., Take with food" onChange={e => update('notes', e.target.value)} />
            </div>
            <button className="btn-primary" onClick={() => {
              if (form.name) {
                onAddMed({
                  id: Date.now(),
                  name: form.name,
                  schedule: form.schedule || 'As directed',
                  taken: false,
                  refillDate: 'TBD',
                  pillsLeft: form.pillsLeft || 30,
                  forPerson: 'mom',
                  notes: form.notes || '',
                })
                onClose()
              }
            }}>Add Medication</button>
          </>
        )}

        {type === 'addTask' && (
          <>
            <div className="modal-title">Add Care Task</div>
            <div className="form-field">
              <label className="form-label">Task Description</label>
              <input className="form-input" placeholder="e.g., Call pharmacy about refill" onChange={e => update('text', e.target.value)} />
            </div>
            <div className="form-field">
              <label className="form-label">Assign To</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {FAMILY_MEMBERS.filter(m => m.id !== 'mom').map(m => (
                  <button
                    key={m.id}
                    className={`quick-action ${form.assignee === m.id ? 'active' : ''}`}
                    onClick={() => update('assignee', m.id)}
                  >
                    <span className="assignee-dot" style={{ background: m.color, display: 'inline-flex', width: 16, height: 16, borderRadius: '50%', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', fontWeight: 700 }}>{m.avatar}</span>
                    {' '}{m.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Priority</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['high','medium','low'].map(p => (
                  <button
                    key={p}
                    className={`quick-action ${form.priority === p ? 'active' : ''}`}
                    style={p === 'high' && form.priority === p ? { background: '#FDEAEA', borderColor: '#D64045', color: '#D64045' } : {}}
                    onClick={() => update('priority', p)}
                  >
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-primary" onClick={() => {
              if (form.text) {
                onAddTask({
                  id: Date.now(),
                  text: form.text,
                  assignee: form.assignee || 'you',
                  priority: form.priority || 'medium',
                  done: false,
                  due: 'TBD',
                })
                onClose()
              }
            }}>Add Task</button>
          </>
        )}

        {type === 'upload' && (
          <>
            <div className="modal-title">Upload Document</div>
            <div className="upload-zone">
              <Upload size={24} />
              <div style={{ marginTop: 8, fontWeight: 500 }}>Tap to upload or take a photo</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>PDF, JPG, PNG up to 25MB</div>
            </div>
            <div className="form-field">
              <label className="form-label">Document Type</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Medical','Insurance','Legal','Care Plan'].map(t => (
                  <button key={t} className="doc-filter">{t}</button>
                ))}
              </div>
            </div>
            <div className="form-field">
              <label className="form-label">Label (optional)</label>
              <input className="form-input" placeholder="e.g., Lab Results — March" />
            </div>
            <button className="btn-primary" onClick={onClose}>Upload Document</button>
          </>
        )}

        {type === 'notifications' && (
          <>
            <div className="modal-title">Notification Settings</div>
            <div style={{ fontSize: 14, color: '#7A7570', marginBottom: 20, lineHeight: 1.6 }}>
              CareCircle can send you reminders for medications, upcoming appointments, and task deadlines.
            </div>
            <button className="btn-primary" onClick={async () => {
              const granted = await requestPermission()
              if (granted) {
                sendNotification('🎉 Notifications Enabled', 'You\'ll now receive medication reminders and care alerts.')
              }
              onClose()
            }}>
              Enable Notifications
            </button>
            <button style={{
              width: '100%', padding: 14, marginTop: 8, background: 'transparent',
              border: '1px solid #EDE8E3', borderRadius: 10, fontSize: 14, color: '#7A7570',
              cursor: 'pointer', fontFamily: 'inherit'
            }} onClick={onClose}>
              Maybe Later
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════

export default function App() {
  const [page, setPage] = useState('home')
  const [meds, setMeds] = useState(() => load('meds', DEFAULT_MEDS))
  const [tasks, setTasks] = useState(() => load('tasks', DEFAULT_TASKS))
  const [modal, setModal] = useState(null)
  const [notifPrompted, setNotifPrompted] = useState(() => load('notif-prompted', false))

  // Persist state
  useEffect(() => { save('meds', meds) }, [meds])
  useEffect(() => { save('tasks', tasks) }, [tasks])

  // Schedule med reminders when meds change
  useEffect(() => {
    if (Notification.permission === 'granted') {
      scheduleMedReminders(meds)
    }
  }, [meds])

  // Prompt for notifications on first visit
  useEffect(() => {
    if (!notifPrompted && 'Notification' in window && Notification.permission === 'default') {
      const timer = setTimeout(() => {
        setModal('notifications')
        setNotifPrompted(true)
        save('notif-prompted', true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [notifPrompted])

  const addMed = (med) => setMeds(prev => [...prev, med])
  const addTask = (task) => setTasks(prev => [...prev, task])

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'meds', icon: Pill, label: 'Meds' },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
    { id: 'docs', icon: FolderLock, label: 'Vault' },
    { id: 'ai', icon: Bot, label: 'AI' },
    { id: 'emergency', icon: Activity, label: 'SOS' },
  ]

  return (
    <div className="app-shell">
      {/* Header */}
      <div className="app-header">
        <div className="header-left">
          <h1 className="header-title">CareCircle</h1>
          <span className="header-subtitle">Caring for Mom (Dorothy)</span>
        </div>
        <div className="header-right">
          <button className="notif-btn" onClick={() => setModal('notifications')}>
            <Bell size={18} />
            <div className="notif-dot" />
          </button>
          <div className="avatar-sm" style={{ background: '#3D405B' }}>M</div>
        </div>
      </div>

      {/* Pages */}
      {page === 'home' && <DashboardPage meds={meds} tasks={tasks} setMeds={setMeds} setPage={setPage} />}
      {page === 'meds' && <MedsPage meds={meds} setMeds={setMeds} setModal={setModal} />}
      {page === 'calendar' && <CalendarPage />}
      {page === 'tasks' && <TasksPage tasks={tasks} setTasks={setTasks} setModal={setModal} />}
      {page === 'docs' && <DocsPage setModal={setModal} />}
      {page === 'ai' && <AIPage />}
      {page === 'emergency' && <EmergencyPage />}

      {/* Nav */}
      <nav className="nav-bar">
        {navItems.map(item => (
          <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}>
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Modals */}
      <ModalSheet
        type={modal}
        onClose={() => setModal(null)}
        onAddMed={addMed}
        onAddTask={addTask}
      />
    </div>
  )
}
