import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { agentRuns, articles, games, mediaAssets, sources } from "../../db/schema";
import { ExploreNext } from "../components/ExploreNext";
import { EditorialVisual } from "../components/EditorialVisual";
import { PublicPage } from "../components/PublicChrome";
import { MAYA } from "../components/writers";
import "./official-updates.css";

export const dynamic = "force-dynamic";
const base = "https://myrpg.io";

function displayDate(value?: string | null) {
  return value && !Number.isNaN(Date.parse(value))
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(value))
    : "Not recorded";
}

function sourceHost(value: string) {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

export default async function OfficialUpdates() {
  let entries: any[] = [];
  try {
    const db = getDb();
    const [published, sourceRows, runs, publishedGames, visuals] = await Promise.all([
      db.select().from(articles).where(eq(articles.status, "published")).orderBy(desc(articles.publishedAt)),
      db.select().from(sources).where(eq(sources.approved, true)),
      db.select().from(agentRuns),
      db.select().from(games).where(eq(games.published, true)),
      db.select().from(mediaAssets).where(and(eq(mediaAssets.status, "approved"), eq(mediaAssets.placement, "lead"))),
    ]);
    const approvedDomains = new Set(sourceRows.map((source) => source.domain.toLowerCase()));
    const gamesBySlug = new Map(publishedGames.map((game) => [game.slug, game]));
    const intakeByArticle = new Map<string, any>();
    for (const run of runs) {
      if (!run.itemId || !run.outputJson) continue;
      try {
        const intake = JSON.parse(run.outputJson);
        if (intake.manualIntake && intake.sourceDate) intakeByArticle.set(run.itemId, intake);
      } catch { /* Invalid job data never becomes public content. */ }
    }
    const visualByArticle = new Map<string, any>();
    for (const visual of visuals) if (visual.articleId && !visualByArticle.has(visual.articleId)) visualByArticle.set(visual.articleId, visual);
    entries = published
      .filter((article) => approvedDomains.has(sourceHost(article.sourceUrl)) && intakeByArticle.get(article.id)?.sourceDate && intakeByArticle.get(article.id)?.gamerTakeaway)
      .map((article) => {
        const intake = intakeByArticle.get(article.id);
        return { article, intake, related: intake?.gameSlug ? gamesBySlug.get(intake.gameSlug) || null : null, visual: visualByArticle.get(article.id) };
      });
  } catch { /* A safe empty state is preferable to exposing a storage error. */ }

  const groups = new Map<string, typeof entries>();
  for (const entry of entries) {
    const key = entry.related ? entry.related.name : "General MMO updates";
    groups.set(key, [...(groups.get(key) || []), entry]);
  }

  return <PublicPage className="official-updates-page">
    <nav aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><a href="/news">News</a><span aria-hidden="true">/</span><span>Official updates</span></nav>
    <header className="updates-hero">
      <p>MYRPG / OFFICIAL UPDATES</p>
      <h1>Signals worth<br /><em>stopping for.</em></h1>
      <div className="updates-hero-signals"><span>OFFICIAL SOURCES</span><span>HUMAN REVIEWED</span><span>CHRONOLOGICAL</span></div>
      <p className="updates-hero-lede">A clean field journal for material MMO news. Every entry links back to the original official announcement—no rumor feed, no automated publishing.</p>
    </header>
    {entries.length ? <div className="updates-stream">{[...groups.entries()].map(([group, items]) => <section className="updates-group" key={group}>
      <header><div><p>{group === "General MMO updates" ? "GENERAL SIGNAL" : "GAME DOSSIER"}</p><h2>{group}</h2></div><span>{items.length} {items.length === 1 ? "update" : "updates"}</span></header>
      <ol>{items.map(({ article, intake, related, visual }, index) => <li key={article.id}>
        <article className={`update-entry ${index === 0 ? "update-entry-latest" : ""}`}>
          <div className="update-entry-date"><span>{article.retrospective ? "ARCHIVE" : "FIELD NOTE"}</span><time dateTime={article.publishedAt || undefined}>{displayDate(article.publishedAt)}</time></div>
          <EditorialVisual title={article.title} category="Official update" label="Human-reviewed coverage" image={visual} themeKey={article.editorialGraphic} eager={index === 0} presentation="card" />
          <div className="update-entry-copy">
            <p className="update-entry-kicker">{related ? <a href={`/games/${related.slug}`}>{related.name}</a> : "Official MMO coverage"}</p>
            <h3><a href={`/articles/${article.slug}`}>{article.title}</a></h3>
            <p className="update-entry-summary">{article.summary}</p>
            <p className="update-entry-takeaway"><strong>{article.retrospective ? "Why it matters" : "Player takeaway"}</strong>{article.gamerTakeaway || intake.gamerTakeaway}</p>
            <div className="update-entry-meta"><a href={`/writers#${MAYA.slug}`}>{MAYA.name}</a><span>Announced {displayDate(article.sourceDate || intake?.sourceDate)}</span><span>Checked {displayDate(article.factCheckedAt)}</span><a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">Official source ↗</a></div>
            <a className="update-entry-read" href={`/articles/${article.slug}`}>Read the full update <span aria-hidden="true">→</span></a>
          </div>
        </article>
      </li>)}</ol>
    </section>)}</div> : <section className="updates-empty"><p>OFFICIAL UPDATES / STANDING BY</p><h2>No field notes are live yet.</h2><p>MyRPG adds an update only after a direct official source is reviewed and an Owner publishes it.</p><a href="/news">Visit MMO news <span aria-hidden="true">→</span></a></section>}
    <ExploreNext links={[{ href: "/news", label: "MMO news", note: "Read source-linked editorial coverage." }, { href: "/mmo-radar", label: "MMO Radar", note: "See factual directory coverage at a glance." }, { href: "/games", label: "Games", note: "Browse human-approved MMO profiles." }, { href: "/calendar", label: "Release calendar", note: "See owner-published date records." }, { href: "/compare", label: "Compare games", note: "Compare visible profile fields." }, { href: "/find-my-mmo", label: "Find My MMO", note: "Match verified fields to your preferences." }]} />
  </PublicPage>;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const title = "Official MMO Updates | MyRPG.IO"; const description = "Chronological, source-linked official MMO updates reviewed and published by MyRPG.";
  return { title, description, alternates: { canonical: `${base}/official-updates` }, openGraph: { title, description, url: `${base}/official-updates` }, robots: Object.keys(query).length ? { index: false, follow: true } : { index: true, follow: true } };
}
