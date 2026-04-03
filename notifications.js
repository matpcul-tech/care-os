// ─── Persistent Storage Layer ───
// Uses localStorage with JSON serialization.
// All data keyed under 'carecircle:' namespace.

const PREFIX = 'carecircle:'

export function load(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (e) {
    console.warn('CareCircle storage write failed:', e)
  }
}

export function remove(key) {
  localStorage.removeItem(PREFIX + key)
}

export function clearAll() {
  Object.keys(localStorage)
    .filter(k => k.startsWith(PREFIX))
    .forEach(k => localStorage.removeItem(k))
}
