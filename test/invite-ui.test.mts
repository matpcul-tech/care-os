import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const login = readFileSync(new URL("../src/app/login/page.tsx", import.meta.url), "utf8");
const signup = readFileSync(new URL("../src/app/signup/page.tsx", import.meta.url), "utf8");

test("login offers an invite code field when signed in with no circle", () => {
  assert.match(login, /Have an invite code\? Enter it here/);
  assert.match(login, /setPendingSession\(s\)/);
  assert.match(login, /Authorization: `Bearer \$\{pendingSession\.access_token\}`/);
});

test("login reads ?code and carries it to /signup", () => {
  assert.match(login, /URLSearchParams\(window\.location\.search\)\.get\('code'\)/);
  assert.match(login, /\/signup\?code=\$\{encodeURIComponent\(inviteCode\)\}/);
});

test("signup keeps the code on the Log in link and shows the existing-password path", () => {
  assert.match(signup, /\/login\?code=\$\{encodeURIComponent/);
  assert.match(signup, /Join with your existing password/);
});

test("new user-facing copy has no em or en dashes", () => {
  for (const src of [login, signup]) {
    for (const line of src.split("\n")) {
      if (/Invite code|invite code|existing password|Care Circle/.test(line)) {
        assert.doesNotMatch(line, /[\u2013\u2014]/, line);
      }
    }
  }
});
