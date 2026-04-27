'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Heart, Calendar, Users, FileText, Pill, Star, ArrowRight, Check,
  AlertTriangle, Bot,
} from 'lucide-react';

const TESTIMONIALS = [
  { name: 'Rachel M.', role: 'Caring for her father', text: "I was drowning in group texts and sticky notes. CareCircle gave our family one place to coordinate everything. Dad's care has never been this organized.", stars: 5 },
  { name: 'David K.', role: 'Long-distance caregiver', text: 'Living 800 miles from Mom, I always felt out of the loop. Now I see every appointment, every med change, every update — in real time.', stars: 5 },
  { name: 'Maria S.', role: 'Coordinating for both parents', text: "The AI summaries after doctor visits are a game-changer. I just share them with my brothers and everyone's on the same page instantly.", stars: 5 },
];

const FEATURES = [
  { icon: Pill, title: 'Medication Tracker', desc: 'Visual daily schedule with refill alerts, dosage history, and one-tap logging for the whole family to see.', color: '#E07A5F', bg: '#FFF0EC' },
  { icon: Calendar, title: 'Shared Care Calendar', desc: 'Every appointment, lab, and therapy session in one place. Prep notes, directions, and post-visit summaries attached.', color: '#5B8FA8', bg: '#EBF3F7' },
  { icon: Users, title: 'Task Assignments', desc: 'Divide care duties fairly. Assign tasks by family member with priority levels, due dates, and completion tracking.', color: '#81B29A', bg: '#EDF7F1' },
  { icon: FileText, title: 'Secure Document Vault', desc: 'Insurance cards, legal docs, lab results, and care plans — encrypted, organized, and accessible when you need them.', color: '#8B7EC8', bg: '#F0EDF8' },
  { icon: Bot, title: 'AI Care Assistant', desc: 'Turn doctor visit notes into clear next steps. Draft family updates. Get proactive alerts about refills and follow-ups.', color: '#2C2A28', bg: '#F0EDEA' },
  { icon: AlertTriangle, title: 'Emergency Profile', desc: 'One-tap access to conditions, medications, allergies, and emergency contacts — ready for first responders and ER staff.', color: '#D64045', bg: '#FDEAEA' },
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
    features: ['Unlimited care recipients', 'Up to 8 family members', 'AI visit summaries & updates', 'Document vault (25GB)', 'Smart reminders & alerts', 'Priority support', 'Family activity feed'],
    cta: 'Start 14-Day Free Trial',
    featured: true,
  },
  {
    name: 'Family+',
    price: '$19',
    period: '/month',
    desc: 'For complex care coordination',
    features: ['Everything in Family', 'Unlimited family members', 'AI care assistant (unlimited)', 'Document scanning & OCR', 'Medication interaction alerts', 'Care provider sharing portal', 'HIPAA-compliant exports'],
    cta: 'Start 14-Day Free Trial',
    featured: false,
  },
];

