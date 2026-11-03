import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  CHECK_INTERVAL_MS,
  SAFETY_DISCLAIMER,
  lastSyncedText,
  newestSync,
  staleNote,
  syncFreshness,
} from "../src/lib/sync-status.ts";

const NOW = Date.parse("2026-11-03T15:00:00Z");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(NOW - ms).toISOString();

test("stale data reads as stale", () => {
  assert.equal(lastSyncedText(ago(3 * DAY + HOUR), NOW), "Last synced 3 days ago");
  assert.equal(lastSyncedText(ago(2 * HOUR), NOW), "Last synced 2 hours ago");
  assert.equal(lastSyncedText(null, NOW), "Never synced");
  assert.equal(syncFreshness(ago(HOUR), NOW), "recent");
  assert.equal(syncFreshness(ago(DAY), NOW), "stale");
  assert.equal(syncFreshness(ago(5 * DAY), NOW), "old");
  assert.match(staleNote("old") ?? "", /Out of date/);
});

test("newest sync across sources", () => {
  const sources = [
    { source: "fitbit", label: "Fitbit upload", kind: "upload" as const, last_synced_at: ago(5 * DAY) },
    { source: "withings", label: "Withings (connected)", kind: "connected" as const, last_synced_at: ago(HOUR) },
    { source: "manual", label: "Entered", kind: "manual" as const, last_synced_at: null },
  ];
  assert.equal(newestSync(sources), ago(HOUR));
  assert.equal(newestSync([]), null);
});

test("disclaimer wording", () => {
  assert.match(SAFETY_DISCLAIMER, /CareIQ and CareCircle are not an emergency service or medical alert device/);
  assert.match(SAFETY_DISCLAIMER, /minutes to hours/);
  assert.match(SAFETY_DISCLAIMER, /call 911/);
});

test("CareCircle no longer polls every 5 seconds or pulses a live dot", () => {
  assert.ok(CHECK_INTERVAL_MS >= 60_000);
  const root = path.resolve(import.meta.dirname, "..");
  const app = readFileSync(path.join(root, "src/components/CareCircleApp.tsx"), "utf8");
  assert.doesNotMatch(app, /POLL_MS = 5000/);
  assert.doesNotMatch(app, /Refreshes about every 5 seconds/);
  assert.match(app, /SyncSourceList/);
  assert.match(app, /SafetyDisclaimer/);
  for (const f of ["src/components/dashboard/FamilyPage.tsx", "src/components/dashboard/CareIQPage.tsx"]) {
    const src = readFileSync(path.join(root, f), "utf8");
    assert.match(src, /SyncSourceList/, f);
    assert.match(src, /SafetyDisclaimer/, f);
  }
});
