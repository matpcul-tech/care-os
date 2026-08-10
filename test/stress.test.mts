import test from "node:test";
import assert from "node:assert/strict";
import { FetchStub, makeReq, readJson } from "./harness.mts";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sb.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
process.env.ANTHROPIC_API_KEY = "sk-test";

const shield = await import("../src/app/api/shield/route.ts");
const redeem = await import("../src/app/api/circle/redeem/route.ts");

const stub = new FetchStub();
stub.install();

// DoS: serverScan() sanitizes via `matches.forEach(m => sanitized =
// sanitized.replace(m, token))`, which is O(matches x length). A body of
// repeated dates ("12/34/") yields ~n/6 matches over a length-n string,
// so the cost grows quadratically. /api/shield has NO auth and NO input
// size cap, so a single ~250 KB anonymous request pins a CPU for seconds.
// This test documents the blowup deterministically: a date-dense payload
// costs dramatically more than a same-length benign payload, and doubling
// the date payload far more than doubles the time (super-linear).
test("STRESS/DoS: shield PII scan is quadratic on date-dense input (unauthenticated)", async () => {
  stub.reset();
  stub.on("api.anthropic.com", () => ({ json: { content: [{ text: "ok" }] } }));

  const time = async (content: string) => {
    const t = Date.now();
    const res = await shield.POST(
      makeReq("https://care/api/shield", { method: "POST", body: JSON.stringify({ messages: [{ role: "user", content }] }) }),
    );
    await readJson(res);
    return Date.now() - t;
  };

  const benign = await time("1".repeat(240_000)); // same length, ~no matches
  const dates40k = await time("12/34/".repeat(40_000)); // 240 KB, ~40k matches
  const dates20k = await time("12/34/".repeat(20_000)); // 120 KB, ~20k matches

  // Input-dependent blowup: identical length, wildly different cost.
  assert.ok(
    dates40k > benign * 20,
    `date-dense (${dates40k}ms) should dwarf same-length benign (${benign}ms) — confirms input-triggered DoS`,
  );
  // Super-linear: 2x the matches costs far more than 2x the time.
  assert.ok(
    dates40k > dates20k * 3,
    `doubling matches took ${dates20k}ms -> ${dates40k}ms (>3x) — confirms quadratic complexity`,
  );
});

test("STRESS: shield stays correct across 500 mixed-PII messages", async () => {
  stub.reset();
  stub.on("api.anthropic.com", () => ({ json: { content: [{ text: "ok" }] } }));
  for (let i = 0; i < 500; i++) {
    const res = await shield.POST(
      makeReq("https://care/api/shield", {
        method: "POST",
        body: JSON.stringify({ messages: [{ role: "user", content: `patient ${i} ssn 111-22-3333 dob: 01/02/1944` }] }),
      }),
    );
    const { body } = await readJson(res);
    assert.ok(body.shield.flags.includes("SSN"));
    assert.ok(body.shield.riskScore >= 40);
  }
});

test("SECURITY (TOCTOU): the same invite code can be redeemed twice under concurrency", async () => {
  stub.reset();
  const future = new Date(Date.now() + 86_400_000).toISOString();
  let usersCreated = 0;
  let circleRows = 0;
  // The invite lookup ALWAYS returns an unused invite — modeling two
  // requests that both read the row before either marks it used. There is
  // no atomic compare-and-set in the redeem route, so both proceed.
  stub
    .on("care_circle_invites?code", () => ({
      json: [
        {
          id: "inv1",
          code: "ABCDEFGH",
          patient_id: "patient-1",
          patient_name: "Mary",
          suggested_relationship: "Daughter",
          suggested_alert_level: "informational",
          expires_at: future,
          used_at: null,
          revoked_at: null,
        },
      ],
    }))
    .on("/auth/v1/admin/users", (c) => {
      if (c.method === "POST") {
        usersCreated++;
        return { json: { id: `user-${usersCreated}`, email: "f@x.com" } };
      }
      return undefined;
    })
    .on("/rest/v1/care_circle", (c) => {
      if (c.method === "POST") {
        circleRows++;
        return { json: [{ id: `cc-${circleRows}`, patient_id: "patient-1" }] };
      }
      return undefined;
    })
    .on("care_circle_invites?id", () => ({ json: {} }))
    .on("/auth/v1/token", () => ({ json: { access_token: "at", refresh_token: "rt", expires_at: 999 } }));

  const mk = (email: string) =>
    redeem.POST(
      makeReq("https://care/api/circle/redeem", {
        method: "POST",
        body: JSON.stringify({ code: "ABCDEFGH", email, password: "longenough", member_name: "Fam" }),
      }),
    );

  const [r1, r2] = await Promise.all([mk("a@x.com"), mk("b@x.com")]);
  const b1 = await readJson(r1);
  const b2 = await readJson(r2);

  assert.equal(b1.status, 200);
  assert.equal(b2.status, 200);
  // Both redemptions succeeded from a single invite → replay/over-redemption.
  assert.equal(usersCreated, 2, "single-use invite created two accounts");
  assert.equal(circleRows, 2, "single-use invite produced two circle memberships");
});
