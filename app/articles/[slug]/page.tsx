import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { agentRuns, articles, games, mediaAssets } from "../../../db/schema";
import { EditorialVisual } from "../../components/EditorialVisual";

export const dynamic = "force-dynamic";
const base = "https://myrpg.io";

async function loadArticle(slug: string) {
  const db = getDb();
  const article = (await db.select().from(articles).where(eq(articles.slug, slug)).limit(1))[0];
  if (!article || article.status !== "published") return null;
  const visual = (await db.select().from(mediaAssets).where(and(eq(mediaAssets.articleId, article.id), eq(mediaAssets.placement, "lead"), eq(mediaAssets.status, "approved"))).limit(1))[0];
  const runs = await db.select().from(agentRuns).where(eq(agentRuns.itemId, article.id)).limit(8);
  const relationRun = runs.find((run) => run.outputJson?.includes("gameSlug"));
  let gameSlug = "";
  try { gameSlug = relationRun?.outputJson ? JSON.parse(relationRun.outputJson).gameSlug || "" : ""; } catch { /* A malformed private run cannot affect a public article. */ }
  const relatedGame = gameSlug ? (await db.select().from(games).where(eq(games.slug, gameSlug)).limit(1))[0] : null;
  return { article, visual, relatedGame: relatedGame?.published ? relatedGame : null };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let record: Awaited<ReturnType<typeof loadArticle>> = null;
  try { record = await loadArticle(slug); } catch { return notFound(); }
  if (!record) return notFound();
  const { article, visual, relatedGame } = record;
  const url = `${base}/articles/${article.slug}`;
  return <main style={shell}>
    <nav aria-label="Breadcrumb" style={breadcrumb}><a href="/">Home</a> / <a href="/news">News</a> / {article.title}</nav>
    <p style={kicker}>AI-ASSISTED · HUMAN-REVIEWED</p>
    <h1 style={heading}>{article.title}</h1>
    <EditorialVisual title={article.title} label="Human-reviewed coverage" image={visual} />
    <p style={summary}>{article.summary}</p>
    <section style={notes}><h2>Source & Editorial Notes</h2><p>By Maya Chen, Signal Editor — a fictional AI editorial persona overseen by the MyRPG human director.</p><p>Published: {article.publishedAt} · Last fact-check: {article.factCheckedAt}</p><p>Source: <a href={article.sourceUrl} rel="noopener noreferrer" target="_blank">Official source</a></p><p>This is an AI-assisted, human-reviewed factual summary. MyRPG does not publish autonomous coverage.</p></section>
    {relatedGame && <section style={related}><h2>Related game</h2><p><a href={`/games/${relatedGame.slug}`}>{relatedGame.name}</a> — its human-approved profile is based on structured factual fields and official sources.</p></section>}
    <aside style={network}><small>FEATURED GAME FROM THE MYRPG NETWORK</small><p>MyMafia.io — Build an empire. Keep an alibi.</p><a href="https://mymafia.io?utm_source=myrpg.io&utm_medium=network_promo&utm_campaign=mymafia_beta" target="_blank" rel="noopener sponsored">Enter the city →</a></aside>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "NewsArticle", headline: article.title, description: article.summary, datePublished: article.publishedAt, dateModified: article.updatedAt, mainEntityOfPage: url, author: { "@type": "Organization", name: "MyRPG.IO" }, image: visual?.assetUrl || undefined }) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: base }, { "@type": "ListItem", position: 2, name: "News", item: `${base}/news` }, { "@type": "ListItem", position: 3, name: article.title, item: url }] }) }} />
  </main>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { const record = await loadArticle(slug); if (record) return { title: `${record.article.title} | MyRPG.IO`, description: record.article.summary.slice(0, 155), alternates: { canonical: `${base}/articles/${slug}` }, robots: { index: true, follow: true }, openGraph: { title: record.article.title, description: record.article.summary.slice(0, 155), url: `${base}/articles/${slug}`, images: record.visual?.assetUrl ? [record.visual.assetUrl] : undefined } }; } catch { /* private/unavailable records remain noindex */ }
  return { robots: { index: false, follow: false } };
}

const shell = { maxWidth: 860, margin: "0 auto", padding: "64px 20px", background: "#090b12", color: "#edf3f5", minHeight: "100vh" };
const breadcrumb = { color: "#76f5e3", fontSize: 13 };
const kicker = { marginTop: 40, color: "#d0aa59", letterSpacing: 2, fontSize: 12, fontWeight: 800 };
const heading = { fontSize: "clamp(2rem,6vw,4rem)", lineHeight: 1.05 };
const summary = { fontSize: 20, lineHeight: 1.6, color: "#c4cad8" };
const notes = { borderTop: "1px solid #2a3041", marginTop: 28, paddingTop: 24, color: "#c4cad8", lineHeight: 1.65 };
const related = { border: "1px solid #2a3041", padding: 20, marginTop: 28, background: "#121622", color: "#c4cad8" };
const network = { border: "1px solid #735d2e", padding: 20, marginTop: 32, color: "#c4cad8" };
