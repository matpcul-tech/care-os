/**
 * Deterministic identifier redaction for text that may be sent to a model.
 *
 * Regex and exact string replacement only. No ML model. This reduces
 * identifiers. It is not full de-identification: bare names the server
 * does not already know, including untitled names outside the care
 * circle, city names, and clinical details can remain.
 */

export type PiiSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export interface KnownNames {
  patient: string[];
  members: string[];
}

export interface CircleNameRow {
  patient_name?: string | null;
  member_name?: string | null;
  patient_nickname?: string | null;
}

export interface RedactResult {
  sanitized: string;
  flags: string[];
  riskScore: number;
  /** True when a CRITICAL type is present (SSN, DOB, or tribal ID). */
  critical: boolean;
  highest: PiiSeverity | 'LOW';
}

interface Rule {
  source: string;
  flags: string;
  type: string;
  severity: PiiSeverity;
  token: string;
}

// Order matters. More specific identifiers run before broader ones so a
// tribal ID is not swallowed by the MRN rule, and a street address is
// replaced before a 5-digit ZIP inside it could be split off.
// Phone runs first. It already matches 10-digit numbers and 3-3-4 groups,
// including numbers with spaces. Grouped SSNs are the 3-2-4 shape (dashes,
// spaces, or dots), so they are not phone numbers. A bare 9-digit SSN runs
// only after phone, email, tribal ID, and MRN, so those are not relabeled.
// A label glued to nine digits (SSN123456789) is included there. Nine bare
// digits must sit on a word boundary, so a longer run of digits is not cut.
// TRIBAL_ID mirrors carecircle-sovereign, plus an optional leading
// CDIB or CHK label so "CDIB CN-123-45678" does not leave the label behind.
const RULES: Rule[] = [
  { source: String.raw`\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b`, flags: 'g', type: 'PHONE', severity: 'HIGH', token: '[PHONE_PROTECTED]' },
  { source: String.raw`\b\d{3}(?:-|\s+|\.)\d{2}(?:-|\s+|\.)\d{4}\b`, flags: 'g', type: 'SSN', severity: 'CRITICAL', token: '[SSN_PROTECTED]' },
  { source: String.raw`\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b`, flags: 'gi', type: 'EMAIL', severity: 'HIGH', token: '[EMAIL_PROTECTED]' },
  { source: String.raw`\b(dob|date of birth|born)[:\s]+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b`, flags: 'gi', type: 'DOB', severity: 'CRITICAL', token: '[DOB_PROTECTED]' },
  { source: String.raw`\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b`, flags: 'g', type: 'DATE', severity: 'MEDIUM', token: '[DATE_PROTECTED]' },
  { source: String.raw`\b(?:(?:CDIB|CHK)\s+)?(?:CHK|CDIB|CN)[-\s]?\d{2,4}[-\s]?\d{3,6}\b`, flags: 'gi', type: 'TRIBAL_ID', severity: 'CRITICAL', token: '[TRIBAL_ID_PROTECTED]' },
  { source: String.raw`\b[A-Z]{2}\d{6,10}\b`, flags: 'g', type: 'MRN', severity: 'HIGH', token: '[MRN_PROTECTED]' },
  { source: String.raw`\b(?:ssn|social security(?: number)?)[:\s#-]*\d{9}\b|\b\d{9}\b`, flags: 'gi', type: 'SSN', severity: 'CRITICAL', token: '[SSN_PROTECTED]' },
  {
    source: String.raw`\b\d{1,5}\s+[A-Z][A-Za-z]{1,30}(?:\s+[A-Z][A-Za-z]{1,30})?\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Ln|Lane|Dr|Drive|Way|Ct|Court|Pl|Place|Ter|Terrace|Hwy|Highway|Pkwy|Parkway)\.?`,
    flags: 'gi',
    type: 'ADDRESS',
    severity: 'HIGH',
    token: '[ADDRESS_PROTECTED]',
  },
  {
    source: String.raw`\b(?:rural\s+route|r\.?\s*r\.?|hc)\s+\d{1,6},?\s+box\s+\d{1,6}\b|\b(?:p\.?\s*o\.?\s+box|post\s+office\s+box)\s+\d{1,6}\b`,
    flags: 'gi',
    type: 'ADDRESS',
    severity: 'HIGH',
    token: '[ADDRESS_PROTECTED]',
  },
  { source: String.raw`\b\d{5}(?:-\d{4})?\b`, flags: 'g', type: 'ZIP', severity: 'MEDIUM', token: '[ZIP_PROTECTED]' },
  {
    source: String.raw`\b(?:Mr|Mrs|Ms|Miss|Dr|Prof|Rev|Patient)\.?\s+[A-Z][a-z]{1,30}(?:\s+[A-Z][a-z]{1,30})?\b`,
    flags: 'g',
    type: 'NAME',
    severity: 'HIGH',
    token: '[NAME_PROTECTED]',
  },
];

