import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const PII_PATTERNS = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, type: 'SSN', severity: 'CRITICAL', token: '[SSN_PROTECTED]' },
  { pattern: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, type: 'PHONE', severity: 'HIGH', token: '[PHONE_PROTECTED]' },
  { pattern: /\b(dob|date of birth|born)[:\s]+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi, type: 'DOB', severity: 'CRITICAL', token: '[DOB_PROTECTED]' },
  { pattern: /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, type: 'DATE', severity: 'MEDIUM', token: '[DATE_PROTECTED]' },
  { pattern: /\b[A-Z]{2}\d{6,10}\b/g, type: 'MRN', severity: 'HIGH', token: '[MRN_PROTECTED]' },
];

function serverScan(text: string) {
  let sanitized = text;
  const flags: string[] = [];
  let riskScore = 0;
  for (const p of PII_PATTERNS) {
    const matches = text.match(p.pattern);
    if (matches) {
      matches.forEach(m => { sanitized = sanitized.replace(m, p.token); flags.push(p.type); });
      riskScore += p.severity === 'CRITICAL' ? 40 : p.severity === 'HIGH' ? 25 : 10;
    }
  }
  return { flags, sanitized, riskScore: Math.min(riskScore, 100) };
}

const SYSTEM = `You are CareCircle AI, a compassionate family care coordination assistant built by Sovereign Shield Technologies LLC for families caring for elder loved ones through Federally Qualified Health Centers. You help families manage medications, coordinate care tasks, understand clinical updates from CareIQ, and navigate elder care challenges. You speak with warmth, clarity, and respect for both the patient and their family caregivers. All patient data you receive has been processed by the Sovereign Prompt Shield — PHI has been replaced with protected tokens. Be concise, supportive, and actionable.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, patientId } = body;
    const lastMessage = messages[messages.length - 1]?.content || '';
    const scan = serverScan(lastMessage);
    const timestamp = new Date().toISOString();

    const auditEntry = {
      timestamp,
      patientId: patientId || 'UNKNOWN',
      flags: scan.flags,
      riskScore: scan.riskScore,
      riskLevel: scan.riskScore >= 60 ? 'CRITICAL' : scan.riskScore >= 30 ? 'HIGH' : scan.riskScore >= 10 ? 'MEDIUM' : 'LOW',
      action: scan.flags.length > 0 ? 'PII_BLOCKED' : 'CLEAN_PASS',
      shieldVersion: '2.0.0-ZK',
    };

    const finalMessages = messages.map((m: {role:string;content:string}, i: number) =>
      i === messages.length - 1 ? { ...m, content: scan.sanitized } : m
    );

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 });

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 600, system: SYSTEM, messages: finalMessages }),
    });

    const aiData = await aiRes.json();
    return NextResponse.json({
      content: aiData.content?.[0]?.text || 'Unable to connect.',
      shield: auditEntry,
    });
  } catch {
    return NextResponse.json({ error: 'Shield error' }, { status: 500 });
  }
}
