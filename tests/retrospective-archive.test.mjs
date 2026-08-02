import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("retrospective intake preserves source and publication date integrity", async () => {
  const [schema, actions, preview] = await Promise.all([read("db/schema.ts"), read("app/api/admin/actions/route.ts"), read("app/admin/preview/article/[id]/page.tsx")]);
  for (const token of ["sourceDate", "gamerTakeaway", "retrospective"]) assert.ok(schema.includes(token));
  for (const token of ["previous 60 days", "140", "220", "article_retrospective_intake"]) assert.ok(actions.includes(token));
  for (const token of ["Originally announced", "Set only when the Owner publishes", "Why this still matters"]) assert.ok(preview.includes(token));
});

test("public retrospective coverage uses the real MyRPG publication timestamp", async () => {
  const [article, news, rss] = await Promise.all([read("app/articles/[slug]/page.tsx"), read("app/news/page.tsx"), read("app/rss.xml/route.ts")]);
  for (const token of ["RETROSPECTIVE", "Published by MyRPG", "article.publishedAt"]) assert.ok(article.includes(token));
  assert.ok(news.includes("orderBy(desc(articles.publishedAt))"));
  assert.ok(rss.includes("article.publishedAt || article.createdAt"));
});
