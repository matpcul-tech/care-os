import test from "node:test";
import assert from "node:assert/strict";
import { knownNamesFromCircle, redactMessages, redactText } from "../src/lib/pii-redact.ts";

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

test("email addresses are masked and do not block the question", () => {
  const samples = [
    "Reach the family at ada.lovelace@example.com about the refill.",
    "Also try Ada.Lovelace+care@mail.example.org.",
  ];
  for (const sample of samples) {
    const out = redactText(sample);
    assert.equal(out.critical, false, sample);
    assert.equal(out.flags.includes("EMAIL"), true, sample);
    assert.equal(out.flags.includes("SSN"), false, sample);
    assert.match(out.sanitized, /\[EMAIL_PROTECTED\]/);
    assert.equal(out.sanitized.includes("@"), false, sample);
    assert.match(out.sanitized, /refill|Also try/);
  }
});

test("SSNs with dashes, spaces, dots, or no separators are critical", () => {
  const samples = ["123-45-6789", "123 45 6789", "123  45  6789", "123.45.6789", "123456789", "SSN123456789"];
  for (const sample of samples) {
    const out = redactText(`Identifier ${sample} on the form.`);
    assert.equal(out.critical, true, sample);
    assert.equal(out.flags.includes("SSN"), true, sample);
    assert.match(out.sanitized, /\[SSN_PROTECTED\]/);
    assert.equal(out.sanitized.includes(sample), false, sample);
  }
});

test("parenthetical US phone numbers are masked and are not SSNs", () => {
  const phones = ["(405) 555-0142", "(405)555-0142", "+1 (405) 555-0142"];
  for (const phone of phones) {
    const out = redactText(`Call ${phone} about LDL 130.`);
    assert.equal(out.critical, false, phone);
    assert.deepEqual(out.flags, ["PHONE"], phone);
    assert.match(out.sanitized, /\[PHONE_PROTECTED\]/);
    assert.equal(out.sanitized.includes(phone), false, phone);
    assert.equal(out.sanitized.includes("555-0142"), false, phone);
    assert.equal(out.sanitized.includes("+1"), false, phone);
    assert.match(out.sanitized, /LDL 130/);
  }

  const mixed = redactText("Call (405) 555-0142 or +1 (405)555-0142. SSN 123 45 6789.");
  assert.equal(mixed.critical, true);
  assert.equal(mixed.flags.includes("PHONE"), true);
  assert.equal(mixed.flags.includes("SSN"), true);
  assert.equal(mixed.sanitized.includes("(405)"), false);
  assert.equal(mixed.sanitized.includes("555-0142"), false);
  assert.equal(mixed.sanitized.includes("+1"), false);
  assert.equal(mixed.sanitized.includes("123 45 6789"), false);
  assert.match(mixed.sanitized, /\[PHONE_PROTECTED\]/);
  assert.match(mixed.sanitized, /\[SSN_PROTECTED\]/);

  const notPhone = redactText("Note (123) 45-6789 and LDL 130.");
  assert.equal(notPhone.sanitized, "Note (123) 45-6789 and LDL 130.");
  assert.deepEqual(notPhone.flags, []);
});

test("phone numbers already handled stay phones, not SSNs", () => {
  const phones = ["405-555-0142", "405.555.0142", "405 555 0142", "4055550142"];
  for (const phone of phones) {
    const out = redactText(`Call ${phone} about LDL 130.`);
    assert.equal(out.critical, false, phone);
    assert.deepEqual(out.flags, ["PHONE"], phone);
    assert.match(out.sanitized, /\[PHONE_PROTECTED\]/);
    assert.equal(out.sanitized.includes(phone), false, phone);
    assert.match(out.sanitized, /LDL 130/);
  }
});

test("a 9-digit MRN or tribal ID is not relabeled as an SSN", () => {
  const mrn = redactText("Record AB123456789 is on file.");
  assert.equal(mrn.critical, false);
  assert.equal(mrn.flags.includes("SSN"), false);
  assert.equal(mrn.flags.includes("MRN"), true);
  assert.equal(mrn.sanitized.includes("AB123456789"), false);
  assert.match(mrn.sanitized, /\[MRN_PROTECTED\]/);

  const tribal = redactText("Enrollment CN123456789.");
  assert.equal(tribal.critical, true);
  assert.equal(tribal.flags.includes("TRIBAL_ID"), true);
  assert.equal(tribal.flags.includes("SSN"), false);
  assert.equal(tribal.sanitized.includes("123456789"), false);
});

test("rural route and post office box addresses are masked", () => {
  const samples = [
    "Rural Route 2 Box 15",
    "rural route 2, box 15",
    "RR 2 Box 15",
    "R.R. 2 Box 15",
    "HC 1 Box 30",
    "PO Box 123",
    "P.O. Box 123",
    "Post Office Box 123",
  ];
  for (const sample of samples) {
    const out = redactText(`Deliver to ${sample} please.`);
    assert.equal(out.critical, false, sample);
    assert.equal(out.flags.includes("ADDRESS"), true, sample);
    assert.equal(out.flags.includes("SSN"), false, sample);
    assert.match(out.sanitized, /\[ADDRESS_PROTECTED\]/);
    assert.equal(out.sanitized.toLowerCase().includes(sample.toLowerCase()), false, sample);
  }
});

test("normal numbers, lab values, and bare route words stay", () => {
  const sample = "LDL 130. A1C of 8.2. Glucose 98. BP 138/86. Take 2 tablets. RR 18. Box 15. Order 4829. Lot 123456. Code 12345678. Ref 12345678901. Visit example.com.";
  const out = redactText(sample);
  assert.equal(out.sanitized, sample);
  assert.equal(out.flags.length, 0);
  assert.equal(out.critical, false);
});

test("redactMessages sanitizes every turn before a caller can forward them", () => {
  const out = redactMessages([
    { role: "user", content: "Write ada.lovelace@example.com about Rural Route 2 Box 15." },
    { role: "assistant", content: "The other box is PO Box 123. Phone 405-555-0199." },
    { role: "user", content: "Also RR 2 Box 15, HC 1 Box 30, and P.O. Box 44." },
  ]);
  assert.equal(out.critical, false);
  assert.equal(out.messages.length, 3);
  const joined = out.messages.map((m) => m.content).join("\n");
  for (const leaked of [
    "ada.lovelace@example.com",
    "Rural Route 2 Box 15",
    "PO Box 123",
    "405-555-0199",
    "RR 2 Box 15",
    "HC 1 Box 30",
    "P.O. Box 44",
  ]) {
    assert.equal(joined.includes(leaked), false, leaked);
  }
  assert.match(out.messages[0].content, /\[EMAIL_PROTECTED\]/);
  assert.match(out.messages[0].content, /\[ADDRESS_PROTECTED\]/);
  assert.match(out.messages[1].content, /\[PHONE_PROTECTED\]/);
  assert.match(out.messages[2].content, /\[ADDRESS_PROTECTED\]/);

  const blocked = redactMessages([
    { role: "user", content: "The number is 123456789." },
    { role: "assistant", content: "Noted." },
    { role: "user", content: "Thanks, and also 123 45 6789." },
  ]);
  assert.equal(blocked.critical, true);
  assert.equal(blocked.flags.includes("SSN"), true);
  assert.equal(blocked.messages[0].content.includes("123456789"), false);
  assert.equal(blocked.messages[2].content.includes("123 45 6789"), false);
  assert.match(blocked.messages[0].content, /\[SSN_PROTECTED\]/);
  assert.match(blocked.messages[2].content, /\[SSN_PROTECTED\]/);
});
