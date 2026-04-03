// ─── Push Notification & Reminder System ───
// Uses browser Notification API + interval-based scheduling.
// In production, swap for service worker + push subscription.

let permissionGranted = false

export async function requestPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') {
    permissionGranted = true
    return true
  }
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  permissionGranted = result === 'granted'
  return permissionGranted
}

export function sendNotification(title, body, options = {}) {
  if (!permissionGranted && Notification.permission !== 'granted') return null
  try {
    const n = new Notification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: options.tag || 'carecircle',
      renotify: !!options.tag,
      ...options,
    })
    if (options.onClick) n.onclick = options.onClick
    return n
  } catch {
    return null
  }
}

// ─── Scheduled Reminders ───
// Stores reminders in memory and checks every 30 seconds.

const reminders = []
let intervalId = null

export function scheduleReminder({ id, time, title, body, tag }) {
  const existing = reminders.findIndex(r => r.id === id)
  const entry = { id, time: new Date(time).getTime(), title, body, tag, fired: false }
  if (existing >= 0) reminders[existing] = entry
  else reminders.push(entry)

  if (!intervalId) {
    intervalId = setInterval(checkReminders, 30000)
  }
}

export function cancelReminder(id) {
  const idx = reminders.findIndex(r => r.id === id)
  if (idx >= 0) reminders.splice(idx, 1)
}

function checkReminders() {
  const now = Date.now()
  reminders.forEach(r => {
    if (!r.fired && r.time <= now) {
      r.fired = true
      sendNotification(r.title, r.body, { tag: r.tag || r.id })
    }
  })
  // Clean up fired reminders older than 5 min
  for (let i = reminders.length - 1; i >= 0; i--) {
    if (reminders[i].fired && reminders[i].time < now - 300000) {
      reminders.splice(i, 1)
    }
  }
}

// ─── Medication Reminder Helpers ───

export function scheduleMedReminders(meds) {
  const today = new Date()
  meds.forEach(med => {
    if (med.taken) return
    // Parse first time from schedule
    const match = med.schedule.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (match) {
      let hours = parseInt(match[1])
      const mins = parseInt(match[2])
      const ampm = match[3].toUpperCase()
      if (ampm === 'PM' && hours < 12) hours += 12
      if (ampm === 'AM' && hours === 12) hours = 0

      const reminderTime = new Date(today)
      reminderTime.setHours(hours, mins, 0, 0)

      // If time already passed today, skip
      if (reminderTime.getTime() > Date.now()) {
        scheduleReminder({
          id: `med-${med.id}`,
          time: reminderTime,
          title: '💊 Medication Reminder',
          body: `Time to take ${med.name}`,
          tag: `med-${med.id}`,
        })
      }
    }

    // Refill warning — if pills <= 7, notify
    if (med.pillsLeft <= 7) {
      sendNotification(
        '⚠️ Refill Needed',
        `${med.name} has only ${med.pillsLeft} pills left. Refill by ${med.refillDate}.`,
        { tag: `refill-${med.id}` }
      )
    }
  })
}

export function scheduleAppointmentReminder(appt) {
  // Schedule a reminder 1 hour before (simulated)
  scheduleReminder({
    id: `appt-${appt.id}`,
    time: new Date(Date.now() + 3600000), // placeholder
    title: `📅 Upcoming: ${appt.title}`,
    body: `${appt.time} at ${appt.location}`,
    tag: `appt-${appt.id}`,
  })
}

// Auto-start checking if there are existing reminders
if (typeof window !== 'undefined') {
  requestPermission()
}
