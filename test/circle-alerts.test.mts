// In-app CareIQ alerts in CareCircle: GET /api/circle/alerts.
// A fake database answers both the service-role membership check and the
// user-JWT alert read. The alert read emulates the cca_family_select RLS
// policy, so both layers are exercised.
import test from "node:test";
import assert from "node:assert/strict";
import { FetchStub, makeReq, readJson } from "./harness.mts";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sb.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

const { GET } = await import("../src/app/api/circle/alerts/route.ts");

const PATIENT = "11111111-2222-4333-8444-555555555555";
const OTHER_PATIENT = "99999999-2222-4333-8444-555555555555";

// token -> user id
const USERS: Record<string, string> = {
  "tok-admin": "u-admin",
  "tok-caregiver": "u-caregiver",
  "tok-viewer": "u-viewer",
  "tok-revoked": "u-revoked",
  "tok-stranger": "u-stranger",
  "tok-other": "u-other",
};

let staleGrantFor: string | null = null;
let circle: Array<{ patient_id: string; member_user_id: string; care_role: string; member_email: string; created_at: string }>;

// Rows as stored. Extra columns stand in for anything PostgREST might return.
const ALERTS = [
  {
    id: "a1", patient_id: PATIENT, metric: "Home reading out of range", severity: "critical",
    recommendation: "A home reading was outside the safe range. The care team has been alerted. Please check in with your loved one.",
    fired_at: "2026-11-02T09:00:00.000Z", delivery_count: 2,
    delivery_summary: { sent: [{ member_id: "m1", email: "admin@example.test" }], sms_sent: [{ member_id: "m1", phone: "+15555550111" }] },
  },
  {
    id: "a2", patient_id: PATIENT, metric: "Missed wellness check-in", severity: "critical",
    recommendation: "A daily wellness check-in was missed. Please check on your loved one.",
    fired_at: "2026-11-02T12:00:00.000Z", delivery_count: 0, delivery_summary: null,
  },
  {
    id: "b1", patient_id: OTHER_PATIENT, metric: "Clinic alert", severity: "informational",
    recommendation: "A home reading matched one of the clinic alert rules. The clinic care team will review it.",
    fired_at: "2026-11-02T10:00:00.000Z", delivery_count: 0, delivery_summary: null,
  },
];

function param(url: string, key: string): string | null {
  const m = new RegExp(`[?&]${key}=eq\\.([^&]+)`).exec(url);
  return m ? decodeURIComponent(m[1]) : null;
}

const stub = new FetchStub();
stub.install();

function db() {
  stub.reset();
  circle = [
    { patient_id: PATIENT, member_user_id: "u-admin", care_role: "admin", member_email: "admin@example.test", created_at: "2026-11-01" },
    { patient_id: PATIENT, member_user_id: "u-caregiver", care_role: "caregiver", member_email: "cg@example.test", created_at: "2026-11-01" },
    { patient_id: PATIENT, member_user_id: "u-viewer", care_role: "viewer", member_email: "v@example.test", created_at: "2026-11-01" },
    { patient_id: OTHER_PATIENT, member_user_id: "u-other", care_role: "admin", member_email: "o@example.test", created_at: "2026-11-01" },
  ];
  stub.on("/auth/v1/user", (c) => {
    const tok = (c.headers.Authorization || c.headers.authorization || "").replace(/^Bearer /, "");
    const id = USERS[tok];
    return id ? { json: { id } } : { status: 401, text: "bad token" };
  });
  stub.on("/rest/v1/care_circle?", (c) => {
    assert.equal(c.headers.Authorization, "Bearer service-role-key");
    const member = param(c.url, "member_user_id");
    const pid = param(c.url, "patient_id");
    if (member && member === staleGrantFor) return { json: [{ patient_id: PATIENT }] };
    return {
      json: circle
        .filter((r) => r.member_user_id === member && (!pid || r.patient_id === pid))
        .map((r) => ({ patient_id: r.patient_id })),
    };
  });
  stub.on("/rest/v1/care_circle_alerts", (c) => {
    // Must be the caller's JWT, never the service role.
    const tok = (c.headers.Authorization || "").replace(/^Bearer /, "");
    assert.notEqual(tok, "service-role-key");
    assert.equal(c.headers.apikey, "anon-key");
    const uid = USERS[tok];
    const pid = param(c.url, "patient_id");
    // cca_family_select: exists care_circle row for (patient_id, auth.uid()).
    const allowed = (patientId: string) => circle.some((r) => r.patient_id === patientId && r.member_user_id === uid);
    return { json: ALERTS.filter((a) => a.patient_id === pid && allowed(a.patient_id)) };
  });
}

