import { requireChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { articles, games, users } from "../../../db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function QualityPage() {
  const user = await requireChatGPTUser("/admin/quality");
  const issues: string[] = [];
  try {
    const db = getDb();
    const me = (await db.select().from(users).where(eq(users.email, user.email)).limit(1))[0];
    if (me?.role !== "owner") return <main><h1>Owner access required</h1></main>;
    const publishedArticles = await db.select().from(articles).where(eq(articles.status, "published"));
    const articleSlugs = new Set<string>();
    for (const article of publishedArticles) {
      if (!article.title.trim()) issues.push(`${article.id}: missing title`);
      if (!article.summary.trim()) issues.push(`${article.id}: missing description`);
      if (!article.sourceUrl) issues.push(`${article.id}: missing citation`);
      if (!article.factCheckedAt) issues.push(`${article.id}: missing fact-check date`);
      if (articleSlugs.has(article.slug)) issues.push(`${article.id}: duplicate slug`);
      articleSlugs.add(article.slug);
    }
    for (const game of await db.select().from(games)) {
      const prefix = game.published ? game.name : `${game.name} (review candidate)`;
      if (!game.activity) issues.push(`${prefix}: Find My MMO activity fit is missing`);
      if (!game.timeCommitment) issues.push(`${prefix}: Find My MMO time commitment is missing`);
      if (!game.directorySummary) issues.push(`${prefix}: factual directory summary is missing`);
      if (!game.sourceUrl) issues.push(`${prefix}: approved official source is missing`);
      if (!game.factCheckedAt) issues.push(`${prefix}: fact-check date is missing`);
    }
  } catch { issues.push("D1 records are not available yet."); }
  return <main style={{ padding: 48, fontFamily: "Arial", background: "#090b12", color: "#edf3f5", minHeight: "100vh" }}>
    <p>MYRPG / OWNER QUALITY REPORT</p>
    <h1>{issues.length ? `${issues.length} items need attention` : "All records pass the lightweight checks"}</h1>
    <p>Checks prioritize published metadata and citations, duplicate slugs, and the activity/time-commitment details that power Find My MMO. Private launch candidates are checked too, so incomplete data is fixed before review.</p>
    <ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
    <a href="/admin">Return to Director Console</a>
  </main>;
}
