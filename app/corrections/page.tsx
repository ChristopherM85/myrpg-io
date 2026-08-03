import { desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { articles, games, publicCorrections } from "../../db/schema";
import { PublicPage } from "../components/PublicChrome";

export const dynamic = "force-dynamic";
const base = "https://myrpg.io";
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value)) : "Not recorded";

export default async function Corrections() {
  let entries: any[] = []; try {
    const db = getDb(); const [rows, articleRows, gameRows] = await Promise.all([db.select().from(publicCorrections).where(eq(publicCorrections.published, true)).orderBy(desc(publicCorrections.publishedAt)), db.select().from(articles).where(eq(articles.status, "published")), db.select().from(games).where(eq(games.published, true))]);
    const articleMap = new Map(articleRows.map((item) => [item.id, { title: item.title, href: `/articles/${item.slug}` }])); const gameMap = new Map(gameRows.map((item) => [item.id, { title: item.name, href: `/games/${item.slug}` }]));
    entries = rows.map((item) => ({ ...item, target: item.targetType === "article" ? articleMap.get(item.targetId) : gameMap.get(item.targetId) })).filter((item) => item.target);
  } catch {}
  return <PublicPage className="corrections-page"><nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/editorial-standards">Editorial standards</a> / Corrections</nav><p className="home-eyebrow">MYRPG / PUBLIC RECORD</p><h1>Corrections &amp; updates</h1><p>Material corrections, factual updates, and clarifications to published MyRPG coverage. Internal review notes and private records are never exposed.</p>{entries.length ? <section className="corrections-log">{entries.map((entry) => <article key={entry.id}><div><span>{entry.correctionType}</span><time dateTime={entry.publishedAt}>{date(entry.publishedAt)}</time></div><h2><a href={entry.target.href}>{entry.target.title}</a></h2><h3>What changed</h3><p>{entry.summary}</p><h3>Why</h3><p>{entry.reason}</p><p><a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">Current approved source ↗</a> · Human-reviewed and Owner-published</p></article>)}</section> : <section className="corrections-empty"><h2>No published corrections or material updates</h2><p>When a material public fact changes or requires correction, MyRPG records it here after human review.</p></section>}</PublicPage>;
}

export const metadata = { title: "Editorial Corrections & Updates | MyRPG.IO", description: "MyRPG's public log of material corrections, factual updates, and clarifications.", alternates: { canonical: `${base}/corrections` }, robots: { index: true, follow: true } };
