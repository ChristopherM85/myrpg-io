import { getDb } from "../../db";
import { articles } from "../../db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const metadata = { title: "MMO News | MyRPG.IO", description: "Human-reviewed MMORPG news with source-linked editorial notes.", alternates: { canonical: "https://myrpg.io/news" }, openGraph: { title: "MMO News | MyRPG.IO", description: "Human-reviewed MMORPG news with source-linked editorial notes.", url: "https://myrpg.io/news" } };

export default async function News() {
  let rows: any[] = [];
  try { rows = await getDb().select().from(articles).where(eq(articles.status, "published")); } catch { /* An empty state is safer than public draft data. */ }
  return <main style={{ maxWidth: 900, margin: "auto", padding: 48 }}>
    <nav aria-label="Breadcrumb"><a href="/">Home</a> / News</nav><p>MYRPG / NEWS</p><h1>MMO News</h1><p>Source-linked and human-reviewed. No autonomous publishing.</p>
    {rows.length ? rows.map((article) => <article key={article.id}><h2><a href={`/articles/${article.slug}`}>{article.title}</a></h2><p>{article.summary}</p><small>Fact-checked: {article.factCheckedAt} · <a href={article.sourceUrl} rel="noopener noreferrer" target="_blank">Official source</a> · AI-assisted, human-reviewed</small></article>) : <p>Published coverage will appear after human review.</p>}
  </main>;
}
