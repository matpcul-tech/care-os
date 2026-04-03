// ─── CareCircle Demo Data ───

export const FAMILY_MEMBERS = [
  { id: 'mom', name: 'Mom (Dorothy)', avatar: 'D', color: '#E07A5F', role: 'Care Recipient' },
  { id: 'you', name: 'You (Matt)', avatar: 'M', color: '#3D405B', role: 'Primary Caregiver' },
  { id: 'sister', name: 'Sarah', avatar: 'S', color: '#81B29A', role: 'Caregiver' },
  { id: 'brother', name: 'James', avatar: 'J', color: '#F2CC8F', role: 'Caregiver' },
]

export const DEFAULT_MEDS = [
  { id: 1, name: 'Lisinopril 10mg', schedule: '8:00 AM daily', taken: true, refillDate: 'Apr 15', pillsLeft: 12, forPerson: 'mom', notes: 'ACE inhibitor for blood pressure' },
  { id: 2, name: 'Metformin 500mg', schedule: '8:00 AM & 6:00 PM', taken: false, refillDate: 'Apr 22', pillsLeft: 28, forPerson: 'mom', notes: 'Type 2 diabetes management' },
  { id: 3, name: 'Vitamin D3 2000IU', schedule: 'Morning with food', taken: true, refillDate: 'May 3', pillsLeft: 45, forPerson: 'mom', notes: 'Supplement — take with breakfast' },
  { id: 4, name: 'Amlodipine 5mg', schedule: '9:00 PM daily', taken: false, refillDate: 'Apr 10', pillsLeft: 6, forPerson: 'mom', notes: 'Calcium channel blocker — may cause swelling' },
]

export const DEFAULT_APPOINTMENTS = [
  { id: 1, title: 'Dr. Patel — Cardiology', date: 'Apr 3', time: '10:30 AM', location: 'Heart & Vascular Center', notes: 'Bring BP log, ask about dosage adjustment', forPerson: 'mom' },
  { id: 2, title: 'Lab Work — A1C Panel', date: 'Apr 7', time: '7:00 AM', location: 'Quest Diagnostics on 5th', notes: 'Fasting required — no food after midnight', forPerson: 'mom' },
  { id: 3, title: 'Dr. Reyes — Primary Care', date: 'Apr 14', time: '2:00 PM', location: 'Family Medicine Associates', notes: 'Annual wellness visit, medication review', forPerson: 'mom' },
  { id: 4, title: 'Physical Therapy', date: 'Apr 16', time: '11:00 AM', location: 'MoveBetter PT Clinic', notes: 'Knee strengthening — bring exercise band', forPerson: 'mom' },
]

export const DEFAULT_TASKS = [
  { id: 1, text: 'Refill Amlodipine (6 pills left)', assignee: 'you', priority: 'high', done: false, due: 'Apr 2' },
  { id: 2, text: 'Print BP log for cardiology visit', assignee: 'you', priority: 'medium', done: false, due: 'Apr 3' },
  { id: 3, text: 'Call insurance about PT pre-auth', assignee: 'sister', priority: 'high', done: false, due: 'Apr 4' },
  { id: 4, text: 'Pick up grocery order (low-sodium list)', assignee: 'brother', priority: 'low', done: true, due: 'Apr 1' },
  { id: 5, text: 'Update siblings after cardiology appt', assignee: 'you', priority: 'medium', done: false, due: 'Apr 3' },
  { id: 6, text: 'Schedule eye exam', assignee: 'sister', priority: 'low', done: false, due: 'Apr 10' },
]

export const DOCUMENTS = [
  { id: 1, name: 'Insurance Card — Blue Cross', type: 'Insurance', date: 'Current', icon: '🏥' },
  { id: 2, name: 'Medicare Part D Summary', type: 'Insurance', date: '2026', icon: '📋' },
  { id: 3, name: 'Power of Attorney', type: 'Legal', date: 'Jan 2024', icon: '⚖️' },
  { id: 4, name: 'Advance Directive', type: 'Legal', date: 'Jan 2024', icon: '📜' },
  { id: 5, name: 'Cardiology Visit Notes — Mar 14', type: 'Medical', date: 'Mar 2026', icon: '❤️' },
  { id: 6, name: 'Lab Results — CBC Panel', type: 'Medical', date: 'Mar 2026', icon: '🔬' },
  { id: 7, name: 'Medication List (Master)', type: 'Medical', date: 'Updated Apr 1', icon: '💊' },
  { id: 8, name: 'Home Care Assessment', type: 'Care Plan', date: 'Feb 2026', icon: '🏠' },
]

