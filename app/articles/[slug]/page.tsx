import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { agentRuns, articles, games, mediaAssets } from "../../../db/schema";
import { EditorialVisual } from "../../components/EditorialVisual";
import { PublicFooter, PublicHeader } from "../../components/PublicChrome";
import { WriterPortrait } from "../../components/WriterPortrait";
import { MAYA } from "../../components/writers";

export const dynamic = "force-dynamic";
const base = "https://myrpg.io";

function displayDate(value?: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

async function loadArticle(slug: string) {
  const db = getDb();
  const article = (await db.select().from(articles).where(eq(articles.slug, slug)).limit(1))[0];
  if (!article || article.status !== "published") return null;
  const visual = (await db.select().from(mediaAssets).where(and(eq(mediaAssets.articleId, article.id), eq(mediaAssets.placement, "lead"), eq(mediaAssets.status, "approved"))).limit(1))[0];
  const supporting = await db.select().from(mediaAssets).where(and(eq(mediaAssets.articleId, article.id), eq(mediaAssets.placement, "supporting"), eq(mediaAssets.status, "approved"))).limit(2);
  const runs = await db.select().from(agentRuns).where(eq(agentRuns.itemId, article.id)).limit(8);
  const relationRun = runs.find((run) => run.outputJson?.includes("gameSlug"));
  let gameSlug = "";
  try { gameSlug = relationRun?.outputJson ? JSON.parse(relationRun.outputJson).gameSlug || "" : ""; } catch { /* A malformed private run cannot affect a public article. */ }
  const relatedGame = gameSlug ? (await db.select().from(games).where(eq(games.slug, gameSlug)).limit(1))[0] : null;
  return { article, visual, supporting, relatedGame: relatedGame?.published ? relatedGame : null };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let record: Awaited<ReturnType<typeof loadArticle>> = null;
  try { record = await loadArticle(slug); } catch { return notFound(); }
  if (!record) return notFound();
  const { article, visual, supporting, relatedGame } = record;
  const url = `${base}/articles/${article.slug}`;
  return <><PublicHeader /><main className="article-page">
    <nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/news">News</a> / {article.title}</nav>
    <p className="article-kicker">AI-ASSISTED · HUMAN-REVIEWED</p>
    <h1>{article.title}</h1>
    <EditorialVisual title={article.title} label="Human-reviewed coverage" image={visual} />
    <p className="article-summary">{article.summary}</p>
    {supporting.map((asset) => <EditorialVisual key={asset.id} title={article.title} category="Supporting official media" label="Approved media" image={asset} eager={false} />)}
    <section className="article-notes"><div className="article-notes-heading"><p>VERIFIED COVERAGE</p><h2>Source &amp; editorial notes</h2></div><a href={`/writers#${MAYA.slug}`} className="article-author"><div className="article-author-portrait"><WriterPortrait writer={MAYA} compact /></div><span><strong>{MAYA.name}</strong><b>{MAYA.title}</b><small>MyRPG editorial persona · AI-assisted, human-reviewed</small></span><span className="article-author-arrow" aria-hidden="true">→</span></a><dl className="article-fact-row"><div><dt>Published</dt><dd><time dateTime={article.publishedAt || undefined}>{displayDate(article.publishedAt)}</time></dd></div><div><dt>Last fact-check</dt><dd><time dateTime={article.factCheckedAt || undefined}>{displayDate(article.factCheckedAt)}</time></dd></div><div><dt>Primary source</dt><dd><a href={article.sourceUrl} rel="noopener noreferrer" target="_blank">Official source <span aria-hidden="true">↗</span></a></dd></div></dl><p className="article-transparency">This is an AI-assisted, human-reviewed factual summary. MyRPG does not publish autonomous coverage.</p></section>
    {relatedGame && <section className="article-related"><p>RELATED GAME</p><h2><a href={`/games/${relatedGame.slug}`}>{relatedGame.name}</a></h2><span>Human-approved profile using structured factual fields and official sources.</span></section>}
    <aside className="article-network"><small>FEATURED GAME FROM THE MYRPG NETWORK</small><p>MyMafia.io — Build an empire. Keep an alibi.</p><a href="https://mymafia.io?utm_source=myrpg.io&utm_medium=network_promo&utm_campaign=mymafia_beta" target="_blank" rel="noopener sponsored">Enter the city →</a></aside>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "NewsArticle", headline: article.title, description: article.summary, datePublished: article.publishedAt, dateModified: article.updatedAt, mainEntityOfPage: url, author: { "@type": "Organization", name: "MyRPG.IO" }, image: visual?.assetUrl || undefined }) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: base }, { "@type": "ListItem", position: 2, name: "News", item: `${base}/news` }, { "@type": "ListItem", position: 3, name: article.title, item: url }] }) }} />
  </main><PublicFooter /></>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try { const record = await loadArticle(slug); if (record) return { title: `${record.article.title} | MyRPG.IO`, description: record.article.summary.slice(0, 155), alternates: { canonical: `${base}/articles/${slug}` }, robots: { index: true, follow: true }, openGraph: { title: record.article.title, description: record.article.summary.slice(0, 155), url: `${base}/articles/${slug}`, images: record.visual?.assetUrl ? [record.visual.assetUrl] : undefined } }; } catch { /* private/unavailable records remain noindex */ }
  return { robots: { index: false, follow: false } };
}
