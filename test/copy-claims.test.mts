import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

// Built from parts so this file does not contain the prohibited phrase.
const FORBIDDEN = new RegExp("hipaa" + "[- ]" + "compliant", "i");

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "coverage"]);
const TEXT_EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".md", ".html", ".css", ".json", ".yml", ".yaml", ".sql"]);

async function walk(dir: string, out: string[]) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out);
      continue;
    }
    if (TEXT_EXT.has(path.extname(entry.name))) out.push(full);
  }
}

test("prohibited HIPAA compliance phrase is absent", async () => {
  const root = path.resolve(import.meta.dirname, "..");
  const files: string[] = [];
  await walk(root, files);
  const hits: string[] = [];
  for (const file of files) {
    const text = await readFile(file, "utf8");
    if (FORBIDDEN.test(text)) hits.push(path.relative(root, file));
  }
  assert.deepEqual(hits, []);
});
