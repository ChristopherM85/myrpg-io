import { and, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { agentRuns, articles, games, mediaAssets } from "../../db/schema";
import { PublicPage } from "../components/PublicChrome";

export const dynamic = "force-dynamic";
export const metadata = { title: "MMO News | MyRPG.IO", description: "Human-reviewed MMO news with source-linked editorial notes.", alternates: { canonical: "https://myrpg.io/news" } };

export default async function News() {
  let rows: any[] = []; const relations = new Map<string, string>(); const visuals = new Map<string, any>(); const gameNames = new Map<string, string>();
  try {
    const db = getDb(); rows = await db.select().from(articles).where(eq(articles.status, "published"));
    const [runs, publishedGames, assets] = await Promise.all([db.select().from(agentRuns), db.select().from(games).where(eq(games.published, true)), db.select().from(mediaAssets).where(and(eq(mediaAssets.placement, "lead"), eq(mediaAssets.status, "approved")))]);
    for (const game of publishedGames) gameNames.set(game.slug, game.name);
    for (const run of runs) { if (!run.itemId || !run.outputJson) continue; try { const intake = JSON.parse(run.outputJson); if (intake.gameSlug && gameNames.has(intake.gameSlug)) relations.set(run.itemId, intake.gameSlug); } catch { /* An invalid private run cannot affect public news. */ } }
    for (const asset of assets) if (asset.articleId && !visuals.has(asset.articleId)) visuals.set(asset.articleId, asset);
  } catch { /* The public empty state is intentional when D1 is unavailable. */ }
  return <PublicPage><nav aria-label="Breadcrumb"><a href="/">Home</a> / News</nav><p style={eyebrow}>MYRPG / NEWS</p><h1 style={heading}>MMO news</h1><p style={muted}>Source-linked and human-reviewed. No autonomous publishing.</p>{rows.length ? <section style={{ marginTop: 28 }}>{rows.map((article) => { const gameSlug = relations.get(article.id); const visual = visuals.get(article.id); return <article key={article.id} style={row}><p style={label}><a href="/writers#maya-chen" style={link}>MAYA CHEN · SIGNAL EDITOR</a></p><h2><a href={`/articles/${article.slug}`} style={link}>{article.title}</a></h2>{visual ? <img src={visual.assetUrl || visual.sourceUrl || ""} alt={visual.altText} width={visual.width || 1200} height={visual.height || 675} style={image} /> : <div style={fallback}>MyRPG editorial graphic — not gameplay</div>}<p style={muted}>{article.summary}</p><small>Published: {article.publishedAt?.slice(0, 10)} · Recently fact-checked: {article.factCheckedAt?.slice(0, 10)} · <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" style={link}>Official source</a>{gameSlug && <> · <a href={`/games/${gameSlug}`} style={link}>Related game: {gameNames.get(gameSlug)}</a></>} · AI-assisted, human-reviewed</small></article>; })}</section> : <section style={empty}><h2>News is reviewed before it goes live</h2><p>No published editorial coverage is available yet. MyRPG publishes only source-linked, human-reviewed MMO coverage — never simulations, scraped recaps, or unreviewed stories.</p></section>}</PublicPage>;
}

const eyebrow = { color: "#76f5e3", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginTop: 30 };
const heading = { fontSize: "clamp(2.6rem,7vw,5rem)", letterSpacing: "-.06em", margin: "12px 0" };
const muted = { color: "#aeb6c7", lineHeight: 1.6 };
const row = { borderTop: "1px solid #273044", padding: "28px 0" };
const link = { color: "#76f5e3" };
const label = { color: "#c9a666", fontSize: 11, fontWeight: 800, letterSpacing: 1.2, margin: 0 };
const image = { display: "block", maxWidth: "100%", height: "auto", margin: "18px 0", border: "1px solid #273044", background: "#111722" };
const fallback = { margin: "18px 0", padding: "24px", border: "1px solid #273044", background: "linear-gradient(120deg,#111722,#151328)", color: "#aeb6c7", fontSize: 12 };
const empty = { borderLeft: "3px solid #c9a666", padding: "20px", background: "#101521", marginTop: 28 };
