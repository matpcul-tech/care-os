# CareCircle — Evaluation & Stress-Test Report

Real, executable evaluation of the care-os codebase. Every claim below is
backed by a test in this directory that runs against the **actual** module
or route handler (Supabase/Resend/Twilio/Anthropic calls are intercepted by
a recording `fetch` stub — no live services, no schema changes).

## How to run

```bash
npm run typecheck   # tsc --noEmit
npm run build       # next build
npm test            # 66 tests across crypto, all API routes, and stress/DoS
```

Tooling: Node 22's built-in test runner + type stripping. `test/register.mjs`
registers a resolve hook (`test/loader.mjs`) so the real handlers — which
import `next/server` and the `@/` alias — load unmodified.

## Baseline health

| Check | Result |
|-------|--------|
| `tsc --noEmit` (strict) | ✅ clean |
| `next build` (8 routes) | ✅ compiles, lints, generates |
| Test suite | ✅ 66/66 passing |

## What works well (verified)

- **Vault AES-256-GCM** (`vault-crypto.test.mts`, 14 tests): correct
  round-trips including empty and the 25 MB max upload; unique IV per call
  across 5,000 encryptions (no nonce reuse); tamper of ciphertext, tag, or
  IV is rejected; wrong-key and malformed-key rejected; 2,000 random-size
  fuzz round-trips with zero corruption.
- **Vault authorization** (`vault-auth.test.mts`): missing/invalid token →
  401, non-member → 403, and the cross-patient IDOR guard in
  `authVaultForFile` correctly blocks a file owned by another patient (403).
- **Alerts HMAC** (`alerts.test.mts`): the signed `panel_grade_change` path
  correctly accepts a valid signature and rejects missing, tampered, and
  stale (>300 s) signatures; threshold math is right at and just past every
  boundary; critical-only members are excluded from informational alerts.
- **Invite redemption** (`redeem.test.mts`): rejects short passwords/bad
  emails before creating anything; honors expired/used/revoked (410);
  **rolls back the orphaned auth user** when the circle insert fails;
  marks the invite used to block replay; maps duplicate email → 409.
- **update-nickname** (`update-nickname.test.mts`): requires a valid JWT,
  scopes the PATCH to the caller's own `member_user_id`, clamps to 60 chars.

## Findings (verified by test)

### F1 — CRITICAL: `/api/shield` quadratic-complexity DoS, unauthenticated
`serverScan()` sanitizes with `matches.forEach(m => sanitized =
sanitized.replace(m, token))` — O(matches × length). A body of repeated
`"12/34/"` yields ~n/6 DATE matches over a length-n string, so cost is
quadratic. The route has **no authentication and no input-size limit**.

Measured (`stress.test.mts` + micro-bench):

| Input | Size | Time |
|-------|------|------|
| `"12/34/"` × 20k | 120 KB | ~1.4 s |
| `"12/34/"` × 40k | 240 KB | ~5.3 s |
| `"12/34/"` × 80k | 480 KB | ~21 s |
| `"12/34/"` × 100k | 600 KB | ~33 s |

A same-length benign digit string scans in ~2 ms. One anonymous ~250 KB
request pins a serverless CPU for seconds; a handful exhausts capacity and
amplifies function cost. **Fix:** cap message length (e.g. 8–16 KB) before
scanning, and replace the per-match loop with a single
`String.replace(regex, token)` pass per pattern.

### F2 — HIGH: `/api/shield` has no authentication (LLM cost abuse + PHI)
The handler never checks `Authorization`; any anonymous caller reaches the
paid Anthropic API (`shield.test.mts` proves the outbound call). This is an
open, billable LLM proxy and the delivery vector for F1. **Fix:** require a
valid Supabase JWT (reuse `authVault`'s token check) and rate-limit.

### F3 — HIGH: `/api/circle` GET & POST have no authentication (PII / IDOR)
`GET ?patient_id=<uuid>` returns the full circle — member **names, emails,
and phone numbers** — with no auth. `POST` adds an arbitrary member to any
patient's circle and fires an invite email. Both use the service-role key,
so RLS is bypassed. Proven in `circle.test.mts`. **Fix:** authenticate the
caller and authorize via `is_patient_or_member(patient_id)` (patient owner
or existing member) instead of trusting the body/query `patient_id`.

### F4 — HIGH: `/api/alerts` vitals path has no authentication
The `panel_grade_change` path is HMAC-signed, but a body carrying only
`vitals` is processed with no signature or token. An anonymous caller who
guesses/enumerates a `patient_id` can trigger real alert **emails and SMS**
to that patient's whole circle (spam, cost, and membership confirmation).
Proven in `alerts.test.mts` (`SECURITY: unauthenticated vitals request…`).
**Fix:** require the same HMAC signature (or a JWT) on every path, not just
grade changes.

### F5 — MEDIUM: invite redemption is not atomic (single-use bypass / replay)
`redeem` checks `used_at` is null, then creates the account, then marks the
invite used — a TOCTOU window with no compare-and-set. Two concurrent
POSTs with the same code both pass the check and both succeed.
`stress.test.mts` (`TOCTOU`) drives two concurrent redemptions from one
invite and confirms **two accounts + two circle rows** are created. **Fix:**
make the "claim" atomic — e.g. `PATCH …?code=eq.X&used_at=is.null` with
`Prefer: return=representation` and treat an empty result as already-claimed
*before* creating the user, or add a DB uniqueness/guard on `used_by`.

### F6 — LOW: `/api/shield` only sanitizes the last message
`finalMessages` re-scans just `messages[len-1]`; PII in earlier turns is
forwarded to the model verbatim. `shield.test.mts` shows an SSN in a prior
turn reaching Anthropic unredacted — contradicting the "PHI replaced with
protected tokens" guarantee in the system prompt. **Fix:** scan every
user-role message, not only the final one.

## Notes / non-issues reviewed

- RLS on the data-screen tables (meds, appts, tasks, vault_files,
  family_messages) is sound: every policy funnels through
  `is_patient_or_member`, and `family_messages` INSERT correctly pins
  `sender_user_id = auth.uid()`.
- Dropping the `patient_id → auth.users` FKs (20260505000002) is
  intentional and RLS still gates access; acceptable.
- `ensureValidSession` is deliberately lenient (keeps the session on
  refresh failure); reasonable for a page-load gate since data calls still
  401. Not a finding.
