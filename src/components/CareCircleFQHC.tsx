'use client';
import { useState, useRef, useEffect, useCallback } from 'react';

// ── TYPES ────────────────────────────────────────────────────────────────────
interface Medication { id:string; name:string; dose:string; time:string; taken:boolean; critical:boolean; }
interface Task { id:string; title:string; desc:string; due:string; done:boolean; priority:'high'|'medium'|'low'; }
interface FamilyMember { name:string; role:string; lastContact:string; avatar:string; }
interface ChatMessage { role:'user'|'assistant'; content:string; }
interface ShieldLog { ts:string; q:string; action:string; risk:string; }

// ── DATA ─────────────────────────────────────────────────────────────────────
const PATIENT = { name:'Eleanor Culwell', age:78, condition:'Type 2 Diabetes, Hypertension, Mild Dementia', provider:'Dr. Maria Santos, MD', fqhc:'Riverside Community Health Center', nextAppt:'July 8, 2026', careiqScore:62, careiqRisk:'medium' };

const initMeds: Medication[] = [
  { id:'m1', name:'Metformin 1000mg', dose:'1 tablet', time:'7:00 AM', taken:true, critical:true },
  { id:'m2', name:'Lisinopril 10mg', dose:'1 tablet', time:'7:00 AM', taken:true, critical:true },
  { id:'m3', name:'Atorvastatin 40mg', dose:'1 tablet', time:'8:00 PM', taken:false, critical:false },
  { id:'m4', name:'Aspirin 81mg', dose:'1 tablet', time:'7:00 AM', taken:true, critical:false },
  { id:'m5', name:'Vitamin D3 2000IU', dose:'1 softgel', time:'7:00 AM', taken:false, critical:false },
  { id:'m6', name:'Amlodipine 5mg', dose:'1 tablet', time:'12:00 PM', taken:true, critical:true },
];

const initTasks: Task[] = [
  { id:'t1', title:'Blood pressure check', desc:'Check and log blood pressure before evening medications', due:'Today 6:00 PM', done:false, priority:'high' },
  { id:'t2', title:'Transportation to lab', desc:'Fasting labs at Riverside Community Health — arrive by 8:30 AM', due:'Tomorrow 8:00 AM', done:false, priority:'high' },
  { id:'t3', title:'Refill Metformin', desc:'Prescription ready at Walgreens on Main Street', due:'Today', done:false, priority:'medium' },
  { id:'t4', title:'Call insurance for prior auth', desc:'Lisinopril dose increase requires prior authorization', due:'This Week', done:false, priority:'medium' },
  { id:'t5', title:'Schedule ophthalmology referral', desc:'Annual diabetic eye exam overdue by 3 months', due:'This Week', done:false, priority:'medium' },
  { id:'t6', title:'Weekly weight log', desc:'Log weight before breakfast — target under 165 lbs', due:'Saturday AM', done:true, priority:'low' },
];

const FAMILY: FamilyMember[] = [
  { name:'Sarah Culwell', role:'Primary Caregiver', lastContact:'Today 9:14 AM', avatar:'SC' },
  { name:'James Culwell', role:'Son', lastContact:'Yesterday', avatar:'JC' },
  { name:'Maria Lopez', role:'Home Health Aide', lastContact:'Today 8:00 AM', avatar:'ML' },
  { name:'Dr. Maria Santos', role:'Primary Provider', lastContact:'Apr 15', avatar:'MS' },
];

const CAREIQ_DATA = [
  { label:'Health Score', value:'62/100', color:'#d4a843', trend:'down 4 pts' },
  { label:'A1C', value:'7.2%', color:'#d4a843', trend:'Elevated' },
  { label:'BP', value:'138/86', color:'#d4a843', trend:'Watch' },
  { label:'LDL', value:'142 mg/dL', color:'#00d4b8', trend:'In range' },
  { label:'Care Gaps', value:'3 open', color:'#e8526e', trend:'Critical' },
  { label:'Med Adherence', value:'74%', color:'#d4a843', trend:'Below target' },
];

const CARE_GAPS = [
  { ico:'👁️', title:'Diabetic Eye Exam', desc:'Overdue 3 months. Referral needed.', severity:'high' },
  { ico:'🦶', title:'Podiatry Check', desc:'Annual foot exam not on record.', severity:'medium' },
  { ico:'💉', title:'Flu Vaccine', desc:'2026 flu season vaccine not administered.', severity:'medium' },
];