function useInView(threshold = 0.15) {
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

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const [ref, visible] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [email, setEmail] = useState('');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <div style={{ background: '#FAF8F5', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", color: '#2C2A28' }}>
      <style>{`
        .lp-nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;transition:all .3s}
        .lp-nav.scrolled{background:rgba(250,248,245,.92);backdrop-filter:blur(20px);border-bottom:1px solid #EDE8E3;padding:12px 24px}
        .lp-logo{font-family:'Fraunces',Georgia,serif;font-size:22px;font-weight:500;display:flex;align-items:center;gap:8px}
        .lp-logo-mark{width:32px;height:32px;background:#E07A5F;border-radius:50%;display:flex;align-items:center;justify-content:center}
        .lp-nav-links{display:flex;gap:32px;align-items:center}
        .lp-nav-link{font-size:14px;font-weight:500;color:#7A7570;background:none;border:none;cursor:pointer;text-decoration:none;transition:color .2s}
        .lp-nav-link:hover{color:#2C2A28}
        .lp-cta-sm{padding:10px 22px;border-radius:10px;background:#2C2A28;color:#fff;font-size:14px;font-weight:600;border:none;cursor:pointer;text-decoration:none;display:inline-block;transition:all .2s}
        .lp-cta-sm:hover{background:#E07A5F;transform:translateY(-1px)}
        .lp-hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:120px 24px 80px;text-align:center;position:relative;overflow:hidden}
        .lp-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 600px 400px at 20% 30%,rgba(224,122,95,.08),transparent),radial-gradient(ellipse 500px 500px at 80% 70%,rgba(129,178,154,.07),transparent),radial-gradient(ellipse 400px 300px at 50% 50%,rgba(91,143,168,.05),transparent)}
        .lp-badge{display:inline-flex;align-items:center;gap:8px;padding:8px 18px;border-radius:24px;background:#fff;border:1px solid #EDE8E3;font-size:13px;font-weight:500;color:#7A7570;margin-bottom:28px;position:relative;box-shadow:0 2px 8px rgba(44,42,40,.04)}
        .lp-badge-dot{width:8px;height:8px;border-radius:50%;background:#81B29A;animation:pulse-dot 2s infinite}
        .lp-h1{font-family:'Fraunces',Georgia,serif;font-size:clamp(38px,6vw,68px);font-weight:400;line-height:1.1;letter-spacing:-1.5px;max-width:800px;margin-bottom:24px;position:relative}
        .lp-h1 em{font-style:italic;font-weight:300;color:#E07A5F}
        .lp-sub{font-size:clamp(16px,2.2vw,20px);line-height:1.6;color:#7A7570;max-width:560px;margin-bottom:40px;position:relative}
        .lp-hero-actions{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;position:relative}
        .lp-cta-big{padding:16px 36px;border-radius:14px;font-size:16px;font-weight:600;border:none;display:inline-flex;align-items:center;gap:8px;text-decoration:none;cursor:pointer;transition:all .25s}
        .lp-cta-primary{background:#E07A5F;color:#fff;box-shadow:0 4px 16px rgba(224,122,95,.3)}
        .lp-cta-primary:hover{background:#c4623f;box-shadow:0 6px 24px rgba(224,122,95,.4);transform:translateY(-2px)}
        .lp-cta-secondary{background:#fff;color:#2C2A28;border:1.5px solid #EDE8E3}
        .lp-cta-secondary:hover{border-color:#2C2A28;transform:translateY(-2px)}
        .lp-social-proof{margin-top:48px;display:flex;flex-direction:column;align-items:center;gap:8px;position:relative}
        .lp-avatars{display:flex}
        .lp-avatar-circle{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:#fff;border:2.5px solid #FAF8F5;margin-left:-8px}
        .lp-avatar-circle:first-child{margin-left:0}
        .lp-section{padding:100px 24px;max-width:1100px;margin:0 auto}
        .lp-section-label{font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#E07A5F;margin-bottom:12px}
        .lp-section-title{font-family:'Fraunces',Georgia,serif;font-size:clamp(28px,4vw,44px);font-weight:400;line-height:1.15;letter-spacing:-.8px;margin-bottom:16px}
        .lp-section-subtitle{font-size:17px;line-height:1.6;color:#7A7570;max-width:560px;margin-bottom:48px}
        .lp-problem-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:40px}
        @media (max-width:640px){.lp-problem-grid{grid-template-columns:1fr}}
        .lp-problem-card{padding:28px;border-radius:18px;border:1px solid #EDE8E3;background:#fff;transition:all .2s}
        .lp-problem-card:hover{box-shadow:0 8px 24px rgba(44,42,40,.06)}
        .lp-problem-emoji{font-size:28px;margin-bottom:14px}
        .lp-problem-title{font-weight:600;font-size:15px;margin-bottom:6px}
        .lp-problem-text{font-size:14px;line-height:1.6;color:#7A7570}
        .lp-features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        @media (max-width:900px){.lp-features-grid{grid-template-columns:repeat(2,1fr)}}
        @media (max-width:600px){.lp-features-grid{grid-template-columns:1fr}}
        .lp-feature-card{padding:32px 24px;border-radius:18px;border:1px solid #EDE8E3;background:#fff;transition:all .25s;position:relative;overflow:hidden}
        .lp-feature-card:hover{transform:translateY(-4px);box-shadow:0 12px 32px rgba(44,42,40,.08);border-color:transparent}
        .lp-feature-icon{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:20px}
        .lp-feature-title{font-weight:600;font-size:16px;margin-bottom:8px}
        .lp-feature-desc{font-size:14px;line-height:1.65;color:#7A7570}
        .lp-steps{display:flex;gap:24px;margin-top:48px;counter-reset:step}
        @media (max-width:700px){.lp-steps{flex-direction:column}}
        .lp-step{flex:1;padding:32px 24px;border-radius:18px;background:#fff;border:1px solid #EDE8E3;position:relative;counter-increment:step}
        .lp-step::before{content:counter(step);font-family:'Fraunces',Georgia,serif;font-size:52px;font-weight:300;color:rgba(224,122,95,.15);position:absolute;top:16px;right:20px;line-height:1}
        .lp-step-title{font-weight:600;font-size:16px;margin-bottom:8px}
        .lp-step-text{font-size:14px;line-height:1.6;color:#7A7570}
        .lp-testimonials{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
        @media (max-width:800px){.lp-testimonials{grid-template-columns:1fr}}
        .lp-testimonial{padding:28px;border-radius:18px;background:#fff;border:1px solid #EDE8E3}
        .lp-stars{display:flex;gap:2px;margin-bottom:14px}
        .lp-quote{font-size:15px;line-height:1.65;font-style:italic;color:#2C2A28;margin-bottom:16px}
        .lp-attribution{font-size:13px;font-weight:600}
        .lp-attr-role{font-size:12px;color:#7A7570;font-weight:400}
        .lp-pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;align-items:start}
        @media (max-width:800px){.lp-pricing-grid{grid-template-columns:1fr;max-width:400px;margin:0 auto}}
        .lp-price-card{padding:32px 24px;border-radius:20px;background:#fff;border:1px solid #EDE8E3;position:relative;transition:all .2s}
        .lp-price-card.featured{border-color:#E07A5F;box-shadow:0 8px 32px rgba(224,122,95,.15);transform:scale(1.03)}
        .lp-price-popular{position:absolute;top:-12px;left:50%;transform:translateX(-50%);padding:4px 16px;border-radius:20px;background:#E07A5F;color:#fff;font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase}
        .lp-price-name{font-weight:600;font-size:16px;margin-bottom:4px}
        .lp-price-amount{font-family:'Fraunces',Georgia,serif;font-size:42px;font-weight:500;letter-spacing:-1px}
        .lp-price-period{font-size:15px;color:#7A7570;font-weight:400;font-family:'DM Sans',sans-serif}
        .lp-price-desc{font-size:13px;color:#7A7570;margin:8px 0 20px}
        .lp-price-features{list-style:none;margin-bottom:24px}
        .lp-price-features li{display:flex;align-items:flex-start;gap:8px;font-size:14px;padding:6px 0;color:#2C2A28}
        .lp-price-check{width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
        .lp-price-btn{width:100%;padding:14px;border-radius:12px;font-size:15px;font-weight:600;border:none;cursor:pointer;display:block;text-align:center;text-decoration:none;transition:all .2s}
        .lp-price-btn.primary{background:#E07A5F;color:#fff}
        .lp-price-btn.primary:hover{background:#c4623f}
        .lp-price-btn.outline{background:#fff;color:#2C2A28;border:1.5px solid #EDE8E3}
        .lp-price-btn.outline:hover{border-color:#2C2A28}
        .lp-final-cta{text-align:center;padding:100px 24px;background:#2C2A28;color:#fff;position:relative;overflow:hidden}
        .lp-final-cta::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 600px 400px at 30% 50%,rgba(224,122,95,.12),transparent),radial-gradient(ellipse 400px 400px at 70% 50%,rgba(129,178,154,.08),transparent)}
        .lp-final-title{font-family:'Fraunces',Georgia,serif;font-size:clamp(30px,5vw,48px);font-weight:400;line-height:1.15;letter-spacing:-1px;max-width:600px;margin:0 auto 16px;position:relative}
        .lp-final-sub{font-size:17px;color:rgba(255,255,255,.65);max-width:480px;margin:0 auto 36px;line-height:1.6;position:relative}
        .lp-email-row{display:flex;gap:10px;max-width:440px;margin:0 auto;position:relative}
        @media (max-width:500px){.lp-email-row{flex-direction:column}}
        .lp-email-input{flex:1;padding:16px 20px;border-radius:12px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:#fff;font-size:15px;outline:none;transition:border-color .2s;font-family:inherit}
        .lp-email-input::placeholder{color:rgba(255,255,255,.4)}
        .lp-email-input:focus{border-color:#E07A5F}
        .lp-email-btn{padding:16px 28px;border-radius:12px;background:#E07A5F;color:#fff;font-size:15px;font-weight:600;border:none;cursor:pointer;text-decoration:none;display:inline-block;white-space:nowrap;transition:all .2s}
        .lp-email-btn:hover{background:#c4623f}
        .lp-fine-print{font-size:12px;color:rgba(255,255,255,.35);margin-top:14px;position:relative}
        .lp-footer{padding:48px 24px 32px;border-top:1px solid #EDE8E3;max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}
        .lp-footer-copy{font-size:13px;color:#7A7570}
        .lp-footer-links{display:flex;gap:24px}
        .lp-footer-link{font-size:13px;color:#7A7570;cursor:pointer;transition:color .2s;background:none;border:none;font-family:inherit}
        .lp-footer-link:hover{color:#2C2A28}
        .lp-mobile-toggle{display:none;background:none;border:none;width:32px;height:32px;flex-direction:column;justify-content:center;gap:5px;align-items:center;cursor:pointer}
        .lp-mobile-toggle span{display:block;width:20px;height:2px;background:#2C2A28;border-radius:2px;transition:all .2s}
        @media (max-width:768px){.lp-nav-links{display:none}.lp-mobile-toggle{display:flex}.lp-hero{padding:100px 20px 60px}.lp-section{padding:60px 20px}}
        [id]{scroll-margin-top:80px}
      `}</style>

      <nav className={`lp-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="lp-logo">
          <div className="lp-logo-mark"><Heart size={16} color="#fff" fill="#fff" /></div>
          CareCircle
        </div>
        <div className="lp-nav-links">
          <a href="#features" className="lp-nav-link">Features</a>
          <a href="#how" className="lp-nav-link">How It Works</a>
          <a href="#pricing" className="lp-nav-link">Pricing</a>
          <Link href="/app" className="lp-cta-sm">Open App</Link>
        </div>
        <button className="lp-mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </nav>

      {mobileMenu && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(250,248,245,0.98)', zIndex: 99, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
          <a href="#features" className="lp-nav-link" style={{ fontSize: 20 }} onClick={() => setMobileMenu(false)}>Features</a>
          <a href="#how" className="lp-nav-link" style={{ fontSize: 20 }} onClick={() => setMobileMenu(false)}>How It Works</a>
          <a href="#pricing" className="lp-nav-link" style={{ fontSize: 20 }} onClick={() => setMobileMenu(false)}>Pricing</a>
          <Link href="/app" className="lp-cta-sm" style={{ fontSize: 16, padding: '14px 32px' }} onClick={() => setMobileMenu(false)}>Open App</Link>
        </div>
      )}

      <section className="lp-hero">
        <FadeIn>
          <div className="lp-badge"><div className="lp-badge-dot" />Now in early access</div>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h1 className="lp-h1">Your family&apos;s <em>care&nbsp;command center</em></h1>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="lp-sub">One shared place for medications, appointments, tasks, documents, and an AI assistant that keeps everyone in the loop.</p>
        </FadeIn>
        <FadeIn delay={0.3}>
          <div className="lp-hero-actions">
            <Link href="/app" className="lp-cta-big lp-cta-primary">Try the Demo <ArrowRight size={18} /></Link>
            <a href="#features" className="lp-cta-big lp-cta-secondary">See Features</a>
          </div>
        </FadeIn>
        <FadeIn delay={0.45}>
          <div className="lp-social-proof">
            <div className="lp-avatars">
              {['#E07A5F', '#81B29A', '#5B8FA8', '#F2CC8F', '#8B7EC8'].map((c, i) => (
                <div key={i} className="lp-avatar-circle" style={{ background: c }}>{['R', 'D', 'M', 'K', 'S'][i]}</div>
              ))}
            </div>
            <span style={{ fontSize: 13, color: '#7A7570' }}>
              Trusted by <strong style={{ color: '#2C2A28' }}>2,400+ families</strong> in early access
            </span>
          </div>
        </FadeIn>
      </section>

      <section className="lp-section">
        <FadeIn>
          <div className="lp-section-label">The Problem</div>
          <h2 className="lp-section-title">Caring for aging parents shouldn&apos;t require<br />a project management degree</h2>
          <p className="lp-section-subtitle">53 million Americans are family caregivers. Most are coordinating complex care with the worst possible tools.</p>
        </FadeIn>
        <div className="lp-problem-grid">
          {[
            { emoji: '💬', title: 'Scattered group texts', text: 'Critical updates buried in WhatsApp threads with 200+ unread messages.' },
            { emoji: '📁', title: 'Paper folders and sticky notes', text: 'Insurance cards photographed 6 times by 3 siblings and still no one can find them.' },
            { emoji: '📊', title: 'DIY spreadsheets', text: 'Someone made a med tracker in Google Sheets. It was last updated in February.' },
            { emoji: '🏥', title: 'Disconnected portals', text: 'Three different patient portals, none of them talk to each other or to your family.' },
          ].map((item, i) => (
            <FadeIn key={i} delay={i * 0.08}>
              <div className="lp-problem-card">
                <div className="lp-problem-emoji">{item.emoji}</div>
                <div className="lp-problem-title">{item.title}</div>
                <div className="lp-problem-text">{item.text}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="lp-section" id="features">
        <FadeIn>
          <div className="lp-section-label">Features</div>
          <h2 className="lp-section-title">Everything your care team needs,<br />nothing it doesn&apos;t</h2>
          <p className="lp-section-subtitle">Built for the reality of family caregiving — urgent, emotional, and happening on your phone in the pharmacy parking lot.</p>
        </FadeIn>
        <div className="lp-features-grid">
          {FEATURES.map((f, i) => (
            <FadeIn key={i} delay={i * 0.06}>
              <div className="lp-feature-card">
                <div className="lp-feature-icon" style={{ background: f.bg }}>
                  <f.icon size={22} color={f.color} />
                </div>
                <div className="lp-feature-title">{f.title}</div>
                <div className="lp-feature-desc">{f.desc}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="lp-section" id="how" style={{ background: '#fff', maxWidth: 'none', padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <div className="lp-section-label">How It Works</div>
            <h2 className="lp-section-title">Up and running in 5 minutes</h2>
            <p className="lp-section-subtitle">No training, no onboarding calls. If you can use a group chat, you can use CareCircle.</p>
          </FadeIn>
          <div className="lp-steps">
            {[
              { title: 'Add your care recipient', text: "Enter Mom or Dad's basics — medications, conditions, doctors, and allergies. Takes about 3 minutes." },
              { title: 'Invite your care team', text: 'Add siblings, a spouse, or a professional caregiver. Everyone gets their own view with assigned tasks.' },
              { title: 'Let AI do the busywork', text: 'CareCircle watches for refill dates, drafts family updates, preps appointment summaries, and flags what needs attention.' },
            ].map((s, i) => (
              <FadeIn key={i} delay={i * 0.12}>
                <div className="lp-step">
                  <div className="lp-step-title">{s.title}</div>
                  <div className="lp-step-text">{s.text}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-section">
        <FadeIn>
          <div className="lp-section-label">Testimonials</div>
          <h2 className="lp-section-title">Families who got their lives back</h2>
          <p className="lp-section-subtitle">Real caregivers, real relief.</p>
        </FadeIn>
        <div className="lp-testimonials">
          {TESTIMONIALS.map((t, i) => (
            <FadeIn key={i} delay={i * 0.1}>
              <div className="lp-testimonial">
                <div className="lp-stars">
                  {Array(t.stars).fill(0).map((_, j) => (
                    <Star key={j} size={16} fill="#F2CC8F" color="#F2CC8F" />
                  ))}
                </div>
                <div className="lp-quote">&ldquo;{t.text}&rdquo;</div>
                <div className="lp-attribution">
                  {t.name}<br />
                  <span className="lp-attr-role">{t.role}</span>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="lp-section" id="pricing" style={{ background: '#fff', maxWidth: 'none', padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center' }}>
              <div className="lp-section-label">Pricing</div>
              <h2 className="lp-section-title">Plans that grow with your family&apos;s needs</h2>
              <p className="lp-section-subtitle" style={{ margin: '0 auto 48px' }}>
                Start free, upgrade when you need AI summaries, more storage, or a bigger care team.
              </p>
            </div>
          </FadeIn>
          <div className="lp-pricing-grid">
            {PRICING.map((plan, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className={`lp-price-card ${plan.featured ? 'featured' : ''}`}>
                  {plan.featured && <div className="lp-price-popular">Most Popular</div>}
                  <div className="lp-price-name">{plan.name}</div>
                  <div>
                    <span className="lp-price-amount">{plan.price}</span>
                    <span className="lp-price-period">{plan.period}</span>
                  </div>
                  <div className="lp-price-desc">{plan.desc}</div>
                  <ul className="lp-price-features">
                    {plan.features.map((f, j) => (
                      <li key={j}>
                        <div className="lp-price-check" style={{ background: plan.featured ? '#FFF0EC' : '#EDF7F1' }}>
                          <Check size={12} color={plan.featured ? '#E07A5F' : '#81B29A'} />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/app" className={`lp-price-btn ${plan.featured ? 'primary' : 'outline'}`}>
                    {plan.cta}
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-final-cta">
        <FadeIn>
          <h2 className="lp-final-title">Your parents took care of you.<br />Now it&apos;s your turn.</h2>
        </FadeIn>
        <FadeIn delay={0.1}>
          <p className="lp-final-sub">Join 2,400+ families already using CareCircle to coordinate care with less stress and more confidence.</p>
        </FadeIn>
        <FadeIn delay={0.2}>
          <div className="lp-email-row">
            <input className="lp-email-input" placeholder="Enter your email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            <Link href="/app" className="lp-email-btn">Get Early Access</Link>
          </div>
          <div className="lp-fine-print">Free plan available · No credit card required · HIPAA-ready</div>
        </FadeIn>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-copy">© 2026 CareCircle. Made with care for caregivers.</div>
        <div className="lp-footer-links">
          <button className="lp-footer-link">Privacy</button>
          <button className="lp-footer-link">Terms</button>
          <button className="lp-footer-link">HIPAA</button>
          <button className="lp-footer-link">Contact</button>
        </div>
      </footer>
    </div>
  );
}
