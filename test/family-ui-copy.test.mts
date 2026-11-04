import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p: string) => readFileSync(new URL(`../src/${p}`, import.meta.url), "utf8");
const app = read("components/CareCircleApp.tsx");
const fam = read("components/dashboard/FamilyPage.tsx");
const appPage = read("app/app/page.tsx");
const url = read("lib/careiq-url.ts");

test("alerts tab shows No readings yet when CareIQ returned no data", () => {
  assert.match(app, /No readings yet/);
  assert.match(app, /!hasReadings\(shield\) && \(/);
  assert.match(app, /alerts\.length === 0 && hasReadings\(shield\) && \(/);
});

test("vitals call uses the canonical CareIQ host, not the redirecting one", () => {
  assert.match(url, /care-iq-sable\\\.vercel\\\.app/);
  assert.match(url, /'https:\/\/care-iq-os\.vercel\.app'/);
  for (const src of [app, fam]) {
    assert.doesNotMatch(src, /Vitals not available/);
    assert.match(src, /from '@\/lib\/careiq-url'/);
  }
});

test("family badges no longer promise live alerts", () => {
  assert.doesNotMatch(app, /'All alerts'/);
  assert.doesNotMatch(fam, /'All alerts'/);
  assert.match(app, /Can view readings/);
});

test("Health OS tab and Shield banner are gated on the AI flag", () => {
  assert.match(app, /NEXT_PUBLIC_AI_ENABLED === 'true'/);
  assert.match(app, /AI_ENABLED \|\| n\.id !== 'ai'/);
  assert.match(app, /\{AI_ENABLED && <ShieldBanner \/>\}/);
  assert.match(appPage, /NEXT_PUBLIC_AI_ENABLED === 'true' && \(/);
});

test("no overclaiming protocol copy", () => {
  for (const bad of [/Metabolic Reversal/, /absorption patterns/, /Cardiovascular Defense/, /Longevity Optimization/, /Cognitive Protection/, /target 5\.7%/, /target <130/]) {
    assert.doesNotMatch(app, bad);
  }
  assert.doesNotMatch(read("lib/data.ts"), /Cardiovascular Defense|A1C target 6\.5%/);
});
