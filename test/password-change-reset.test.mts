import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { FetchStub, makeReq, readJson } from "./harness.mts";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sb.test";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
process.env.NEXT_PUBLIC_APP_URL = "https://app.test";
process.env.RESEND_API_KEY = "re_key";
process.env.VAULT_KEY_HEX = "a".repeat(64);

const change = await import("../src/app/api/auth/change-password/route.ts");
const requestReset = await import("../src/app/api/auth/request-reset/route.ts");
const reset = await import("../src/app/api/auth/reset/route.ts");
const { encryptGCM } = await import("../src/lib/vault-crypto.ts");
const { totp } = await import("../src/lib/totp.ts");

const stub = new FetchStub();
stub.install();
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// ---------------- change-password ----------------
function changeSetup(opts: { grantOk?: boolean; mfa?: { secret: string } | null } = {}) {
  const { grantOk = true, mfa = null } = opts;
  stub.reset();
  stub.on("/auth/v1/user", () => ({ json: { id: "u1", email: "fam@x.com", user_metadata: { full_name: "Fam Member" } } }));
  stub.on("/rest/v1/rpc/rate_limit_hit", () => ({ json: true }));
  stub.on("/auth/v1/token", () => (grantOk ? { json: { access_token: "x" } } : { status: 400, json: { error: "bad" } }));
  stub.on("/rest/v1/user_mfa", () => {
    if (!mfa) return { json: [] };
    const enc = encryptGCM(Buffer.from(mfa.secret, "utf8"));
    return { json: [{ secret_cipher: enc.ciphertext.toString("base64"), secret_iv: enc.ivBase64, enabled: true, backup_codes: [] }] };
  });
  stub.on("/auth/v1/admin/users/", (c) => (c.method === "PUT" ? { json: {} } : undefined));
}