const CRITICAL_TYPES = new Set(['SSN', 'DOB', 'TRIBAL_ID']);

// Single tokens this short, or this common, are not replaced on their own.
// The full patient or member string is still replaced.
const PART_STOP = new Set([
  'and', 'the', 'for', 'with', 'from', 'that', 'this', 'have', 'has',
  'her', 'his', 'she', 'him', 'you', 'your', 'are', 'was', 'were',
  'not', 'but', 'can', 'all', 'any', 'our', 'who',
]);

const SCORE: Record<PiiSeverity, number> = { CRITICAL: 40, HIGH: 25, MEDIUM: 10 };

export const BLOCKED_MESSAGE =
  'We could not send this question because it looks like it includes a Social Security number, a date of birth, or a tribal ID. Please rephrase without those details. CareCircle already knows who this is about, so you do not need to type them.';

export const MODEL_UNAVAILABLE_MESSAGE =
  'CareCircle AI is not available because no language model is configured. Your message was not sent.';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function expandName(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const full = raw.trim().replace(/\s+/g, ' ');
  if (full.length < 2) return [];
  const out = [full];
  for (const part of full.split(' ')) {
    const letters = part.replace(/[^A-Za-z'-]/g, '');
    if (letters.length >= 3 && !PART_STOP.has(letters.toLowerCase())) out.push(letters);
  }
  return out;
}

function uniqueNames(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export function knownNamesFromCircle(rows: CircleNameRow[]): KnownNames {
  const patient: string[] = [];
  const members: string[] = [];
  for (const row of rows) {
    patient.push(...expandName(row.patient_name), ...expandName(row.patient_nickname));
    members.push(...expandName(row.member_name));
  }
  const patientNames = uniqueNames(patient);
  const patientKeys = new Set(patientNames.map((n) => n.toLowerCase()));
  const memberNames = uniqueNames(members).filter((n) => !patientKeys.has(n.toLowerCase()));
  return { patient: patientNames, members: memberNames };
}

function replaceNames(text: string, names: string[], token: string): { text: string; hit: boolean } {
  const ordered = [...names].sort((a, b) => b.length - a.length || a.localeCompare(b));
  let out = text;
  let hit = false;
  for (const name of ordered) {
    if (!name) continue;
    const re = new RegExp(`(?<![A-Za-z])${escapeRegExp(name)}(?![A-Za-z])`, 'gi');
    const next = out.replace(re, token);
    if (next !== out) hit = true;
    out = next;
  }
  return { text: out, hit };
}

export function redactText(text: string, known: KnownNames = { patient: [], members: [] }): RedactResult {
  const flags: string[] = [];
  let riskScore = 0;
  let highest: RedactResult['highest'] = 'LOW';

  const rank: Record<RedactResult['highest'], number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
  const bump = (type: string, severity: PiiSeverity) => {
    if (!flags.includes(type)) flags.push(type);
    riskScore += SCORE[severity];
    if (rank[severity] > rank[highest]) highest = severity;
  };

  let sanitized = text;
  const patientHit = replaceNames(sanitized, known.patient, '[PATIENT_NAME]');
  sanitized = patientHit.text;
  if (patientHit.hit) bump('KNOWN_NAME', 'HIGH');

  const memberHit = replaceNames(sanitized, known.members, '[MEMBER_NAME]');
  sanitized = memberHit.text;
  if (memberHit.hit) bump('MEMBER_NAME', 'HIGH');

  for (const rule of RULES) {
    const re = new RegExp(rule.source, rule.flags);
    const next = sanitized.replace(re, rule.token);
    if (next !== sanitized) {
      sanitized = next;
      bump(rule.type, rule.severity);
    }
  }

  const critical = flags.some((f) => CRITICAL_TYPES.has(f));
  if (critical) highest = 'CRITICAL';

  return {
    sanitized,
    flags,
    riskScore: Math.min(riskScore, 100),
    critical,
    highest,
  };
}

export function redactMessages<T extends { role?: string; content: string }>(
  messages: T[],
  known: KnownNames = { patient: [], members: [] },
): { messages: T[]; flags: string[]; riskScore: number; critical: boolean; highest: RedactResult['highest'] } {
  const flags = new Set<string>();
  let riskScore = 0;
  let critical = false;
  let highest: RedactResult['highest'] = 'LOW';
  const rank: Record<RedactResult['highest'], number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

  const out = messages.map((m) => {
    const scan = redactText(m.content, known);
    for (const f of scan.flags) flags.add(f);
    riskScore = Math.min(riskScore + scan.riskScore, 100);
    if (scan.critical) critical = true;
    if (rank[scan.highest] > rank[highest]) highest = scan.highest;
    return { ...m, content: scan.sanitized };
  });

  return { messages: out, flags: Array.from(flags), riskScore, critical, highest };
}
