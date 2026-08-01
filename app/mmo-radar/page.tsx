import { desc, eq } from "drizzle-orm";
import { getDb } from "../../db";
import { games } from "../../db/schema";
import { ExploreNext } from "../components/ExploreNext";
import { PublicPage } from "../components/PublicChrome";

export const dynamic = "force-dynamic";
const base = "https://myrpg.io";
const statuses = ["live", "early access", "announced", "sunset"] as const;

function day(value?: string | null) { return value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "Not recorded"; }
function includes(value: unknown, term: string) { return String(value || "").toLowerCase().includes(term); }

export default async function MmoRadar() {
  let published: any[] = [];
  try { published = await getDb().select().from(games).where(eq(games.published, true)).orderBy(desc(games.factCheckedAt)); } catch { /* The public empty state deliberately reveals no internal failure. */ }
  const confirmed = published.filter((game) => game.releaseDateConfidence === "confirmed" && game.releaseDate).sort((a, b) => String(a.releaseDate).localeCompare(String(b.releaseDate)));
  const byPlatform = ["PC", "Console", "Browser", "Mobile"].map((label) => ({ label, games: published.filter((game) => includes(game.platforms, label.toLowerCase())) }));
  const playStyles = [["Solo", "solo"], ["Duo", "duo"], ["Guild / social", "guild"]] as const;
  return <PublicPage><nav aria-label="Breadcrumb"><a href="/">Home</a> / MMO Radar</nav><p style={eyebrow}>MYRPG / MMO INTELLIGENCE</p><h1 style={heading}>MMO Radar</h1><p style={lede}>A factual overview of owner-published MMO profiles. Every link below uses visible structured data, official source citations, and human approval—never rankings or popularity claims.</p>
    <section style={statusGrid} aria-label="Game status overview">{statuses.map((status) => { const rows = published.filter((game) => String(game.status).toLowerCase() === status); return <article key={status} style={metric}><small>{status.toUpperCase()}</small><strong>{rows.length}</strong><span>{rows.length === 1 ? "published profile" : "published profiles"}</span><div>{rows.slice(0, 3).map((game) => <a key={game.id} href={`/games/${game.slug}`}>{game.name}</a>) || null}</div></article>; })}</section>
    <RadarSection title="Recently fact-checked" note="Ordered by the stored fact-check date; this is not a claim about real-time game activity." rows={published.slice(0, 6)} empty="No published game profiles have a stored fact-check date yet." />
    <RadarSection title="Confirmed upcoming releases" note="Only profiles with an owner-entered confirmed date appear here." rows={confirmed.slice(0, 5)} empty="No owner-published profiles currently have a confirmed upcoming release date." release />
    <section style={section}><p style={eyebrow}>WHERE YOU CAN PLAY</p><h2 style={h2}>Games by platform</h2><div style={grid}>{byPlatform.map(({ label, games: rows }) => <article key={label} style={card}><small>{label.toUpperCase()}</small><h3>{rows.length ? `${rows.length} published ${rows.length === 1 ? "profile" : "profiles"}` : "No profiles yet"}</h3>{rows.length ? <div style={list}>{rows.slice(0, 4).map((game) => <a key={game.id} href={`/games/${game.slug}`}>{game.name}</a>)}</div> : <p style={muted}>Profiles appear only after a human-approved factual entry includes this platform.</p>}</article>)}</div></section>
    <RadarSection title="Browser MMORPGs" note="Classified only when the published platform field says browser." rows={published.filter((game) => includes(game.platforms, "browser")).slice(0, 5)} empty="No published browser MMORPG profiles yet." />
    <section style={section}><p style={eyebrow}>PLAY STYLE</p><h2 style={h2}>Structured fit, not a recommendation score</h2><div style={grid}>{playStyles.map(([label, term]) => { const rows = published.filter((game) => includes(game.activity, term) || (term === "guild" && includes(game.activity, "social"))); return <article key={label} style={card}><small>{label.toUpperCase()}</small><h3>{label} play</h3>{rows.length ? <div style={list}>{rows.slice(0, 4).map((game) => <a key={game.id} href={`/games/${game.slug}`}>{game.name}</a>)}</div> : <p style={muted}>No published profile has a verified {label.toLowerCase()} activity field yet. MyRPG does not infer it.</p>}</article>; })}</div></section>
    <section style={transparency}><strong>How MMO Radar works</strong><p>MyRPG uses structured official-source data and human approval. It does not autonomously publish coverage, fetch live availability, or rank games.</p></section>
    <ExploreNext links={[{ href: "/games", label: "Browse games", note: "Open the full factual directory." }, { href: "/calendar", label: "Release calendar", note: "See owner-published date records." }, { href: "/compare", label: "Compare profiles", note: "Place up to three visible fields side by side." }, { href: "/find-my-mmo", label: "Find My MMO", note: "Match verified fields to your preferences." }]} />
  </PublicPage>;
}

function RadarSection({ title, note, rows, empty, release = false }: { title: string; note: string; rows: any[]; empty: string; release?: boolean }) { return <section style={section}><p style={eyebrow}>FACTUAL OVERVIEW</p><h2 style={h2}>{title}</h2><p style={muted}>{note}</p>{rows.length ? <div style={grid}>{rows.map((game) => <article key={game.id} style={card}><small>{String(game.status).toUpperCase()}</small><h3><a href={`/games/${game.slug}`}>{game.name}</a></h3><p style={muted}>{game.platforms} · {game.businessModel}</p><p style={muted}>{release ? `Confirmed release: ${game.releaseDate}` : `Fact-checked: ${day(game.factCheckedAt)}`}</p><a href={`/games/${game.slug}`} style={accent}>Open profile →</a></article>)}</div> : <article style={emptyCard}><h3>Nothing to list yet</h3><p>{empty}</p><a href="/games" style={accent}>Browse the directory →</a></article>}</section>; }

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { const query = await searchParams; return { title: "MMO Radar | MyRPG.IO", description: "A human-approved factual overview of published MMO profiles, release dates, platforms, and play styles.", alternates: { canonical: `${base}/mmo-radar` }, robots: Object.keys(query).length ? { index: false, follow: true } : { index: true, follow: true } }; }

const eyebrow = { color: "#76f5e3", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginTop: 30 };
const heading = { fontSize: "clamp(2.8rem,7vw,5.4rem)", letterSpacing: "-.06em", margin: "12px 0" };
const lede = { color: "#aeb6c7", lineHeight: 1.65, maxWidth: 760, fontSize: 17 };
const section = { marginTop: 52 };
const h2 = { fontSize: "clamp(1.7rem,3.2vw,2.4rem)", margin: "8px 0" };
const muted = { color: "#aeb6c7", lineHeight: 1.6, fontSize: 13 };
const accent = { color: "#76f5e3", fontWeight: 800, textDecoration: "none", fontSize: 12 };
const statusGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginTop: 38 };
const metric = { border: "1px solid #2a3041", background: "#121622", padding: 18, display: "grid", gap: 7 };
const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(215px,1fr))", gap: 13, marginTop: 22 };
const card = { border: "1px solid #2a3041", background: "#121622", padding: 20 };
const list = { display: "grid", gap: 8, marginTop: 13 };
const emptyCard = { borderLeft: "3px solid #c9a666", background: "#101521", padding: "20px 22px", marginTop: 22 };
const transparency = { marginTop: 52, borderLeft: "3px solid #76f5e3", padding: "20px 22px", background: "#101521", color: "#b9c3d3", lineHeight: 1.6 };
