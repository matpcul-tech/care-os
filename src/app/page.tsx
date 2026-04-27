'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Heart, Calendar, Users, FileText, Pill, Star, ArrowRight, Check,
  AlertTriangle, Bot, Shield,
} from 'lucide-react';

const T = "'DM Mono',monospace";
const O = "'Outfit',sans-serif";
const P = "'Playfair Display',serif";

const TESTIMONIALS = [
  { name: 'Rachel M.', role: 'Caring for her father', text: "I was drowning in group texts and sticky notes. CareCircle gave our family one place to coordinate everything. Dad's care has never been this organized.", stars: 5 },
  { name: 'David K.', role: 'Long-distance caregiver', text: 'Living 800 miles from Mom, I always felt out of the loop. Now I see every appointment, every med change, every update in real time.', stars: 5 },
  { name: 'Maria S.', role: 'Coordinating for both parents', text: "The AI summaries after doctor visits are a game-changer. I just share them with my brothers and everyone is on the same page instantly.", stars: 5 },
];

const FEATURES = [
  { icon: Pill, title: 'Medication Tracker', desc: 'Visual daily schedule with refill alerts, dosage history, and one-tap logging for the whole family to see.', color: '#00d4b8' },
  { icon: Calendar, title: 'Shared Care Calendar', desc: 'Every appointment, lab, and therapy session in one place. Prep notes, directions, and post-visit summaries attached.', color: '#8060cc' },
  { icon: Users, title: 'Task Assignments', desc: 'Divide care duties fairly. Assign tasks by family member with priority levels, due dates, and completion tracking.', color: '#4ade80' },
  { icon: FileText, title: 'Secure Document Vault', desc: 'Insurance cards, legal docs, lab results, and care plans — encrypted, organized, and accessible when you need them.', color: '#d4a843' },
  { icon: Bot, title: 'AI Care Assistant', desc: 'Turn doctor visit notes into clear next steps. Draft family updates. Get proactive alerts about refills and follow-ups.', color: '#00d4b8' },
  { icon: AlertTriangle, title: 'Emergency Profile', desc: 'One-tap access to conditions, medications, allergies, and emergency contacts — ready for first responders and ER staff.', color: '#e8526e' },
];

