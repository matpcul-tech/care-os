import test from "node:test";
import assert from "node:assert/strict";
import { FetchStub, makeReq, readJson } from "./harness.mts";

// This file is the only place that clears the provider key, so it does not
// race the other shield tests that expect a configured model.
delete process.env.ANTHROPIC_API_KEY;
delete process.env.LLM_API_KEY;
delete process.env.LLM_PROVIDER;
delete process.env.LLM_BASE_URL;
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sb.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";

const { POST } = await import("../src/app/api/shield/route.ts");

const stub = new FetchStub();
stub.install();
stub.on("/auth/v1/user", () => ({ json: { id: "member-1" } }));

test("missing provider key returns a clear message and does not call a model", async () => {
  const res = await POST(
    makeReq("https://care/api/shield", {
      method: "POST",
      headers: { authorization: "Bearer good" },
      body: JSON.stringify({
        messages: [{ role: "user", content: "How do I refill a prescription?" }],
        patientId: "p1",
      }),
    }),
  );
  const { status, body } = await readJson(res);
  assert.equal(status, 503);
  assert.equal(body.shield.action, "NOT_CONFIGURED");
  assert.match(body.content, /no language model is configured/);
  assert.match(body.content, /not sent/);
  assert.equal(body.error, body.content);
  assert.doesNotMatch(`${body.error}`, /ANTHROPIC_API_KEY/);
  assert.equal(stub.calls.some((c) => c.url.includes("api.anthropic.com")), false);
  assert.equal(stub.calls.some((c) => c.url.includes("/chat/completions")), false);
});
