import test from "node:test";
import assert from "node:assert/strict";
import { FetchStub, makeReq, readJson } from "./harness.mts";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sb.test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
process.env.RESEND_API_KEY = "resend-key";

const { GET, POST } = await import("../src/app/api/circle/route.ts");

const stub = new FetchStub();
stub.install();

test("SECURITY: GET lists a patient's circle (PII) with NO authentication", async () => {
  stub.reset();
  stub.on("/rest/v1/care_circle?patient_id", () => ({
    json: [
      { id: "m1", member_email: "alice@x.com", member_name: "Alice", member_phone: "+15551230000", relationship: "Daughter", alert_level: "critical" },
      { id: "m2", member_email: "bob@x.com", member_name: "Bob", member_phone: null, relationship: "Son", alert_level: "informational" },
    ],
  }));
  // No Authorization header — anyone with a patient UUID can read this.
  const res = await GET(makeReq("https://care/api/circle?patient_id=any-uuid"));
  const { status, body } = await readJson(res);
  assert.equal(status, 200);
  assert.equal(body.members.length, 2);
  assert.equal(body.members[0].member_email, "alice@x.com"); // emails + phones exposed
  assert.equal(body.members[0].member_phone, "+15551230000");
});

test("SECURITY: POST adds an arbitrary member & sends email with NO authentication", async () => {
  stub.reset();
  stub
    .on("/rest/v1/care_circle", (c) => {
      if (c.method === "POST") return { json: [{ id: "new", ...JSON.parse(c.body || "[]")[0] }] };
      return undefined;
    })
    .on("api.resend.com", () => ({ json: { id: "email_x" } }));
  const res = await POST(
    makeReq("https://care/api/circle", {
      method: "POST",
      body: JSON.stringify({
        patient_id: "victim-uuid",
        member_email: "attacker@evil.com",
        member_name: "Mallory",
        relationship: "Friend",
        alert_level: "critical",
      }),
    }),
  );
  const { status, body } = await readJson(res);
  assert.equal(status, 200);
  assert.equal(body.member.member_email, "attacker@evil.com");
  const emailed = stub.calls.some((c) => c.url.includes("api.resend.com"));
  assert.equal(emailed, true, "unauthenticated attacker triggered an invite email");
});

test("POST validates email format", async () => {
  stub.reset();
  const res = await POST(
    makeReq("https://care/api/circle", {
      method: "POST",
      body: JSON.stringify({ patient_id: "p", member_email: "not-an-email", member_name: "X", relationship: "Son", alert_level: "critical" }),
    }),
  );
  const { status, body } = await readJson(res);
  assert.equal(status, 400);
  assert.match(body.error, /valid member_email/);
});

test("POST validates alert_level enum", async () => {
  stub.reset();
  const res = await POST(
    makeReq("https://care/api/circle", {
      method: "POST",
      body: JSON.stringify({ patient_id: "p", member_email: "a@x.com", member_name: "X", relationship: "Son", alert_level: "urgent" }),
    }),
  );
  const { status, body } = await readJson(res);
  assert.equal(status, 400);
  assert.match(body.error, /alert_level/);
});

test("GET without patient_id returns 400", async () => {
  stub.reset();
  const res = await GET(makeReq("https://care/api/circle"));
  const { status } = await readJson(res);
  assert.equal(status, 400);
});

test("duplicate member insert surfaces a 409", async () => {
  stub.reset();
  stub.on("/rest/v1/care_circle", (c) =>
    c.method === "POST" ? { status: 409, text: "duplicate key value" } : undefined,
  );
  const res = await POST(
    makeReq("https://care/api/circle", {
      method: "POST",
      body: JSON.stringify({ patient_id: "p", member_email: "a@x.com", member_name: "X", relationship: "Son", alert_level: "critical" }),
    }),
  );
  const { status, body } = await readJson(res);
  assert.equal(status, 409);
  assert.match(body.error, /already in this Care Circle/);
});
