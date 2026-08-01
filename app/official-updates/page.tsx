import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { agentRuns, articles, games, mediaAssets, sources } from "../../db/schema";
import { ExploreNext } from "../components/ExploreNext";
import { EditorialVisual } from "../components/EditorialVisual";
import { PublicPage } from "../components/PublicChrome";
import { MAYA } from "../components/writers";

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

  return <PublicPage>
    <nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/news">News</a> / Official updates</nav>
    <p style={eyebrow}>MYRPG / OFFICIAL UPDATES</p>
    <h1 style={heading}>Official updates</h1>
    <p style={lede}>A chronological timeline of Owner-published MMO coverage with direct approved official sources. It is not a live-monitoring feed.</p>
    {entries.length ? [...groups.entries()].map(([group, items]) => <section key={group} style={section}>
      <p style={eyebrow}>{group === "General MMO updates" ? "GENERAL COVERAGE" : "RELATED GAME"}</p>
      <h2 style={h2}>{group}</h2>
      <div style={timeline}>{items.map(({ article, intake, related, visual }) => <article key={article.id} style={entryCard}>
        <p style={{ ...eyebrow, marginTop: 0 }}>PUBLISHED {displayDate(article.publishedAt)}</p>
        <h3 style={h3}><a href={`/articles/${article.slug}`}>{article.title}</a></h3>
        {related && <p style={muted}><a href={`/games/${related.slug}`}>Related game: {related.name}</a></p>}
        <EditorialVisual title={article.title} category="Official update" label="Human-reviewed coverage" image={visual} eager={false} />
        <p style={muted}>{article.summary}</p>
        <dl style={facts}>
          <div><dt>Writer</dt><dd><a href={`/writers#${MAYA.slug}`}>{MAYA.name} · {MAYA.title}</a></dd></div>
          <div><dt>Source date</dt><dd>{displayDate(intake?.sourceDate)}</dd></div>
          <div><dt>Fact-check</dt><dd>{displayDate(article.factCheckedAt)}</dd></div>
          <div><dt>Primary source</dt><dd><a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">Official source ↗</a></dd></div>
        </dl>
        <p style={takeaway}><strong>Gamer takeaway:</strong> {intake.gamerTakeaway}</p>
        <a href={`/articles/${article.slug}`} style={accent}>Read the full update →</a>
      </article>)}</div>
    </section>) : <section style={empty}><h2>No official updates are published yet</h2><p>MyRPG adds this timeline only after an official source has been reviewed and an Owner has manually published the article.</p><a href="/news" style={accent}>Visit MMO news →</a></section>}
    <ExploreNext links={[{ href: "/news", label: "MMO news", note: "Read source-linked editorial coverage." }, { href: "/mmo-radar", label: "MMO Radar", note: "See factual directory coverage at a glance." }, { href: "/games", label: "Games", note: "Browse human-approved MMO profiles." }, { href: "/calendar", label: "Release calendar", note: "See owner-published date records." }, { href: "/compare", label: "Compare games", note: "Compare visible profile fields." }, { href: "/find-my-mmo", label: "Find My MMO", note: "Match verified fields to your preferences." }]} />
  </PublicPage>;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const title = "Official MMO Updates | MyRPG.IO"; const description = "Chronological, source-linked official MMO updates reviewed and published by MyRPG.";
  return { title, description, alternates: { canonical: `${base}/official-updates` }, openGraph: { title, description, url: `${base}/official-updates` }, robots: Object.keys(query).length ? { index: false, follow: true } : { index: true, follow: true } };
}

const eyebrow = { color: "#76f5e3", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginTop: 30 };
const heading = { fontSize: "clamp(2.8rem,7vw,5.4rem)", letterSpacing: "-.06em", margin: "12px 0" };
const lede = { color: "#aeb6c7", lineHeight: 1.65, maxWidth: 760, fontSize: 17 };
const section = { marginTop: 50 };
const h2 = { fontSize: "clamp(1.7rem,3.2vw,2.4rem)", margin: "8px 0" };
const timeline = { display: "grid", gap: 16, marginTop: 22 };
const entryCard = { border: "1px solid #2a3041", borderLeft: "3px solid #76f5e3", background: "#121622", padding: "22px clamp(18px,3vw,30px)" };
const h3 = { margin: "7px 0 10px", fontSize: "clamp(1.35rem,3vw,2rem)", lineHeight: 1.1 };
const muted = { color: "#aeb6c7", lineHeight: 1.6, fontSize: 14 };
const facts = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 12, margin: "20px 0", paddingTop: 16, borderTop: "1px solid #2a3041" };
const takeaway = { margin: "0 0 18px", paddingLeft: 12, borderLeft: "2px solid #c9a666", color: "#cbd2df", fontSize: 13, lineHeight: 1.55 };
const accent = { color: "#76f5e3", fontWeight: 800, textDecoration: "none", fontSize: 12 };
const empty = { borderLeft: "3px solid #c9a666", background: "#101521", padding: "22px", marginTop: 36 };
