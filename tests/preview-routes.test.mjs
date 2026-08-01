import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("admin preview routes are owner-only and noindex", async () => {
  const sources = await Promise.all([read("app/admin/preview/article/[id]/page.tsx"), read("app/admin/preview/game/[id]/page.tsx")]);
  for (const source of sources) { assert.match(source, /requireChatGPTUser/); assert.match(source, /account\?\.role !== "owner"/); assert.match(source, /robots: \{ index: false, follow: false \}/); assert.match(source, /Preview unavailable|preview unavailable/); }
});

test("preview links use stable D1 record ids", async () => {
  const [consoleSource, gameSource, articlePreview] = await Promise.all([read("app/admin/console.tsx"), read("app/admin/games/manager.tsx"), read("app/admin/preview/article/[id]/page.tsx")]);
  assert.match(consoleSource, /\/admin\/preview\/article\/\$\{encodeURIComponent\(article\.id\)\}/); assert.match(gameSource, /\/admin\/preview\/game\/\$\{encodeURIComponent\(game\.id\)\}/); assert.match(articlePreview, /eq\(articles\.id, id\)/);
});