export const EMERGENCY_CONTACTS = [
  { name: 'Dorothy (Mom)', relation: 'Patient', phone: '(405) 555-0142', medical: 'Type 2 Diabetes, Hypertension, Mild OA' },
  { name: 'Dr. Patel', relation: 'Cardiologist', phone: '(405) 555-0199' },
  { name: 'Dr. Reyes', relation: 'Primary Care', phone: '(405) 555-0177' },
  { name: 'Pharmacy — CVS on Main', relation: 'Pharmacy', phone: '(405) 555-0133' },
]

export const AI_SUGGESTIONS = [
  { icon: '💊', text: 'Amlodipine refill needed in 6 days — want me to call CVS?', action: 'Refill Rx' },
  { icon: '📋', text: 'Cardiology in 2 days — I\'ve drafted a BP summary from this month\'s readings.', action: 'View Summary' },
  { icon: '👨‍👩‍👦', text: 'Sarah and James haven\'t been updated since Mar 28. Send a family update?', action: 'Draft Update' },
  { icon: '📅', text: 'Mom\'s eye exam is overdue by 3 months. Want me to find available slots?', action: 'Find Appt' },
]

export const FEED_ITEMS = [
  { who: 'Sarah', action: 'completed', what: 'Called insurance about PT pre-auth — approved for 12 sessions', time: '2h ago', avatar: 'S', color: '#81B29A' },
  { who: 'AI Assistant', action: 'detected', what: 'BP readings trending slightly higher this week. Flagged for Dr. Patel.', time: '4h ago', avatar: '🤖', color: '#6C63FF' },
  { who: 'Matt', action: 'logged', what: 'Mom took morning meds (Lisinopril ✓, Vitamin D ✓, Metformin — skipped)', time: '8h ago', avatar: 'M', color: '#3D405B' },
  { who: 'James', action: 'completed', what: 'Dropped off groceries — low-sodium meals prepped for the week', time: '1d ago', avatar: 'J', color: '#F2CC8F' },
]

export const AI_RESPONSES = {
  'summarize last visit': `Here's a summary of Mom's March 14 cardiology visit with Dr. Patel:

• BP was 142/88 — slightly elevated
• A1C improved to 7.1 (down from 7.4)
• Dr. Patel wants to consider adjusting Amlodipine dosage at next visit
• Recommended daily BP logging
• Follow-up scheduled for April 3

Want me to share this with Sarah and James?`,

  'draft family update': `Here's a draft update for your siblings:

"Hey fam — quick update on Mom. Her cardiology follow-up is Thursday 4/3 at 10:30 AM. BP has been trending a bit high this week so Dr. Patel may adjust her meds. Sarah, the PT pre-auth came through (thank you!) — first session is 4/16. James, thanks for the grocery run. Let me know if you can take the lab run on 4/7 (early morning, fasting). — Matt"

Want me to send this, or edit first?`,

  "what's coming up": `This week for Mom:

📅 Thu Apr 3 — Dr. Patel, Cardiology (10:30 AM)
  → Bring BP log, ask about Amlodipine adjustment

📅 Mon Apr 7 — Lab Work, A1C Panel (7:00 AM)
  → Fasting required, someone needs to drive

💊 Amlodipine refill needed by Apr 10 (6 pills left)

📋 3 open tasks assigned across the family

Anything you want me to help prep?`,

  'default': `I can help with that. Here are some things I can do right now:

• Summarize visit notes and share with family
• Draft a sibling update message
• Check this week's schedule and tasks
• Prep for an upcoming appointment
• Look up medication interactions

Just let me know what you need!`,
}
