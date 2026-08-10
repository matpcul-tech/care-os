import test from "node:test";
import assert from "node:assert/strict";
import { FetchStub, makeReq, readJson } from "./harness.mts";

process.env.ANTHROPIC_API_KEY = "sk-test";

const { POST } = await import("../src/app/api/shield/route.ts");

const stub = new FetchStub();
stub.install();
function anthropicEcho() {
  stub.reset();
  stub.on("api.anthropic.com", (c) => {
    const sent = JSON.parse(c.body || "{}");
    // Echo the last message content so the test can inspect what reached the LLM.
    const last = sent.messages[sent.messages.length - 1]?.content ?? "";
    return { json: { content: [{ text: `ECHO:${last}` }] } };
  });
}

test("SSN is redacted before reaching the model", async () => {
  anthropicEcho();
  const res = await POST(
    makeReq("https://care/api/shield", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "My SSN is 123-45-6789" }], patientId: "p1" }),
    }),
  );
  const { body } = await readJson(res);
  assert.match(body.content, /\[SSN_PROTECTED\]/);
  assert.doesNotMatch(body.content, /123-45-6789/);
  assert.equal(body.shield.action, "PII_BLOCKED");
  assert.ok(body.shield.flags.includes("SSN"));
});

test("clean text passes through and is marked CLEAN_PASS", async () => {
  anthropicEcho();
  const res = await POST(
    makeReq("https://care/api/shield", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "How do I refill a prescription?" }] }),
    }),
  );
  const { body } = await readJson(res);
  assert.equal(body.shield.action, "CLEAN_PASS");
  assert.equal(body.shield.flags.length, 0);
});

test("SECURITY: endpoint requires no authentication (free LLM proxy / cost abuse)", async () => {
  anthropicEcho();
  // No Authorization header at all.
  const res = await POST(
    makeReq("https://care/api/shield", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "hello" }] }),
    }),
  );
  const { status } = await readJson(res);
  assert.equal(status, 200);
  const calledLLM = stub.calls.some((c) => c.url.includes("api.anthropic.com"));
  assert.equal(calledLLM, true, "anonymous request reached the paid Anthropic API");
});

test("BUG: PII in earlier (non-last) messages is NOT sanitized", async () => {
  anthropicEcho();
  const res = await POST(
    makeReq("https://care/api/shield", {
      method: "POST",
      body: JSON.stringify({
        messages: [
          { role: "user", content: "Her SSN is 987-65-4321" }, // earlier turn — leaks
          { role: "assistant", content: "Noted." },
          { role: "user", content: "Thanks" }, // only this last one is scanned
        ],
      }),
    }),
  );
  // Inspect what actually got POSTed to Anthropic.
  const llmCall = stub.calls.find((c) => c.url.includes("api.anthropic.com"))!;
  const sentMessages = JSON.parse(llmCall.body || "{}").messages;
  const firstContent = sentMessages[0].content;
  assert.match(firstContent, /987-65-4321/, "SSN in a prior turn leaked to the model unredacted");
});

test("missing messages array is handled without a crash (500 error json)", async () => {
  anthropicEcho();
  const res = await POST(
    makeReq("https://care/api/shield", { method: "POST", body: JSON.stringify({ patientId: "p1" }) }),
  );
  const { status, body } = await readJson(res);
  assert.equal(status, 500);
  assert.ok(body.error);
});

test("risk score is capped at 100", async () => {
  anthropicEcho();
  const flood = Array.from({ length: 20 }, (_, i) => `1${String(i).padStart(2, "0")}-45-6789`).join(" ");
  const res = await POST(
    makeReq("https://care/api/shield", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: flood }] }),
    }),
  );
  const { body } = await readJson(res);
  assert.ok(body.shield.riskScore <= 100);
});
