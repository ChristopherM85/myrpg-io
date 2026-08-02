import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("ships the finished MyRPG public shell instead of the starter preview", async () => {
  const [home, layout, chrome, css, packageJson] = await Promise.all([
    read("app/page.tsx"), read("app/layout.tsx"), read("app/components/PublicChrome.tsx"), read("app/globals.css"), read("package.json"),
  ]);
  for (const token of ["THE MMO INTELLIGENCE NETWORK", "Find My MMO", "NetworkFeature"]) assert.ok(home.includes(token));
  assert.match(layout, /MyRPG\.IO/);
  assert.match(chrome, /skip-link/);
  assert.match(chrome, /id="main-content"/);
  assert.match(css, /\.skip-link/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.deepEqual(await readdir(new URL("app/_sites-preview", root)), []);
});

test("keeps empty public guides out of search results until useful content exists", async () => {
  const guides = await read("app/guides/page.tsx");
  assert.match(guides, /robots:\{index:false,follow:true\}/);
  assert.match(guides, /Guides arrive after editorial review/);
});