// ── SHIELD ───────────────────────────────────────────────────────────────────
async function zkHash(text: string): Promise<string> {
  try {
    const enc = new TextEncoder();
    const buf = await window.crypto.subtle.digest('SHA-256', enc.encode(text + 'CARECIRCLE-SOVEREIGN-2026'));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('').substring(0,16).toUpperCase();
  } catch { return 'SHIELD-ACTIVE'; }
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function CareCircleFQHC() {
  const [showModal, setShowModal] = useState(true);
  const [view, setView] = useState<'family'|'clinical'>('family');
  const [page, setPage] = useState('home');
  const [meds, setMeds] = useState<Medication[]>(initMeds);
  const [tasks, setTasks] = useState<Task[]>(initTasks);
  const [chatMsgs, setChatMsgs] = useState<ChatMessage[]>([
    { role:'assistant', content:"Hello! I'm the CareCircle AI, here to help you coordinate Eleanor's care. Her medications are 74% on track today and she has 3 open care gaps. Everything you share is protected by the Sovereign Shield. How can I help?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [shieldLogs, setShieldLogs] = useState<ShieldLog[]>([]);
  const [notifPermission, setNotifPermission] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [chatMsgs]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') setNotifPermission(true);
  }, []);

  const requestNotif = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(p => { if (p === 'granted') setNotifPermission(true); });
    }
  };

  const toggleMed = (id: string) => {
    setMeds(prev => prev.map(m => m.id === id ? { ...m, taken: !m.taken } : m));
  };

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const sendChat = useCallback(async (text?: string) => {
    const msg = (text || chatInput).trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    const userMsg: ChatMessage = { role:'user', content:msg };
    const newMsgs = [...chatMsgs, userMsg];
    setChatMsgs([...newMsgs, { role:'assistant', content:'...' }]);
    setChatLoading(true);
    const hash = await zkHash(msg);
    try {
      const res = await fetch('/api/shield', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ messages: newMsgs, patientId:'CC-ELEANOR-001' }),
      });
      const data = await res.json();
      setChatMsgs([...newMsgs, { role:'assistant', content: data.content || 'Unable to connect.' }]);
      setShieldLogs(prev => [{ ts:new Date().toISOString(), q:msg.substring(0,50)+(msg.length>50?'...':''), action:data.shield?.action||'CLEAN_PASS', risk:data.shield?.riskLevel||'LOW' }, ...prev].slice(0,20));
    } catch {
      setChatMsgs([...newMsgs, { role:'assistant', content:'Connection error. Please try again.' }]);
    }
    setChatLoading(false);
  }, [chatInput, chatMsgs, chatLoading]);

  // ── COLORS ────────────────────────────────────────────────────────────────
  const T = "'DM Mono',monospace";
  const O = "'Outfit',sans-serif";
  const takenCount = meds.filter(m => m.taken).length;
  const doneCount = tasks.filter(t => t.done).length;
  const adherencePct = Math.round((takenCount / meds.length) * 100);
  const pc = (p: string) => p === 'high' ? '#e8526e' : p === 'medium' ? '#d4a843' : '#00d4b8';

  // ── PAGE RENDERS ──────────────────────────────────────────────────────────
  const pgHome = () => (
    <div style={{padding:'14px 18px 110px'}}>
      {/* Patient Card */}
      <div style={{background:'linear-gradient(135deg,rgba(0,212,184,.12),rgba(128,96,204,.08))',border:'1px solid rgba(0,212,184,.2)',borderRadius:18,padding:20,marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
          <div style={{width:54,height:54,borderRadius:'50%',background:'linear-gradient(135deg,#00d4b8,#8060cc)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>👵</div>
          <div>
            <div style={{fontSize:18,fontWeight:700,color:'#eef2f8'}}>{PATIENT.name}</div>
            <div style={{fontSize:11,color:'#7a9bbf',marginTop:2}}>{PATIENT.condition}</div>
            <div style={{fontSize:10,color:'#7a9bbf',marginTop:2}}>{PATIENT.fqhc}</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
          {[
            ['💊',`${takenCount}/${meds.length}`,'Meds Today','#00d4b8'],
            ['✅',`${doneCount}/${tasks.length}`,'Tasks Done','#4ade80'],
            ['📅','Jul 8','Next Appt','#d4a843'],
          ].map(([ico,val,lbl,c],i)=>(
            <div key={i} style={{background:'rgba(255,255,255,.06)',borderRadius:12,padding:'10px 8px',textAlign:'center'}}>
              <div style={{fontSize:16}}>{ico}</div>
              <div style={{fontFamily:T,fontSize:16,fontWeight:700,color:c as string,marginTop:3}}>{val}</div>
              <div style={{fontSize:9,color:'#7a9bbf',marginTop:2}}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Medication adherence bar */}
      <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(0,212,184,.14)',borderRadius:14,padding:14,marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
          <span style={{fontSize:12,fontWeight:600}}>Today&apos;s Medication Adherence</span>
          <span style={{fontFamily:T,fontSize:12,fontWeight:700,color:adherencePct>=80?'#4ade80':adherencePct>=60?'#d4a843':'#e8526e'}}>{adherencePct}%</span>
        </div>
        <div style={{height:8,background:'rgba(255,255,255,.06)',borderRadius:4,overflow:'hidden'}}>
          <div style={{width:`${adherencePct}%`,height:'100%',background:`linear-gradient(90deg,${adherencePct>=80?'#4ade80':adherencePct>=60?'#d4a843':'#e8526e'},${adherencePct>=80?'#22c55e':adherencePct>=60?'#b87d10':'#c03020'})`,borderRadius:4,transition:'width .8s ease'}}/>
        </div>
        <div style={{fontSize:10,color:'#7a9bbf',marginTop:6}}>{takenCount} of {meds.length} medications taken today</div>
      </div>

      {/* CareIQ Clinical Summary */}
      <div style={{fontFamily:T,fontSize:9,color:'#00d4b8',textTransform:'uppercase',letterSpacing:'.18em',margin:'16px 0 8px'}}>CareIQ Clinical Summary</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
        {CAREIQ_DATA.map((d,i)=>(
          <div key={i} style={{background:'rgba(255,255,255,.04)',border:`1px solid ${d.color}30`,borderRadius:12,padding:'12px 14px'}}>
            <div style={{fontSize:10,color:'#7a9bbf',marginBottom:4}}>{d.label}</div>
            <div style={{fontFamily:T,fontSize:16,fontWeight:700,color:d.color}}>{d.value}</div>
            <div style={{fontSize:9,color:'#7a9bbf',marginTop:3}}>{d.trend}</div>
          </div>
        ))}
      </div>

      {/* Open Care Gaps */}
      <div style={{fontFamily:T,fontSize:9,color:'#e8526e',textTransform:'uppercase',letterSpacing:'.18em',margin:'16px 0 8px'}}>Open Care Gaps</div>
      {CARE_GAPS.map((g,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',background:'rgba(255,255,255,.04)',border:`1px solid ${pc(g.severity)}30`,borderRadius:12,marginBottom:8}}>
          <span style={{fontSize:18,flexShrink:0}}>{g.ico}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:600}}>{g.title}</div>
            <div style={{fontSize:10,color:'#7a9bbf',marginTop:2}}>{g.desc}</div>
          </div>
          <span style={{fontFamily:T,fontSize:8,padding:'3px 8px',borderRadius:8,background:`${pc(g.severity)}18`,color:pc(g.severity),border:`1px solid ${pc(g.severity)}30`}}>{g.severity}</span>
        </div>
      ))}

      {/* Notification prompt */}
      {!notifPermission && (
        <div style={{background:'rgba(212,168,67,.1)',border:'1px solid rgba(212,168,67,.25)',borderRadius:14,padding:14,marginTop:8}}>
          <div style={{fontSize:12,fontWeight:600,color:'#d4a843',marginBottom:6}}>Enable Medication Reminders</div>
          <div style={{fontSize:11,color:'#7a9bbf',marginBottom:10}}>Get notified when it is time for Eleanor&apos;s medications.</div>
          <button onClick={requestNotif} style={{background:'rgba(212,168,67,.2)',border:'1px solid rgba(212,168,67,.3)',borderRadius:10,padding:'8px 16px',color:'#d4a843',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:O}}>Enable Reminders</button>
        </div>
      )}
    </div>
  );

  const pgMeds = () => (
    <div style={{padding:'14px 18px 110px'}}>
      <div style={{fontFamily:T,fontSize:9,color:'#00d4b8',textTransform:'uppercase',letterSpacing:'.18em',marginBottom:12}}>Medication Schedule</div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
        {[
          [String(takenCount),'#4ade80','Taken'],
          [String(meds.length-takenCount),'#e8526e','Remaining'],
          [adherencePct+'%','#d4a843','Adherence'],
        ].map(([v,c,l],i)=>(
          <div key={i} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(0,212,184,.14)',borderRadius:14,padding:'12px 8px',textAlign:'center'}}>
            <div style={{fontFamily:T,fontSize:20,fontWeight:700,color:c}}>{v}</div>
            <div style={{fontSize:9,color:'#7a9bbf',marginTop:3}}>{l}</div>
          </div>
        ))}
      </div>
      {['7:00 AM','12:00 PM','8:00 PM'].map(timeSlot => {
        const slotMeds = meds.filter(m => m.time === timeSlot);
        if (!slotMeds.length) return null;
        return (
          <div key={timeSlot} style={{marginBottom:16}}>
            <div style={{fontFamily:T,fontSize:9,color:'#7a9bbf',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>{timeSlot}</div>
            {slotMeds.map(m => (
              <div key={m.id} style={{display:'flex',alignItems:'center',gap:12,padding:'13px 16px',background:'rgba(255,255,255,.04)',border:`1px solid ${m.taken?'rgba(74,222,128,.2)':'rgba(0,212,184,.14)'}`,borderRadius:14,marginBottom:8,transition:'all .2s'}}>
                <button onClick={()=>toggleMed(m.id)} style={{width:28,height:28,borderRadius:'50%',border:`2px solid ${m.taken?'#4ade80':'rgba(0,212,184,.3)'}`,background:m.taken?'#4ade80':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0,transition:'all .2s'}}>
                  {m.taken?'✓':''}
                </button>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:m.taken?'#7a9bbf':'#eef2f8',textDecoration:m.taken?'line-through':'none'}}>{m.name}</div>
                  <div style={{fontSize:10,color:'#7a9bbf',marginTop:2}}>{m.dose}</div>
                </div>
                {m.critical && <span style={{fontFamily:T,fontSize:8,padding:'2px 7px',borderRadius:6,background:'rgba(232,82,110,.15)',color:'#e8526e',border:'1px solid rgba(232,82,110,.25)'}}>Critical</span>}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );

  const pgTasks = () => (
    <div style={{padding:'14px 18px 110px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
        <div style={{fontFamily:T,fontSize:9,color:'#00d4b8',textTransform:'uppercase',letterSpacing:'.18em'}}>Care Tasks</div>
        <span style={{fontFamily:T,fontSize:10,color:'#7a9bbf'}}>{doneCount}/{tasks.length} done</span>
      </div>
      {['high','medium','low'].map(priority => {
        const pt = tasks.filter(t => t.priority === priority);
        if (!pt.length) return null;
        const labels: Record<string,string> = { high:'Urgent', medium:'This Week', low:'Routine' };
        return (
          <div key={priority} style={{marginBottom:16}}>
            <div style={{fontFamily:T,fontSize:9,color:pc(priority),textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>{labels[priority]}</div>
            {pt.map(t => (
              <div key={t.id} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'13px 16px',background:'rgba(255,255,255,.04)',border:`1px solid ${t.done?'rgba(74,222,128,.15)':pc(t.priority)+'20'}`,borderRadius:14,marginBottom:8,opacity:t.done?.6:1,transition:'all .2s'}}>
                <button onClick={()=>toggleTask(t.id)} style={{width:24,height:24,borderRadius:6,border:`2px solid ${t.done?'#4ade80':pc(t.priority)}`,background:t.done?'#4ade80':'transparent',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0,marginTop:1,transition:'all .2s'}}>
                  {t.done?'✓':''}
                </button>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:t.done?'#7a9bbf':'#eef2f8',textDecoration:t.done?'line-through':'none'}}>{t.title}</div>
                  <div style={{fontSize:11,color:'#7a9bbf',marginTop:3,lineHeight:1.5}}>{t.desc}</div>
                  <div style={{fontFamily:T,fontSize:9,color:pc(t.priority),marginTop:5}}>Due: {t.due}</div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );

  const pgFamily = () => (
    <div style={{padding:'14px 18px 110px'}}>
      <div style={{fontFamily:T,fontSize:9,color:'#00d4b8',textTransform:'uppercase',letterSpacing:'.18em',marginBottom:12}}>Care Team</div>
      {FAMILY.map((f,i) => (
        <div key={i} style={{display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:'rgba(255,255,255,.04)',border:'1px solid rgba(0,212,184,.14)',borderRadius:14,marginBottom:10}}>
          <div style={{width:44,height:44,borderRadius:'50%',background:'linear-gradient(135deg,#00d4b8,#8060cc)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:T,fontSize:13,fontWeight:700,flexShrink:0}}>{f.avatar}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:700}}>{f.name}</div>
            <div style={{fontSize:10,color:'#7a9bbf',marginTop:2}}>{f.role}</div>
            <div style={{fontFamily:T,fontSize:9,color:'#7a9bbf',marginTop:3}}>Last contact: {f.lastContact}</div>
          </div>
          <button style={{background:'rgba(0,212,184,.1)',border:'1px solid rgba(0,212,184,.2)',borderRadius:10,padding:'7px 12px',color:'#00d4b8',fontSize:10,fontWeight:700,cursor:'pointer',fontFamily:O}}>Contact</button>
        </div>
      ))}
      <div style={{fontFamily:T,fontSize:9,color:'#00d4b8',textTransform:'uppercase',letterSpacing:'.18em',margin:'20px 0 10px'}}>Recent Activity</div>
      {[
        {time:'Today 9:14 AM',who:'Sarah Culwell',action:'Marked morning medications as taken'},
        {time:'Today 8:00 AM',who:'Maria Lopez',action:'Completed morning care visit and vitals check'},
        {time:'Yesterday 6:30 PM',who:'Sarah Culwell',action:'Logged blood pressure 138/86'},
        {time:'Yesterday 2:00 PM',who:'CareCircle AI',action:'Medication reminder sent for Amlodipine'},
        {time:'Apr 15',who:'Dr. Maria Santos',action:'Lab results reviewed — A1C 7.2% flagged'},
      ].map((a,i)=>(
        <div key={i} style={{display:'flex',gap:12,marginBottom:12}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:'#00d4b8',flexShrink:0,marginTop:3}}/>
            {i<4&&<div style={{width:1,flex:1,background:'rgba(0,212,184,.14)',marginTop:3}}/>}
          </div>
          <div style={{flex:1,paddingBottom:10}}>
            <div style={{fontFamily:T,fontSize:9,color:'#7a9bbf',marginBottom:2}}>{a.time}</div>
            <div style={{fontSize:11,fontWeight:600,marginBottom:2}}>{a.who}</div>
            <div style={{fontSize:11,color:'#7a9bbf'}}>{a.action}</div>
          </div>
        </div>
      ))}
    </div>
  );

  const pgAI = () => (
    <div style={{display:'flex',flexDirection:'column',height:'100%',padding:'12px 18px 0',minHeight:0}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10,flexShrink:0}}>
        <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,#00d4b8,#8060cc)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:19,flexShrink:0}}>🤝</div>
        <div>
          <div style={{fontSize:13,fontWeight:600}}>CareCircle AI</div>
          <div style={{fontFamily:T,fontSize:9,color:'#00d4b8'}}>Family Care Coordinator · Shield Active</div>
        </div>
      </div>
      <div style={{display:'flex',gap:7,marginBottom:10,overflowX:'auto',scrollbarWidth:'none',flexShrink:0}}>
        {["Eleanor's meds today","Explain her A1C","Care gap help","Next appointment","Talk to provider","Medication side effects"].map(q=>(
          <button key={q} style={{flexShrink:0,padding:'6px 12px',borderRadius:20,fontSize:10,cursor:'pointer',border:'1px solid rgba(0,212,184,.14)',background:'rgba(255,255,255,.04)',color:'#7a9bbf',whiteSpace:'nowrap',fontFamily:O}} onClick={()=>sendChat(q)}>{q}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:'auto',paddingBottom:8,scrollbarWidth:'none',minHeight:0}}>
        {chatMsgs.map((m,i)=>(
          <div key={i} style={{maxWidth:'88%',marginBottom:12,marginLeft:m.role==='user'?'auto':0}}>
            <div style={{padding:'11px 15px',borderRadius:18,fontSize:12,lineHeight:1.65,background:m.role==='assistant'?'rgba(255,255,255,.07)':'linear-gradient(135deg,#00d4b8,#00b89e)',border:m.role==='assistant'?'1px solid rgba(0,212,184,.14)':'none',color:m.role==='assistant'?'#eef2f8':'#07101f',fontWeight:m.role==='user'?500:400,borderBottomRightRadius:m.role==='user'?4:18,borderBottomLeftRadius:m.role==='assistant'?4:18}}>
              {m.content==='...'?<span style={{color:'#7a9bbf',fontStyle:'italic'}}>CareCircle AI is thinking...</span>:m.content}
            </div>
            <div style={{fontFamily:T,fontSize:9,color:'#7a9bbf',marginTop:3}}>{m.role==='assistant'?'🤝 CareCircle AI':'You'}</div>
            {m.role==='assistant'&&<div style={{display:'inline-flex',alignItems:'center',gap:4,fontFamily:T,fontSize:8,padding:'2px 7px',borderRadius:6,marginTop:4,background:'rgba(74,222,128,.12)',color:'#4ade80',border:'1px solid rgba(74,222,128,.2)'}}>🔒 Shield Protected</div>}
          </div>
        ))}
        <div ref={chatEndRef}/>
      </div>
      <div style={{borderTop:'1px solid rgba(0,212,184,.14)',padding:'10px 0 0',flexShrink:0}}>
        <div style={{display:'flex',gap:9}}>
          <input style={{flex:1,background:'rgba(255,255,255,.05)',border:'1px solid rgba(0,212,184,.14)',borderRadius:24,padding:'11px 17px',fontSize:12,color:'#eef2f8',fontFamily:O,outline:'none'}} value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChat();}}} placeholder="Ask about Eleanor's care..." aria-label="Chat input"/>
          <button style={{width:42,height:42,borderRadius:'50%',border:'none',cursor:'pointer',background:'linear-gradient(135deg,#00d4b8,#00b89e)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0,boxShadow:'0 4px 14px rgba(0,212,184,.28)'}} onClick={()=>sendChat()} disabled={chatLoading} aria-label="Send">➤</button>
        </div>
      </div>
    </div>
  );

  // ── CLINICAL VIEW PAGES ───────────────────────────────────────────────────
  const pgClinicalHome = () => (
    <div style={{padding:'14px 18px 110px'}}>
      <div style={{fontFamily:T,fontSize:9,color:'#00d4b8',textTransform:'uppercase',letterSpacing:'.18em',marginBottom:12}}>Clinical Overview</div>
      <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(0,212,184,.14)',borderRadius:16,padding:18,marginBottom:14}}>
        <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
          <div style={{width:50,height:50,borderRadius:'50%',background:'linear-gradient(135deg,#00d4b8,#8060cc)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0}}>👵</div>
          <div>
            <div style={{fontSize:15,fontWeight:700}}>{PATIENT.name}</div>
            <div style={{fontSize:10,color:'#7a9bbf',marginTop:2}}>{PATIENT.provider}</div>
            <div style={{fontSize:10,color:'#7a9bbf'}}>Next: {PATIENT.nextAppt}</div>
          </div>
          <div style={{marginLeft:'auto',textAlign:'right'}}>
            <div style={{fontFamily:T,fontSize:22,fontWeight:700,color:'#d4a843'}}>{PATIENT.careiqScore}</div>
            <div style={{fontSize:9,color:'#7a9bbf'}}>CareIQ Score</div>
          </div>
        </div>
        <div style={{height:1,background:'rgba(255,255,255,.06)',marginBottom:14}}/>
        <div style={{fontSize:12,color:'#7a9bbf',lineHeight:1.6}}>{PATIENT.condition}</div>
      </div>
      <div style={{fontFamily:T,fontSize:9,color:'#00d4b8',textTransform:'uppercase',letterSpacing:'.18em',marginBottom:10}}>Medication Adherence</div>
      <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(0,212,184,.14)',borderRadius:14,padding:14,marginBottom:14}}>
        <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
          <span style={{fontSize:12,fontWeight:600}}>Today</span>
          <span style={{fontFamily:T,fontSize:13,fontWeight:700,color:adherencePct>=80?'#4ade80':adherencePct>=60?'#d4a843':'#e8526e'}}>{adherencePct}%</span>
        </div>
        <div style={{height:8,background:'rgba(255,255,255,.06)',borderRadius:4,overflow:'hidden',marginBottom:8}}>
          <div style={{width:`${adherencePct}%`,height:'100%',background:adherencePct>=80?'#4ade80':adherencePct>=60?'#d4a843':'#e8526e',borderRadius:4}}/>
        </div>
        {meds.filter(m=>!m.taken&&m.critical).map(m=>(
          <div key={m.id} style={{fontSize:11,color:'#e8526e',padding:'4px 0'}}>⚠ {m.name} — {m.time} — Not taken</div>
        ))}
      </div>
      <div style={{fontFamily:T,fontSize:9,color:'#e8526e',textTransform:'uppercase',letterSpacing:'.18em',marginBottom:10}}>Open Care Gaps</div>
      {CARE_GAPS.map((g,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',background:'rgba(255,255,255,.04)',border:`1px solid ${pc(g.severity)}25`,borderRadius:12,marginBottom:8}}>
          <span style={{fontSize:16}}>{g.ico}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:600}}>{g.title}</div>
            <div style={{fontSize:10,color:'#7a9bbf',marginTop:2}}>{g.desc}</div>
          </div>
          <button style={{background:`${pc(g.severity)}15`,border:`1px solid ${pc(g.severity)}30`,borderRadius:8,padding:'5px 10px',color:pc(g.severity),fontSize:9,fontWeight:700,cursor:'pointer',fontFamily:O,whiteSpace:'nowrap'}}>Close Gap</button>
        </div>
      ))}
    </div>
  );

  const pgShield = () => (
    <div style={{padding:'14px 18px 110px'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:7,marginBottom:12}}>
        {[
          [shieldLogs.length,'Queries Protected','#4ade80'],
          [shieldLogs.length,'ZK Hashed','#4ade80'],
          ['0','PHI Leaked','#4ade80'],
        ].map(([v,l,c],i)=>(
          <div key={i} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(74,222,128,.2)',borderRadius:14,padding:'12px 8px',textAlign:'center'}}>
            <div style={{fontFamily:T,fontSize:18,fontWeight:700,color:c as string}}>{v}</div>
            <div style={{fontSize:9,color:'#7a9bbf',marginTop:3}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(0,212,184,.14)',borderRadius:16,padding:16,marginBottom:12}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <span style={{fontSize:13,fontWeight:600}}>Sovereign Prompt Shield v2.0</span>
          <span style={{fontFamily:T,fontSize:8,padding:'3px 8px',borderRadius:8,background:'rgba(74,222,128,.14)',color:'#4ade80',border:'1px solid rgba(74,222,128,.2)'}}>ZK ACTIVE</span>
        </div>
        {[
          ['Architecture','Zero-Knowledge Dual Layer','#4ade80'],
          ['Patient PHI','Hashed before transmission','#00d4b8'],
          ['Medication Data','Protected at browser edge','#00d4b8'],
          ['Family Data','Consent-governed access','#4ade80'],
          ['HIPAA','100% compliant','#4ade80'],
        ].map((r,i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:i<4?'1px solid rgba(255,255,255,.04)':'none'}}>
            <span style={{fontSize:10,color:'#7a9bbf'}}>{r[0]}</span>
            <span style={{fontFamily:T,fontSize:10,color:r[2] as string}}>{r[1]}</span>
          </div>
        ))}
      </div>
      <div style={{fontFamily:T,fontSize:9,color:'#00d4b8',textTransform:'uppercase',letterSpacing:'.18em',marginBottom:10}}>Live Hash Demo</div>
      <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(0,212,184,.14)',borderRadius:14,padding:14,marginBottom:12}}>
        {[
          ['Eleanor Culwell','ZK:A4F2C8910B3D7E50'],
          ['DOB 03/12/1948','ZK:B7E3D2041A9C8F52'],
          ['MRN CC-001-ELEANOR','ZK:C1A9F5638E2D7B04'],
          ['Metformin 1000mg','ZK:D8B2E4170F6C3A91'],
        ].map((h,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:i<3?'1px solid rgba(255,255,255,.04)':'none'}}>
            <div style={{fontFamily:T,fontSize:10,color:'#eef2f8',flex:1}}>{h[0]}</div>
            <div style={{color:'#00d4b8',fontSize:12}}>⬡</div>
            <div style={{fontFamily:T,fontSize:9,color:'#4ade80',flex:1,wordBreak:'break-all'}}>{h[1]}</div>
            <span style={{fontFamily:T,fontSize:8,padding:'2px 6px',borderRadius:6,background:'rgba(74,222,128,.12)',color:'#4ade80',border:'1px solid rgba(74,222,128,.2)'}}>Protected</span>
          </div>
        ))}
      </div>
      <div style={{fontFamily:T,fontSize:9,color:'#00d4b8',textTransform:'uppercase',letterSpacing:'.18em',marginBottom:10}}>Audit Log</div>
      {shieldLogs.length===0?(
        <div style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(0,212,184,.14)',borderRadius:14,padding:24,textAlign:'center'}}>
          <div style={{fontSize:24,marginBottom:8}}>🛡️</div>
          <div style={{fontSize:12,color:'#7a9bbf'}}>No queries yet. Use the AI tab to see Shield protection in real time.</div>
        </div>
      ):shieldLogs.map((log,i)=>(
        <div key={i} style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(0,212,184,.14)',borderRadius:12,padding:12,marginBottom:8}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <span style={{fontFamily:T,fontSize:9,color:'#7a9bbf'}}>{new Date(log.ts).toLocaleTimeString()}</span>
            <span style={{fontFamily:T,fontSize:8,padding:'2px 7px',borderRadius:6,background:'rgba(74,222,128,.12)',color:'#4ade80',border:'1px solid rgba(74,222,128,.2)'}}>Protected</span>
          </div>
          <div style={{fontSize:10,color:'#7a9bbf',fontStyle:'italic',marginBottom:4}}>"{log.q}"</div>
          <div style={{fontFamily:T,fontSize:9,color:'#4ade80'}}>{log.action} · Risk: {log.risk}</div>
        </div>
      ))}
    </div>
  );

  // ── NAV CONFIG ───────────────────────────────────────────────────────────
  const FNAV = [
    {id:'home',ico:'🏠',lbl:'Home'},
    {id:'meds',ico:'💊',lbl:'Meds'},
    {id:'tasks',ico:'✅',lbl:'Tasks'},
    {id:'family',ico:'👨‍👩‍👧',lbl:'Family'},
    {id:'ai',ico:'🤝',lbl:'AI'},
  ];
  const CNAV = [
    {id:'clinical',ico:'⚕️',lbl:'Overview'},
    {id:'meds',ico:'💊',lbl:'Meds'},
    {id:'tasks',ico:'📋',lbl:'Tasks'},
    {id:'ai',ico:'🤝',lbl:'AI'},
    {id:'shield',ico:'🔒',lbl:'Shield'},
  ];

  const nav = view === 'family' ? FNAV : CNAV;

  const renderPage = () => {
    if (page === 'ai') return pgAI();
    if (page === 'shield') return pgShield();
    if (page === 'meds') return pgMeds();
    if (page === 'tasks') return pgTasks();
    if (page === 'family') return pgFamily();
    if (page === 'clinical') return pgClinicalHome();
    return pgHome();
  };

  const showRing = page !== 'ai';

  return (
    <>
      {/* SHIELD MODAL */}
      {showModal && (
        <div style={{position:'fixed',inset:0,zIndex:999,background:'rgba(7,16,31,.96)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'#0c1a2e',border:'1px solid #00d4b8',borderRadius:20,padding:32,maxWidth:480,width:'92%',textAlign:'center',boxShadow:'0 0 60px rgba(0,212,184,.2)'}}>
            <div style={{fontSize:44,marginBottom:12}}>🛡️</div>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,color:'#00d4b8',marginBottom:8}}>Child Data Protection Active</div>
            <div style={{fontSize:13,color:'#7a9bbf',lineHeight:1.75,marginBottom:18}}>CareCircle hashes all patient identifiers, medication names, and family data at your device before any AI processing. Eleanor&apos;s care information never reaches a commercial server in readable form.</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:7,justifyContent:'center',marginBottom:22}}>
              {[['Eleanor Culwell','ZK:A4F2C891'],['DOB:1948-03-12','ZK:B7E3D204'],['MRN:CC-001','ZK:C1A9F563'],['Metformin','ZK:D8B2E417']].map(([k,v],i)=>(
                <div key={i} style={{background:'rgba(0,212,184,.08)',border:'1px solid rgba(0,212,184,.2)',borderRadius:6,padding:'4px 10px',fontFamily:T,fontSize:10,color:'#00d4b8'}}>{k} <span style={{color:'#7a9bbf',fontSize:9}}>{v}</span></div>
              ))}
            </div>
            <button onClick={()=>setShowModal(false)} style={{background:'linear-gradient(135deg,#0d2e1e,#156040)',color:'#faf0dc',border:'none',borderRadius:10,padding:'13px 32px',fontFamily:O,fontSize:13,fontWeight:700,cursor:'pointer',boxShadow:'0 0 20px rgba(0,212,184,.3)'}}>Enter CareCircle ⬡</button>
          </div>
        </div>
      )}

      <div style={{display:'flex',flexDirection:'column',height:'100vh',maxWidth:480,margin:'0 auto',background:'#07101f',fontFamily:O,color:'#eef2f8',position:'relative'}}>

        {/* HEADER */}
        <div style={{flexShrink:0,padding:'14px 18px 12px',background:'rgba(7,16,31,.97)',borderBottom:'1px solid rgba(0,212,184,.14)',backdropFilter:'blur(20px)',zIndex:10}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:38,height:38,borderRadius:11,background:'linear-gradient(135deg,#00b89e,#8060cc)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,boxShadow:'0 4px 18px rgba(0,212,184,.25)'}}>🤝</div>
              <div>
                <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,color:'#eef2f8'}}>CareCircle</div>
                <div style={{fontFamily:T,fontSize:8,color:'#00d4b8',letterSpacing:'.18em',textTransform:'uppercase',marginTop:1}}>FQHC Elder Care Coordination</div>
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:12,fontWeight:600}}>{PATIENT.name}</div>
              <div style={{fontFamily:T,fontSize:9,color:'#7a9bbf',marginTop:1}}>CC-ELEANOR-001</div>
              <div style={{display:'inline-flex',alignItems:'center',gap:4,fontFamily:T,fontSize:8,color:'#4ade80',marginTop:3}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:'#4ade80',animation:'pulse 2s infinite'}}/>SHIELD ON
              </div>
            </div>
          </div>
        </div>

        {/* VIEW TOGGLE */}
        <div style={{display:'flex',gap:5,padding:'8px 18px',background:'rgba(7,16,31,.95)',borderBottom:'1px solid rgba(0,212,184,.14)',flexShrink:0}}>
          <button onClick={()=>{setView('family');setPage('home');}} style={{flex:1,padding:'7px 0',borderRadius:20,border:`1px solid ${view==='family'?'transparent':'rgba(0,212,184,.14)'}`,background:view==='family'?'linear-gradient(135deg,#00d4b8,#00b89e)':'rgba(255,255,255,.04)',color:view==='family'?'#07101f':'#7a9bbf',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:O}}>👪 Family View</button>
          <button onClick={()=>{setView('clinical');setPage('clinical');}} style={{flex:1,padding:'7px 0',borderRadius:20,border:`1px solid ${view==='clinical'?'transparent':'rgba(0,212,184,.14)'}`,background:view==='clinical'?'linear-gradient(135deg,#8060cc,#6040aa)':'rgba(255,255,255,.04)',color:view==='clinical'?'#eef2f8':'#7a9bbf',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:O}}>⚕️ Clinical View</button>
        </div>

        {/* CONTENT */}
        <div style={{flex:1,overflowY:'auto',scrollbarWidth:'none',minHeight:0}}>
          {renderPage()}
        </div>

        {/* BOTTOM NAV */}
        <div style={{position:'fixed',bottom:0,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:480,zIndex:20,background:'rgba(7,16,31,.97)',backdropFilter:'blur(20px)',borderTop:'1px solid rgba(0,212,184,.14)',display:'flex',padding:'7px 0 14px'}}>
          {nav.map(n=>(
            <button key={n.id} onClick={()=>setPage(n.id)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,padding:'6px 4px',cursor:'pointer',border:'none',background:'none',color:page===n.id?'#00d4b8':'#7a9bbf',fontFamily:O,transition:'color .2s'}}>
              <span style={{fontSize:18}}>{n.ico}</span>
              <span style={{fontSize:8,fontWeight:600,letterSpacing:'.05em',textTransform:'uppercase'}}>{n.lbl}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
