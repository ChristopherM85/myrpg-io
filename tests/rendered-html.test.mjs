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

test("adds safe baseline security headers at the Worker boundary", async () => {
  const worker = await read("worker/index.ts");
  for (const header of ["Strict-Transport-Security", "X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Permissions-Policy"]) assert.ok(worker.includes(header));
  assert.match(worker, /withSecurityHeaders\(await handler\.fetch/);
});

test("ships distinct original artwork recommendations without automatic assignment", async () => {
  const [media, admin, consoleUi, actions, files] = await Promise.all([
    read("app/components/editorial-media.ts"), read("app/admin/page.tsx"), read("app/admin/console.tsx"), read("app/api/admin/actions/route.ts"), readdir(new URL("public/editorial", root)),
  ]);
  for (const name of ["fantasy-live-service-intelligence.png", "science-profile-intelligence.png", "anime-update-intelligence.png", "historical-world-intelligence.png", "neutral-industry-intelligence.png"]) assert.ok(files.includes(name));
  for (const key of ["fantasy-live", "science-profile", "anime-update", "historical-world", "neutral-industry"]) assert.ok(media.includes(`\"${key}\"`));
  assert.match(media, /recommendEditorialGraphic/);
  assert.match(media, /Original MyRPG editorial artwork; not gameplay\./);
  assert.match(admin, /adjacentArtworkRuns/);
  assert.match(consoleUi, /Artwork duplication report/);
  assert.match(consoleUi, /Apply recommendation/);
  assert.match(actions, /Only the Owner can select a public MyRPG editorial graphic/);
});
