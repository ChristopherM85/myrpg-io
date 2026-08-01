import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
const root = new URL("../", import.meta.url); const read = (path) => readFile(new URL(path, root), "utf8");
test("homepage reads published records and retains transparent empty states", async () => { const source = await read("app/page.tsx"); for (const token of ["eq(articles.status, \"published\")", "eq(games.published, true)", "No published editorial coverage", "HOW MYRPG WORKS", "NetworkFeature"]) assert.ok(source.includes(token)); });
test("public navigation and owner publishing overview are present", async () => { const [chrome, admin] = await Promise.all([read("app/components/PublicChrome.tsx"), read("app/admin/console.tsx")]); for (const token of ["Find My MMO", "Editorial Standards", "AI Transparency", "Advertising Disclosure"]) assert.ok(chrome.includes(token)); assert.ok(admin.includes("Publishing overview")); });
