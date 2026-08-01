import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("batch review exposes factual filters and clear blockers", async () => {
  const manager = await read("app/admin/games/manager.tsx");
  for (const label of ["Filter by game status", "Filter by source", "Filter by confidence", "Filter by readiness", "Filter by matcher fields", "Unapproved source", "Stale fact check", "Missing Owner review decision"]) assert.match(manager, new RegExp(label));
});

test("calendar previews stay owner-only and noindex", async () => {
  const source = await read("app/admin/preview/calendar/[id]/page.tsx");
  assert.match(source, /requireChatGPTUser/);
  assert.match(source, /account\?\.role !== "owner"/);
  assert.match(source, /robots: \{ index: false, follow: false \}/);
  assert.match(source, /Preview unavailable/);
});
