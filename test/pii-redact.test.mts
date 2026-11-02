import test from "node:test";
import assert from "node:assert/strict";
import { knownNamesFromCircle, redactText } from "../src/lib/pii-redact.ts";

const KNOWN = knownNamesFromCircle([
  { patient_name: "Jane Doe", member_name: "Rosa Martinez", patient_nickname: "Grandma" },
]);

test("synthetic PHI is replaced and CRITICAL types are marked", () => {
  const input =
    "Patient Jane Doe, DOB: 03/14/1961, MRN AB1234567, SSN 123-45-6789, phone 405-555-0142, lives at 123 Main Street, Ada OK 74820. Mrs. Jane Doe has CDIB CN-123-45678. What should we do about her A1C of 8.2?";
  const out = redactText(input, KNOWN);
  assert.equal(out.critical, true);
  for (const leaked of [
    "Jane Doe",
    "Jane",
    "Doe",
    "Grandma",
    "03/14/1961",
    "AB1234567",
    "123-45-6789",
    "405-555-0142",
    "123 Main Street",
    "74820",
    "CN-123-45678",
    "CDIB CN-123-45678",
  ]) {
    assert.equal(out.sanitized.includes(leaked), false, `still present: ${leaked}`);
  }
  assert.match(out.sanitized, /\[PATIENT_NAME\]/);
  assert.match(out.sanitized, /\[SSN_PROTECTED\]/);
  assert.match(out.sanitized, /\[DOB_PROTECTED\]/);
  assert.match(out.sanitized, /\[MRN_PROTECTED\]/);
  assert.match(out.sanitized, /\[PHONE_PROTECTED\]/);
  assert.match(out.sanitized, /\[ADDRESS_PROTECTED\]/);
  assert.match(out.sanitized, /\[ZIP_PROTECTED\]/);
  assert.match(out.sanitized, /\[TRIBAL_ID_PROTECTED\]/);
  assert.match(out.sanitized, /A1C of 8\.2/);
});

test("a phone and a bare date are redacted but not CRITICAL", () => {
  const out = redactText("Call 405-555-0142 on 03/14/1961 about LDL 130.");
  assert.equal(out.critical, false);
  assert.equal(out.sanitized.includes("405-555-0142"), false);
  assert.equal(out.sanitized.includes("03/14/1961"), false);
  assert.match(out.sanitized, /LDL 130/);
});

test("false positives: Dr. visit on Main and LDL 130 stay", () => {
  const sample = "Dr. visit on Main. LDL 130. A1C of 8.2.";
  const out = redactText(sample, KNOWN);
  assert.equal(out.sanitized, sample);
  assert.equal(out.flags.length, 0);
  assert.equal(out.critical, false);
});

test("title-style name is replaced when the server does not know it", () => {
  const out = redactText("Mrs. Ada Lovelace lives at 9 Oak Road.");
  assert.equal(out.critical, false);
  assert.match(out.sanitized, /\[NAME_PROTECTED\]/);
  assert.match(out.sanitized, /\[ADDRESS_PROTECTED\]/);
  assert.equal(out.sanitized.includes("Ada Lovelace"), false);
  assert.equal(out.sanitized.includes("9 Oak Road"), false);
});

test("tribal ID pattern covers the sovereign sample", () => {
  const out = redactText("CDIB CN-123-45678");
  assert.equal(out.critical, true);
  assert.equal(out.sanitized, "[TRIBAL_ID_PROTECTED]");
  assert.ok(out.flags.includes("TRIBAL_ID"));
});