async function get(token: string | null, patientId: string | null = PATIENT) {
  const url = `https://care/api/circle/alerts${patientId ? `?patient_id=${patientId}` : ""}`;
  return readJson(await GET(makeReq(url, { headers: token ? { authorization: `Bearer ${token}` } : {} })));
}

const SAFE_KEYS = ["fired_at", "id", "metric", "recommendation", "severity"];

for (const role of ["admin", "caregiver", "viewer"]) {
  test(`${role} member with an active grant sees the patient's alerts`, async () => {
    db();
    const { status, body } = await get(`tok-${role}`);
    assert.equal(status, 200);
    assert.equal(body.patient_id, PATIENT);
    assert.deepEqual(body.alerts.map((a: { id: string }) => a.id).sort(), ["a1", "a2"]);
    for (const a of body.alerts) assert.deepEqual(Object.keys(a).sort(), SAFE_KEYS);
  });
}

test("member without patient_id gets their own circle's alerts", async () => {
  db();
  const { status, body } = await get("tok-viewer", null);
  assert.equal(status, 200);
  assert.equal(body.patient_id, PATIENT);
  assert.equal(body.alerts.length, 2);
});

test("revoked member (care_circle row removed) sees nothing", async () => {
  db();
  circle.push({ patient_id: PATIENT, member_user_id: "u-revoked", care_role: "caregiver", member_email: "r@example.test", created_at: "2026-11-01" });
  assert.equal((await get("tok-revoked")).status, 200);
  circle = circle.filter((r) => r.member_user_id !== "u-revoked");
  stub.calls = [];
  const { status, body } = await get("tok-revoked");
  assert.equal(status, 403);
  assert.equal(body.alerts, undefined);
  assert.equal(stub.calls.some((c) => c.url.includes("care_circle_alerts")), false, "no alert read after revoke");
});

test("revoked between the access check and the read: RLS still returns nothing", async () => {
  db();
  staleGrantFor = "u-caregiver"; // the check sees an old row
  circle = circle.filter((r) => r.member_user_id !== "u-caregiver"); // the row is gone in the database
  const { status, body } = await get("tok-caregiver");
  staleGrantFor = null;
  assert.equal(status, 200);
  assert.deepEqual(body.alerts, []);
});

test("non-member sees nothing, with or without a patient_id", async () => {
  db();
  assert.equal((await get("tok-stranger")).status, 403);
  assert.equal((await get("tok-stranger", null)).status, 403);
  assert.equal(stub.calls.some((c) => c.url.includes("care_circle_alerts")), false);
});

test("a member of another patient cannot read this patient's alerts", async () => {
  db();
  const { status } = await get("tok-other", PATIENT);
  assert.equal(status, 403);
  const own = await get("tok-other", OTHER_PATIENT);
  assert.equal(own.status, 200);
  assert.deepEqual(own.body.alerts.map((a: { id: string }) => a.id), ["b1"]);
});

test("unauthenticated and bad token get 401; bad patient_id gets 400", async () => {
  db();
  assert.equal((await get(null)).status, 401);
  assert.equal((await get("tok-nope")).status, 401);
  assert.equal((await get("tok-admin", "not-a-uuid")).status, 400);
});

test("no lab or reading values, emails, phones, or delivery data leak", async () => {
  db();
  const { body } = await get("tok-viewer");
  const json = JSON.stringify(body);
  assert.doesNotMatch(json, /delivery|@example\.test|5555550|mmHg|mg\/dL|A1C|LDL|systolic|diastolic|glucose/i);
  for (const a of body.alerts) assert.doesNotMatch(a.metric + a.recommendation, /\d/);
  const read = stub.calls.find((c) => c.url.includes("care_circle_alerts"))!;
  assert.match(read.url, /select=id,metric,severity,recommendation,fired_at&/);
});

test("route sends no SMS or email", async () => {
  db();
  await get("tok-admin");
  assert.equal(stub.calls.some((c) => /twilio|resend/i.test(c.url)), false);
});
