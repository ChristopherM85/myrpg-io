import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { agentRuns, articles, games, mediaAssets } from "../../db/schema";
import { EditorialVisual } from "../components/EditorialVisual";
import { PublicPage } from "../components/PublicChrome";

export const dynamic = "force-dynamic";
export const metadata = { title: "MMO News | MyRPG.IO", description: "Human-reviewed MMO news with source-linked editorial notes.", alternates: { canonical: "https://myrpg.io/news" } };

export default async function News() {
  let rows: any[] = []; const relations = new Map<string, string>(); const visuals = new Map<string, any>(); const gameNames = new Map<string, string>();
  try {
    const db = getDb(); rows = await db.select().from(articles).where(eq(articles.status, "published"));
    const [runs, publishedGames, assets] = await Promise.all([db.select().from(agentRuns), db.select().from(games).where(eq(games.published, true)), db.select().from(mediaAssets).where(and(eq(mediaAssets.placement, "lead"), eq(mediaAssets.status, "approved")))]);
    for (const game of publishedGames) gameNames.set(game.slug, game.name);
    for (const run of runs) { if (!run.itemId || !run.outputJson) continue; try { const intake = JSON.parse(run.outputJson); if (intake.gameSlug && gameNames.has(intake.gameSlug)) relations.set(run.itemId, intake.gameSlug); } catch { /* Invalid private metadata cannot affect public news. */ } }
    for (const asset of assets) if (asset.articleId && !visuals.has(asset.articleId)) visuals.set(asset.articleId, asset);
  } catch { /* Intentional public empty state if storage is unavailable. */ }
  return <PublicPage><nav aria-label="Breadcrumb"><a href="/">Home</a> / News</nav><p style={eyebrow}>MYRPG / NEWS</p><h1 style={heading}>MMO news</h1><p style={muted}>Source-linked and human-reviewed. No autonomous publishing.</p>{rows.length ? <section className="news-editorial-list">{rows.map((article) => { const gameSlug = relations.get(article.id); return <article key={article.id} className="news-editorial-card"><p style={label}><a href="/writers#maya-chen" style={link}>MAYA CHEN · SIGNAL EDITOR</a></p><h2><a href={`/articles/${article.slug}`} style={link}>{article.title}</a></h2><EditorialVisual title={article.title} category="Official MMO news" label="Human-reviewed coverage" image={visuals.get(article.id)} eager={false} /><p style={muted}>{article.summary}</p><small>Published: {article.publishedAt?.slice(0, 10)} · Recently fact-checked: {article.factCheckedAt?.slice(0, 10)} · <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" style={link}>Official source</a>{gameSlug && <> · <a href={`/games/${gameSlug}`} style={link}>Related game: {gameNames.get(gameSlug)}</a></>} · AI-assisted, human-reviewed</small></article>; })}</section> : <section style={empty}><h2>News is reviewed before it goes live</h2><p>No published editorial coverage is available yet. MyRPG publishes only source-linked, human-reviewed MMO coverage — never simulations, scraped recaps, or unreviewed stories.</p></section>}</PublicPage>;
}

const eyebrow = { color: "#76f5e3", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginTop: 30 };
const heading = { fontSize: "clamp(2.6rem,7vw,5rem)", letterSpacing: "-.06em", margin: "12px 0" };
const muted = { color: "#c0cada", lineHeight: 1.6 };
const link = { color: "#76f5e3" };
const label = { color: "#d8b574", fontSize: 11, fontWeight: 800, letterSpacing: 1.2, margin: 0 };
const empty = { borderLeft: "3px solid #c9a666", padding: "20px", background: "#101521", marginTop: 28 };