const PRICING = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    desc: 'For families just getting started',
    features: ['1 care recipient', '2 family members', 'Medication tracking', 'Shared calendar', 'Basic task management', 'Emergency profile'],
    cta: 'Get Started Free',
    featured: false,
  },
  {
    name: 'Family',
    price: '$9',
    period: '/month',
    desc: 'Everything your care team needs',
    features: ['Unlimited care recipients', 'Up to 8 family members', 'AI visit summaries and updates', 'Document vault 25GB', 'Smart reminders and alerts', 'Priority support', 'Family activity feed'],
    cta: 'Start 14-Day Free Trial',
    featured: true,
  },
  {
    name: 'Family+',
    price: '$19',
    period: '/month',
    desc: 'For complex care coordination',
    features: ['Everything in Family', 'Unlimited family members', 'AI care assistant unlimited', 'Document scanning and OCR', 'Medication interaction alerts', 'Care provider sharing portal', 'HIPAA-compliant exports'],
    cta: 'Start 14-Day Free Trial',
    featured: false,
  },
];

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible] as const;
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [ref, visible] = useInView();
  return (
    <div ref={ref} style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(24px)', transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s` }}>
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const navStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    padding: scrolled ? '12px 24px' : '16px 24px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: scrolled ? 'rgba(7,16,31,.97)' : 'transparent',
    borderBottom: scrolled ? '1px solid rgba(0,212,184,.14)' : '1px solid transparent',
    backdropFilter: scrolled ? 'blur(20px)' : 'none',
    transition: 'all .3s',
  };

  return (
    <div style={{ background: '#07101f', minHeight: '100vh', fontFamily: O, color: '#eef2f8' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Mono:wght@300;400;500&family=Outfit:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        [id]{scroll-margin-top:80px}
        @keyframes pulse-dot{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.2)}}
        @keyframes glow{0%,100%{text-shadow:0 0 20px rgba(0,212,184,.3)}50%{text-shadow:0 0 40px rgba(0,212,184,.6),0 0 80px rgba(0,212,184,.2)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .nav-link{color:#7a9bbf;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;transition:color .2s;background:none;border:none;cursor:pointer;font-family:'Outfit',sans-serif}
        .nav-link:hover{color:#00d4b8}
        .feature-card{background:rgba(255,255,255,.04);border:1px solid rgba(0,212,184,.14);border-radius:18px;padding:28px 24px;transition:all .25s;position:relative;overflow:hidden}
        .feature-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:0;transition:opacity .3s}
        .feature-card:hover{transform:translateY(-4px);border-color:rgba(0,212,184,.3)}
        .feature-card:hover::before{opacity:1}
        .price-card{background:rgba(255,255,255,.04);border:1px solid rgba(0,212,184,.14);border-radius:20px;padding:32px 24px;transition:all .2s;position:relative}
        .price-card.featured{border-color:#00d4b8;background:rgba(0,212,184,.06);box-shadow:0 0 40px rgba(0,212,184,.15)}
        .problem-card{background:rgba(255,255,255,.04);border:1px solid rgba(0,212,184,.1);border-radius:16px;padding:24px;transition:all .2s}
        .problem-card:hover{border-color:rgba(0,212,184,.25);transform:translateY(-2px)}
        .testimonial-card{background:rgba(255,255,255,.04);border:1px solid rgba(0,212,184,.14);border-radius:18px;padding:28px}
        .step-card{flex:1;padding:32px 24px;border-radius:18px;background:rgba(255,255,255,.04);border:1px solid rgba(0,212,184,.14);position:relative;counter-increment:step}
        .step-card::before{content:counter(step);font-family:'Playfair Display',serif;font-size:52px;font-weight:300;color:rgba(0,212,184,.1);position:absolute;top:16px;right:20px;line-height:1}
        @media(max-width:768px){.nav-desktop{display:none!important}.nav-mobile-toggle{display:flex!important}.hero-section{padding:100px 20px 60px!important}.section{padding:60px 20px!important}.features-grid{grid-template-columns:1fr!important}.pricing-grid{grid-template-columns:1fr!important;max-width:400px!important;margin:0 auto!important}.steps-row{flex-direction:column!important}.testimonials-grid{grid-template-columns:1fr!important}.problem-grid{grid-template-columns:1fr!important}}
      `}</style>

      {/* NAV */}
      <nav style={navStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#00b89e,#8060cc)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 14px rgba(0,212,184,.3)' }}>
            <Heart size={16} color="#fff" fill="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: P, fontSize: 16, color: '#eef2f8', letterSpacing: .5 }}>CareCircle</div>
            <div style={{ fontFamily: T, fontSize: 7, color: '#00d4b8', letterSpacing: '2px', textTransform: 'uppercase' }}>FQHC Edition</div>
          </div>
        </div>
        <div className="nav-desktop" style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          <a href="#features" className="nav-link">Features</a>
          <a href="#how" className="nav-link">How It Works</a>
          <a href="#pricing" className="nav-link">Pricing</a>
          <Link href="/app" style={{ padding: '9px 22px', borderRadius: 10, background: 'linear-gradient(135deg,#00d4b8,#00b89e)', color: '#07101f', fontSize: 13, fontWeight: 700, textDecoration: 'none', letterSpacing: .5 }}>Open App</Link>
        </div>
        <button className="nav-mobile-toggle" style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', flexDirection: 'column', gap: 5, padding: 4 }} onClick={() => setMobileMenu(!mobileMenu)}>
          <span style={{ display: 'block', width: 20, height: 2, background: '#eef2f8', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 20, height: 2, background: '#eef2f8', borderRadius: 2 }} />
          <span style={{ display: 'block', width: 20, height: 2, background: '#eef2f8', borderRadius: 2 }} />
        </button>
      </nav>

      {mobileMenu && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,16,31,.98)', zIndex: 99, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          <a href="#features" className="nav-link" style={{ fontSize: 18 }} onClick={() => setMobileMenu(false)}>Features</a>
          <a href="#how" className="nav-link" style={{ fontSize: 18 }} onClick={() => setMobileMenu(false)}>How It Works</a>
          <a href="#pricing" className="nav-link" style={{ fontSize: 18 }} onClick={() => setMobileMenu(false)}>Pricing</a>
          <Link href="/app" style={{ padding: '14px 36px', borderRadius: 12, background: 'linear-gradient(135deg,#00d4b8,#00b89e)', color: '#07101f', fontSize: 16, fontWeight: 700, textDecoration: 'none' }} onClick={() => setMobileMenu(false)}>Open App</Link>
        </div>
      )}

      {/* HERO */}
      <section className="hero-section" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 600px 400px at 20% 30%,rgba(0,212,184,.06),transparent),radial-gradient(ellipse 500px 500px at 80% 70%,rgba(128,96,204,.05),transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: .035 }}>
          <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
            <defs><pattern id="hex" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse"><polygon points="30,2 58,17 58,47 30,62 2,47 2,17" fill="none" stroke="#00d4b8" strokeWidth=".7"/></pattern></defs>
            <rect width="800" height="600" fill="url(#hex)" />
          </svg>
        </div>

        <FadeIn>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 18px', borderRadius: 24, background: 'rgba(0,212,184,.08)', border: '1px solid rgba(0,212,184,.2)', fontSize: 12, fontWeight: 700, color: '#00d4b8', marginBottom: 28, fontFamily: T, letterSpacing: 1, textTransform: 'uppercase' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', animation: 'pulse-dot 2s infinite' }} />
            Now in early access · Sovereign Shield Protected
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <h1 style={{ fontFamily: P, fontSize: 'clamp(36px,6vw,68px)', fontWeight: 300, lineHeight: 1.1, letterSpacing: -1, maxWidth: 800, marginBottom: 24, color: '#eef2f8', position: 'relative' }}>
            Your family&apos;s{' '}
            <em style={{ fontStyle: 'italic', color: '#00d4b8', animation: 'glow 3s ease-in-out infinite' }}>care command center</em>
          </h1>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p style={{ fontSize: 'clamp(15px,2.2vw,19px)', lineHeight: 1.7, color: '#7a9bbf', maxWidth: 560, marginBottom: 40 }}>
            One shared place for medications, appointments, tasks, documents, and an AI assistant that keeps everyone in the loop — all protected by the Sovereign Prompt Shield.
          </p>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 48 }}>
            <Link href="/app" style={{ padding: '15px 32px', borderRadius: 12, background: 'linear-gradient(135deg,#00d4b8,#00b89e)', color: '#07101f', fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 0 24px rgba(0,212,184,.3)', transition: 'all .2s' }}>
              Try the Demo <ArrowRight size={18} />
            </Link>
            <a href="#features" style={{ padding: '15px 32px', borderRadius: 12, background: 'transparent', color: '#eef2f8', fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(0,212,184,.3)', transition: 'all .2s' }}>
              See Features
            </a>
          </div>
        </FadeIn>

        <FadeIn delay={0.45}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex' }}>
              {['#00d4b8', '#8060cc', '#4ade80', '#d4a843', '#e8526e'].map((c, i) => (
                <div key={i} style={{ width: 36, height: 36, borderRadius: '50%', background: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#07101f', border: '2.5px solid #07101f', marginLeft: i === 0 ? 0 : -8 }}>
                  {['R', 'D', 'M', 'K', 'S'][i]}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 13, color: '#7a9bbf' }}>
              Trusted by <strong style={{ color: '#00d4b8' }}>2,400+ families</strong> in early access
            </span>
          </div>
        </FadeIn>

        {/* Shield Badge */}
        <FadeIn delay={0.55}>
          <div style={{ marginTop: 40, display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderRadius: 12, background: 'rgba(74,222,128,.06)', border: '1px solid rgba(74,222,128,.2)' }}>
            <Shield size={16} color="#4ade80" />
            <span style={{ fontFamily: T, fontSize: 10, color: '#4ade80', letterSpacing: 1, textTransform: 'uppercase' }}>Sovereign Prompt Shield Active · HIPAA Aligned · Patient Data Protected</span>
          </div>
        </FadeIn>
      </section>

      {/* PROBLEM */}
      <section className="section" style={{ padding: '100px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <FadeIn>
          <div style={{ fontFamily: T, fontSize: 10, color: '#00d4b8', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 }}>The Problem</div>
          <h2 style={{ fontFamily: P, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 16, color: '#eef2f8' }}>
            Caring for aging parents shouldn&apos;t require<br />a project management degree
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: '#7a9bbf', maxWidth: 560, marginBottom: 48 }}>
            53 million Americans are family caregivers. Most are coordinating complex care with the worst possible tools.
          </p>
        </FadeIn>
        <div className="problem-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { emoji: '💬', title: 'Scattered group texts', text: 'Critical updates buried in WhatsApp threads with 200+ unread messages.' },
            { emoji: '📁', title: 'Paper folders and sticky notes', text: 'Insurance cards photographed 6 times by 3 siblings and still no one can find them.' },
            { emoji: '📊', title: 'DIY spreadsheets', text: 'Someone made a med tracker in Google Sheets. It was last updated in February.' },
            { emoji: '🏥', title: 'Disconnected portals', text: 'Three different patient portals, none of them talk to each other or to your family.' },
          ].map((item, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div className="problem-card">
                <div style={{ fontSize: 28, marginBottom: 14 }}>{item.emoji}</div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, color: '#eef2f8' }}>{item.title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.65, color: '#7a9bbf' }}>{item.text}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="section" style={{ padding: '100px 24px', background: 'rgba(255,255,255,.02)', borderTop: '1px solid rgba(0,212,184,.08)', borderBottom: '1px solid rgba(0,212,184,.08)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ fontFamily: T, fontSize: 10, color: '#00d4b8', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 }}>Features</div>
            <h2 style={{ fontFamily: P, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 16, color: '#eef2f8' }}>
              Everything your care team needs,<br />nothing it doesn&apos;t
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: '#7a9bbf', maxWidth: 540, marginBottom: 48 }}>
              Built for the reality of family caregiving — urgent, emotional, and happening on your phone in the pharmacy parking lot.
            </p>
          </FadeIn>
          <div className="features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {FEATURES.map((f, i) => (
              <FadeIn key={i} delay={i * 0.06}>
                <div className="feature-card" style={{ '--accent': f.color } as React.CSSProperties}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${f.color}18`, border: `1px solid ${f.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                    <f.icon size={20} color={f.color} />
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#eef2f8' }}>{f.title}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.65, color: '#7a9bbf' }}>{f.desc}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="section" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ fontFamily: T, fontSize: 10, color: '#00d4b8', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 }}>How It Works</div>
            <h2 style={{ fontFamily: P, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 16, color: '#eef2f8' }}>Up and running in 5 minutes</h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: '#7a9bbf', maxWidth: 480, marginBottom: 48 }}>No training, no onboarding calls. If you can use a group chat, you can use CareCircle.</p>
          </FadeIn>
          <div className="steps-row" style={{ display: 'flex', gap: 20, counterReset: 'step' }}>
            {[
              { title: 'Add your care recipient', text: "Enter Mom or Dad's basics — medications, conditions, doctors, and allergies. Takes about 3 minutes." },
              { title: 'Invite your care team', text: 'Add siblings, a spouse, or a professional caregiver. Everyone gets their own view with assigned tasks.' },
              { title: 'Let AI do the busywork', text: 'CareCircle watches for refill dates, drafts family updates, preps appointment summaries, and flags what needs attention.' },
            ].map((s, i) => (
              <FadeIn key={i} delay={i * 0.12}>
                <div className="step-card">
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: '#eef2f8' }}>{s.title}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.65, color: '#7a9bbf' }}>{s.text}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="section" style={{ padding: '100px 24px', background: 'rgba(255,255,255,.02)', borderTop: '1px solid rgba(0,212,184,.08)', borderBottom: '1px solid rgba(0,212,184,.08)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ fontFamily: T, fontSize: 10, color: '#00d4b8', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 }}>Testimonials</div>
            <h2 style={{ fontFamily: P, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 16, color: '#eef2f8' }}>Families who got their lives back</h2>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: '#7a9bbf', marginBottom: 48 }}>Real caregivers, real relief.</p>
          </FadeIn>
          <div className="testimonials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="testimonial-card">
                  <div style={{ display: 'flex', gap: 3, marginBottom: 14 }}>
                    {Array(t.stars).fill(0).map((_, j) => <Star key={j} size={15} fill="#d4a843" color="#d4a843" />)}
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, fontStyle: 'italic', color: '#eef2f8', marginBottom: 16 }}>&ldquo;{t.text}&rdquo;</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#00d4b8' }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: '#7a9bbf', marginTop: 2 }}>{t.role}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="section" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
              <div style={{ fontFamily: T, fontSize: 10, color: '#00d4b8', textTransform: 'uppercase', letterSpacing: 3, marginBottom: 12 }}>Pricing</div>
              <h2 style={{ fontFamily: P, fontSize: 'clamp(26px,4vw,42px)', fontWeight: 300, lineHeight: 1.2, marginBottom: 16, color: '#eef2f8' }}>Plans that grow with your family</h2>
              <p style={{ fontSize: 16, lineHeight: 1.7, color: '#7a9bbf', maxWidth: 480, margin: '0 auto' }}>Start free, upgrade when you need AI summaries, more storage, or a bigger care team.</p>
            </div>
          </FadeIn>
          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, alignItems: 'start' }}>
            {PRICING.map((plan, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className={`price-card ${plan.featured ? 'featured' : ''}`}>
                  {plan.featured && (
                    <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '4px 16px', borderRadius: 20, background: 'linear-gradient(135deg,#00d4b8,#00b89e)', color: '#07101f', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Most Popular</div>
                  )}
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: '#eef2f8' }}>{plan.name}</div>
                  <div style={{ marginBottom: 4 }}>
                    <span style={{ fontFamily: P, fontSize: 40, fontWeight: 400, color: plan.featured ? '#00d4b8' : '#eef2f8', letterSpacing: -1 }}>{plan.price}</span>
                    <span style={{ fontSize: 14, color: '#7a9bbf' }}>{plan.period}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#7a9bbf', marginBottom: 20 }}>{plan.desc}</div>
                  <ul style={{ listStyle: 'none', marginBottom: 24 }}>
                    {plan.features.map((f, j) => (
                      <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, padding: '6px 0', color: '#eef2f8', borderBottom: j < plan.features.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: plan.featured ? 'rgba(0,212,184,.15)' : 'rgba(74,222,128,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                          <Check size={11} color={plan.featured ? '#00d4b8' : '#4ade80'} />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/app" style={{ display: 'block', width: '100%', padding: 14, borderRadius: 12, fontSize: 14, fontWeight: 700, textAlign: 'center', textDecoration: 'none', background: plan.featured ? 'linear-gradient(135deg,#00d4b8,#00b89e)' : 'rgba(255,255,255,.06)', color: plan.featured ? '#07101f' : '#eef2f8', border: plan.featured ? 'none' : '1px solid rgba(0,212,184,.2)', transition: 'all .2s' }}>
                    {plan.cta}
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ textAlign: 'center', padding: '100px 24px', background: 'linear-gradient(135deg,rgba(0,212,184,.08),rgba(128,96,204,.06))', borderTop: '1px solid rgba(0,212,184,.14)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: .03 }}>
          <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 800 400" preserveAspectRatio="xMidYMid slice">
            <defs><pattern id="hex2" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse"><polygon points="30,2 58,17 58,47 30,62 2,47 2,17" fill="none" stroke="#00d4b8" strokeWidth=".7"/></pattern></defs>
            <rect width="800" height="400" fill="url(#hex2)" />
          </svg>
        </div>
        <FadeIn>
          <h2 style={{ fontFamily: P, fontSize: 'clamp(28px,5vw,48px)', fontWeight: 300, lineHeight: 1.15, letterSpacing: -1, maxWidth: 600, margin: '0 auto 16px', color: '#eef2f8', position: 'relative' }}>
            Your parents took care of you.<br />
            <em style={{ color: '#00d4b8', fontStyle: 'italic' }}>Now it&apos;s your turn.</em>
          </h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p style={{ fontSize: 17, color: '#7a9bbf', maxWidth: 480, margin: '0 auto 36px', lineHeight: 1.65, position: 'relative' }}>
            Join 2,400+ families already using CareCircle to coordinate care with less stress and more confidence.
          </p>
        </FadeIn>
        <FadeIn delay={0.2}>
          <div style={{ display: 'flex', gap: 10, maxWidth: 440, margin: '0 auto', position: 'relative' }}>
            <input style={{ flex: 1, padding: '15px 20px', borderRadius: 12, border: '1px solid rgba(0,212,184,.2)', background: 'rgba(255,255,255,.05)', color: '#eef2f8', fontSize: 15, outline: 'none', fontFamily: O }} placeholder="Enter your email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <Link href="/app" style={{ padding: '15px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#00d4b8,#00b89e)', color: '#07101f', fontSize: 15, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', boxShadow: '0 0 20px rgba(0,212,184,.3)' }}>
              Get Early Access
            </Link>
          </div>
          <div style={{ fontFamily: T, fontSize: 10, color: '#7a9bbf', marginTop: 14, letterSpacing: 1, position: 'relative' }}>
            Free plan available · No credit card required · Patient Data Protected
          </div>
        </FadeIn>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '40px 24px 32px', borderTop: '1px solid rgba(0,212,184,.14)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#00b89e,#8060cc)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={13} color="#fff" fill="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: P, fontSize: 14, color: '#eef2f8' }}>CareCircle</div>
              <div style={{ fontFamily: T, fontSize: 9, color: '#7a9bbf', letterSpacing: 1 }}>SOVEREIGN SHIELD TECHNOLOGIES LLC</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#7a9bbf' }}>© 2026 Sovereign Shield Technologies LLC · Made with care for caregivers.</div>
          <div style={{ display: 'flex', gap: 24 }}>
            {['Privacy', 'Terms', 'HIPAA', 'Contact'].map(l => (
              <button key={l} style={{ fontSize: 12, color: '#7a9bbf', background: 'none', border: 'none', cursor: 'pointer', fontFamily: O, transition: 'color .2s' }}>{l}</button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