function changeReq(body: unknown) {
  return makeReq("https://care/api/auth/change-password", {
    method: "POST",
    headers: { authorization: "Bearer good", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

test("change-password: wrong current password is rejected 401", async () => {
  changeSetup({ grantOk: false });
  const res = await change.POST(changeReq({ current_password: "wrong", new_password: "Str0ng-New-Pass!" }));
  const { status, body } = await readJson(res);
  assert.equal(status, 401);
  assert.match(body.error, /current password/);
});

test("change-password: weak new password is rejected 400 (policy)", async () => {
  changeSetup();
  const res = await change.POST(changeReq({ current_password: "old", new_password: "short" }));
  assert.equal((await readJson(res)).status, 400);
});

test("change-password: new equal to current is rejected 400", async () => {
  changeSetup();
  const res = await change.POST(changeReq({ current_password: "Str0ng-Same-Pass!", new_password: "Str0ng-Same-Pass!" }));
  const { status, body } = await readJson(res);
  assert.equal(status, 400);
  assert.match(body.error, /differ/);
});

test("change-password: success updates via admin API", async () => {
  changeSetup();
  const res = await change.POST(changeReq({ current_password: "old-pass", new_password: "Str0ng-New-Pass!" }));
  const { status, body } = await readJson(res);
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  const put = stub.calls.find((c) => c.method === "PUT" && c.url.includes("/auth/v1/admin/users/u1"));
  assert.ok(put, "password must be updated through the admin API");
});

test("change-password: with MFA on, missing/invalid code is rejected 401", async () => {
  const secret = "JBSWY3DPEHPK3PXP";
  changeSetup({ mfa: { secret } });
  const res = await change.POST(changeReq({ current_password: "old", new_password: "Str0ng-New-Pass!", code: "000000" }));
  const { status, body } = await readJson(res);
  assert.equal(status, 401);
  assert.match(body.error, /two-factor/);
});

test("change-password: with MFA on, a valid code succeeds", async () => {
  const secret = "JBSWY3DPEHPK3PXP";
  changeSetup({ mfa: { secret } });
  const res = await change.POST(changeReq({ current_password: "old", new_password: "Str0ng-New-Pass!", code: totp(secret, Date.now()) }));
  assert.equal((await readJson(res)).status, 200);
});

// ---------------- request-reset (Supabase Auth recovery) ----------------
function reqResetSetup(opts: { emailLimit?: boolean; recoverStatus?: number } = {}) {
  stub.reset();
  stub.on("/rest/v1/rpc/rate_limit_hit", (c) => {
    const key = JSON.parse(c.body || "{}").p_key as string;
    if (opts.emailLimit === false && key.startsWith("reset-req-email:")) return { json: false };
    return { json: true };
  });
  stub.on("/auth/v1/recover", () => ({ status: opts.recoverStatus ?? 200, json: {} }));
}

function reqResetReq(email = "fam@x.com") {
  return makeReq("https://care/api/auth/request-reset", {
    method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "1.1.1.1" },
    body: JSON.stringify({ email }),
  });
}

test("request-reset: calls Supabase recover by auth email with a /reset redirect, no care_circle lookup", async () => {
  reqResetSetup();
  const res = await requestReset.POST(reqResetReq("Fam@X.com"));
  const { status, body } = await readJson(res);
  assert.equal(status, 200);
  assert.match(body.message, /If an account exists/i);
  const rec = stub.calls.find((c) => c.url.includes("/auth/v1/recover"));
  assert.ok(rec, "recover must be called");
  assert.equal(JSON.parse(rec!.body || "{}").email, "fam@x.com");
  assert.ok(rec!.url.includes(encodeURIComponent("https://app.test/reset")));
  assert.equal(stub.calls.some((c) => c.url.includes("care_circle")), false);
  assert.equal(stub.calls.some((c) => c.url.includes("password_reset_tokens")), false);
});

test("request-reset: mailer failure still returns the generic message and logs", async () => {
  reqResetSetup({ recoverStatus: 500 });
  const orig = console.error; const logs: string[] = [];
  console.error = (m: string) => { logs.push(String(m)); };
  try {
    const { status, body } = await readJson(await requestReset.POST(reqResetReq()));
    assert.equal(status, 200);
    assert.match(body.message, /If an account exists/i);
  } finally { console.error = orig; }
  assert.ok(logs.some((l) => /recover failed/.test(l) && !l.includes("fam@x.com")));
});

test("request-reset: over the per-email limit returns generic and does not call recover", async () => {
  reqResetSetup({ emailLimit: false });
  const { status, body } = await readJson(await requestReset.POST(reqResetReq()));
  assert.equal(status, 200);
  assert.match(body.message, /If an account exists/i);
  assert.equal(stub.calls.some((c) => c.url.includes("/auth/v1/recover")), false);
});

test("app-url: falls back to carecircleos.vercel.app", async () => {
  const { appUrl } = await import("../src/lib/app-url.ts");
  const prev = process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.NEXT_PUBLIC_APP_URL;
  assert.equal(appUrl(), "https://carecircleos.vercel.app");
  process.env.NEXT_PUBLIC_APP_URL = "https://x.test/";
  assert.equal(appUrl(), "https://x.test");
  process.env.NEXT_PUBLIC_APP_URL = prev;
});

// ---------------- reset (recovery session) ----------------
function resetSetup(validToken: string) {
  const state = { updated: false, loggedOut: false };
  stub.reset();
  stub.on("/rest/v1/rpc/rate_limit_hit", () => ({ json: true }));
  stub.on("/auth/v1/logout", () => { state.loggedOut = true; return { status: 204, text: "" }; });
  stub.on("/auth/v1/user", (c) => {
    if (c.headers.Authorization !== `Bearer ${validToken}`) return { status: 401, json: { msg: "bad jwt" } };
    if (c.method === "PUT") { state.updated = true; return { json: { id: "u1" } }; }
    return { json: { id: "u1", email: "fam@x.com" } };
  });
  return state;
}

function resetReq(token: string, pw: string) {
  return makeReq("https://care/api/auth/reset", {
    method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "2.2.2.2" },
    body: JSON.stringify({ access_token: token, new_password: pw }),
  });
}

test("reset: an invalid recovery token is rejected 400", async () => {
  resetSetup("realtoken");
  const { status, body } = await readJson(await reset.POST(resetReq("wrongtoken", "Str0ng-New-Pass!")));
  assert.equal(status, 400);
  assert.match(body.error, /invalid or expired/);
});

test("reset: a weak password is rejected 400 and nothing is updated", async () => {
  const state = resetSetup("tok-abc");
  assert.equal((await readJson(await reset.POST(resetReq("tok-abc", "weak")))).status, 400);
  assert.equal(state.updated, false);
});

test("reset: success updates the password with the recovery session then revokes it", async () => {
  const state = resetSetup("tok-xyz");
  assert.equal((await readJson(await reset.POST(resetReq("tok-xyz", "Str0ng-New-Pass!")))).status, 200);
  assert.equal(state.updated, true);
  assert.equal(state.loggedOut, true);
  assert.equal(stub.calls.some((c) => c.url.includes("/auth/v1/admin/")), false);
});
