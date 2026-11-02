import { NextRequest, NextResponse } from 'next/server';
import { bearerToken, getUserId } from '@/lib/api-auth';
import { logPhiAccess, requestContext } from '@/lib/audit';
import { checkRateLimit, tooManyRequests } from '@/lib/rate-limit';
import { chatComplete, llmConfigError, type LlmMessage } from '@/lib/providers/llm';
import {
  BLOCKED_MESSAGE,
  MODEL_UNAVAILABLE_MESSAGE,
  knownNamesFromCircle,
  redactMessages,
  type CircleNameRow,
  type KnownNames,
} from '@/lib/pii-redact';

export const runtime = 'edge';

const RATE_LIMIT = { name: 'shield', max: 30, windowSeconds: 60 };

// Bound the work per request. The scan is unauthenticated-abuse-proofed by
// the auth gate below, but we still cap input so a single authenticated
// caller cannot pin a CPU with a pathologically large body.
const MAX_MESSAGES = 40;
const MAX_CONTENT_CHARS = 8000;

const SYSTEM = `You are CareCircle AI, a family care coordination assistant from Sovereign Shield Technologies LLC. You help families manage medications, coordinate care tasks, understand updates they choose to share from CareIQ, and prepare questions for their care team. You do not diagnose, and you do not invent measurements. Common identifiers are replaced with placeholders before a message reaches you: known patient and circle names, title-style names, street addresses, rural route and post office box addresses, ZIP codes, phone numbers, email addresses, Social Security numbers, dates of birth, medical record numbers, tribal enrollment numbers, and dates. This is not full de-identification. Other names and clinical details may remain, so treat everything you receive as sensitive. Be concise and practical.`;

const EMPTY_NAMES: KnownNames = { patient: [], members: [] };

async function loadCircleNames(patientId: string | null, userId: string): Promise<KnownNames> {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!base || !key) return EMPTY_NAMES;
  const filter = patientId
    ? `patient_id=eq.${encodeURIComponent(patientId)}`
    : `member_user_id=eq.${encodeURIComponent(userId)}`;
  try {
    const r = await fetch(
      `${base}/rest/v1/care_circle?${filter}&select=patient_name,member_name,patient_nickname`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: 'no-store',
      },
    );
    if (!r.ok) return EMPTY_NAMES;
    const rows = (await r.json()) as unknown;
    if (!Array.isArray(rows)) return EMPTY_NAMES;
    return knownNamesFromCircle(rows as CircleNameRow[]);
  } catch {
    return EMPTY_NAMES;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Require a valid Supabase session. Without this the endpoint is an open,
    // billable proxy to the model provider for any anonymous caller.
    const userId = await getUserId(bearerToken(req));
    if (!userId) {
      return NextResponse.json({ error: 'authentication required' }, { status: 401 });
    }

    // Throttle per user to bound AI cost/abuse from a compromised session.
    if (!(await checkRateLimit(RATE_LIMIT, userId))) {
      return tooManyRequests(RATE_LIMIT);
    }

    const body = await req.json();
    const { messages, patientId } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 });
    }

    // Bound the work: keep only the most recent turns and truncate each to a
    // fixed length before scanning.
    const bounded = messages
      .slice(-MAX_MESSAGES)
      .map((m: { role: string; content: unknown }) => ({
        role: m?.role,
        content: String(m?.content ?? '').slice(0, MAX_CONTENT_CHARS),
      }));

    const scopedPatientId = typeof patientId === 'string' && patientId ? patientId : null;
    const known = await loadCircleNames(scopedPatientId, userId);

    // Sanitize every turn, not just the last, so identifiers in earlier
    // messages are never forwarded. Known names from care_circle are
    // replaced first, then the deterministic patterns.
    const redacted = redactMessages(bounded, known);
    const timestamp = new Date().toISOString();

    const writeAudit = async (action: string, riskLevel: string) => {
      if (!scopedPatientId) return;
      const ctx = requestContext(req.headers);
      await logPhiAccess({
        patientId: scopedPatientId,
        actorUserId: userId,
        action: 'ai_query',
        resourceType: 'ai_chat',
        detail: {
          flags: redacted.flags,
          riskScore: redacted.riskScore,
          riskLevel,
          action,
        },
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
    };

    const shieldFor = (action: string, riskLevel: string) => ({
      timestamp,
      patientId: scopedPatientId || 'UNKNOWN',
      flags: redacted.flags,
      riskScore: redacted.riskScore,
      riskLevel,
      action,
      shieldVersion: '2.2.0',
    });

    // Block on CRITICAL types (SSN, date of birth, tribal ID), matching
    // CareIQ. Do not block on a summed score: a phone number plus a date
    // must still be redacted and sent.
    if (redacted.critical) {
      const shield = shieldFor('BLOCKED', 'CRITICAL');
      await writeAudit(shield.action, shield.riskLevel);
      return NextResponse.json({ content: BLOCKED_MESSAGE, shield });
    }

    const riskLevel = redacted.highest;
    const action = redacted.flags.length > 0 ? 'PII_REDACTED' : 'CLEAN_PASS';

    // No provider key: tell the user plainly and do not call a model.
    // The technical env name stays server-side in llmConfigError().
    const cfgErr = llmConfigError();
    if (cfgErr) {
      const shield = shieldFor('NOT_CONFIGURED', riskLevel);
      await writeAudit(shield.action, shield.riskLevel);
      return NextResponse.json(
        { error: MODEL_UNAVAILABLE_MESSAGE, content: MODEL_UNAVAILABLE_MESSAGE, shield },
        { status: 503 },
      );
    }

    const shield = shieldFor(action, riskLevel);
    await writeAudit(shield.action, shield.riskLevel);

    let content = '';
    try {
      const out = await chatComplete({
        system: SYSTEM,
        messages: redacted.messages as LlmMessage[],
        maxTokens: 600,
      });
      content = out.text;
    } catch {
      // Provider or network failure. The audit row is already written.
      content = '';
    }
    return NextResponse.json({
      content: content || 'Unable to connect.',
      shield,
    });
  } catch {
    return NextResponse.json({ error: 'Shield error' }, { status: 500 });
  }
}
