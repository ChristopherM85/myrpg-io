import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("search launch status stays Owner-recorded and canonical", async () => {
  const [schema, actions, consoleSource] = await Promise.all([read("db/schema.ts"), read("app/api/admin/actions/route.ts"), read("app/admin/console.tsx")]);
  for (const token of ["searchEngineStatuses", "verificationStatus", "sitemapStatus"]) assert.ok(schema.includes(token));
  assert.match(actions, /Only the Owner can record search-console status/);
  assert.match(actions, /https:\/\/myrpg\.io\//);
  assert.match(consoleSource, /https:\/\/myrpg\.io\/sitemap\.xml/);
  assert.match(consoleSource, /performs no external submission/);
});

test("editorial plans are private, audited, and capped at three per week", async () => {
  const [schema, actions, consoleSource] = await Promise.all([read("db/schema.ts"), read("app/api/admin/actions/route.ts"), read("app/admin/console.tsx")]);
  for (const token of ["editorialPlans", "proposedDate", "sourceStatus", "mediaStatus", "blocker"]) assert.ok(schema.includes(token));
  assert.match(actions, /weekly\.length >= 3/);
  assert.match(actions, /editorial_plan_created/);
  assert.match(consoleSource, /Planning only\. Entries never publish, fetch, schedule, or trigger an agent/);
  assert.match(consoleSource, /Two source-backed news articles weekly/);
});
