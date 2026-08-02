import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("article publication requires an explicit owner decision and verified intake", async () => {
  const source = await read("app/api/admin/actions/route.ts");
  for (const rule of ["Only the Owner can publish.", "Only the Owner can approve article publication readiness.", "ownerApproved", "sourceCache", "minimum=currentArticle.retrospective?140:120"]) assert.ok(source.includes(rule));
});

test("public articles remain source-linked and structured without exposing private records", async () => {
  const source = await read("app/articles/[slug]/page.tsx");
  for (const rule of ["article.status !== \"published\"", "Source &amp; editorial notes", "BreadcrumbList", "NewsArticle", "relatedGame?.published"]) assert.ok(source.includes(rule));
});
