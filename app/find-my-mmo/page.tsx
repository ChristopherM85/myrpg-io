import { eq } from "drizzle-orm";
import { getDb } from "../../db";
import { games } from "../../db/schema";
import { PublicFooter, PublicHeader } from "../components/PublicChrome";

export const dynamic = "force-dynamic";
const base = "https://myrpg.io";
type Choice = "" | string;
type Search = { activity?: Choice; focus?: Choice; combat?: Choice; model?: Choice; setting?: Choice; platform?: Choice; commitment?: Choice; availability?: Choice };

const labels: Record<keyof Search, string> = { activity: "Play style", focus: "Focus", combat: "Combat", model: "Business model", setting: "Setting", platform: "Platform", commitment: "Time commitment", availability: "Availability" };
const options: Record<keyof Search, [string, string][]> = {
  activity: [["", "Any play style"], ["solo", "Solo"], ["duo", "Duo"], ["guild", "Guild / social"]],
  focus: [["", "Any focus"], ["pve", "PvE"], ["pvp", "PvP"], ["balanced", "Balanced"]],
  combat: [["", "Any combat"], ["action", "Action"], ["tab-target", "Tab-target"], ["tactical", "Tactical"]],
  model: [["", "Any business model"], ["free-to-play", "Free-to-play"], ["buy-to-play", "Buy-to-play"], ["subscription", "Subscription"]],
  setting: [["", "Any setting"], ["fantasy", "Fantasy"], ["sci-fi", "Sci-fi"], ["anime", "Anime"], ["historical", "Historical"]],
  platform: [["", "Any platform"], ["pc", "PC"], ["console", "Console"], ["browser", "Browser"], ["mobile", "Mobile"]],
  commitment: [["", "Any time commitment"], ["casual", "Casual"], ["regular", "Regular"], ["hardcore", "Hardcore"]],
  availability: [["live", "Live games only"], ["upcoming", "Include upcoming"]],
};
function normal(value: unknown) { return String(value ?? "").toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ").trim(); }
function matches(value: unknown, wanted: Choice) { if (!wanted) return false; const field = normal(value); const query = normal(wanted); if (query === "guild") return field.includes("guild") || field.includes("social"); if (query === "duo") return field.includes("duo") || field.includes("small group"); if (query === "balanced") return field.includes("pve") && field.includes("pvp"); return field.includes(query); }
function scoreGame(game: any, search: Search) { const checks: [keyof Search, unknown, string][] = [["activity", game.activity, "Play style"], ["focus", game.focus, "Focus"], ["combat", game.combat, "Combat"], ["model", game.businessModel, "Business model"], ["setting", game.setting, "Setting"], ["platform", game.platforms, "Platform"], ["commitment", game.timeCommitment, "Time commitment"]]; const chips: string[] = []; let score = 0; for (const [key, value, label] of checks) if (search[key] && matches(value, search[key])) { score += 1; chips.push(`${label}: ${options[key].find(([option]) => option === search[key])?.[1]}`); } return { score, chips }; }

export default async function FindMyMmo({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  let rows: any[] = [];
  try { rows = await getDb().select().from(games).where(eq(games.published, true)); } catch { /* A public empty state is safer than exposing an internal error. */ }
  const eligible = search.availability === "upcoming" ? rows : rows.filter((game) => normal(game.status) === "live");
  const results = eligible.map((game) => ({ game, ...scoreGame(game, search) })).filter((result) => result.score > 0).sort((a, b) => b.score - a.score || a.game.name.localeCompare(b.game.name)).slice(0, 5);
  const hasCriteria = Object.entries(search).some(([key, value]) => key !== "availability" && Boolean(value));
  return <><PublicHeader /><main style={{ maxWidth: 1100, margin: "0 auto", padding: "68px 24px 96px", minHeight: "60vh", fontFamily: "Arial, Helvetica, sans-serif" }}>
    <nav aria-label="Breadcrumb" style={{ fontSize: 12, color: "#929aad", marginBottom: 28 }}><a href="/" style={{ color: "#76f5e3" }}>Home</a> / <a href="/games" style={{ color: "#76f5e3" }}>Games</a> / Find My MMO</nav>
    <p style={{ color: "#76f5e3", fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>MYRPG / DISCOVERY TOOL</p>
    <h1 style={{ fontSize: "clamp(42px,7vw,76px)", lineHeight: .94, letterSpacing: -3, margin: "14px 0 18px" }}>Find an MMO that fits your time.</h1>
    <p style={{ maxWidth: 680, color: "#aeb5c4", lineHeight: 1.65 }}>A factual matcher built from human-approved game records. It does not use player counts, ratings, popularity claims, or generated recommendations.</p>
    <form method="get" style={{ marginTop: 38, padding: 24, background: "#121622", border: "1px solid #2a3041", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(205px,1fr))", gap: 16 }}>{(Object.keys(options) as (keyof Search)[]).map((key) => <label key={key} style={{ display: "grid", gap: 7, fontSize: 12, fontWeight: 700, color: "#d7dbe5" }}>{labels[key]}<select name={key} defaultValue={search[key] ?? (key === "availability" ? "live" : "")} style={{ background: "#0d1018", border: "1px solid #31394d", color: "#f0f0ed", padding: 12, borderRadius: 2 }}>{options[key].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>)}<div style={{ display: "flex", alignItems: "end" }}><button type="submit" style={{ width: "100%", padding: 13, border: 0, background: "#76f5e3", color: "#06100f", fontWeight: 800 }}>Show my matches</button></div></form>
    {!rows.length ? <section style={notice}><h2>No approved games are ready to match yet.</h2><p>MyRPG only matches human-approved factual profiles. Check back as the reviewed directory grows.</p></section> : !hasCriteria ? <section style={goldNotice}><h2>Start with a few preferences.</h2><p>Choose what matters most, then MyRPG will show up to five published profiles that match those verified fields.</p></section> : results.length ? <section style={{ marginTop: 42 }}><p style={{ color: "#76f5e3", fontSize: 11, letterSpacing: 1.5, fontWeight: 800 }}>UP TO FIVE FACTUAL MATCHES</p><div style={{ display: "grid", gap: 14 }}>{results.map(({ game, chips }) => <article key={game.id} style={{ border: "1px solid #2a3041", background: "#121622", padding: 24 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start", flexWrap: "wrap" }}><div><p style={{ margin: 0, color: "#c9a666", fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>HUMAN-APPROVED PROFILE</p><h2 style={{ fontSize: 28, margin: "8px 0" }}><a href={`/games/${game.slug}`} style={{ color: "#f0f0ed" }}>{game.name}</a></h2><p style={{ margin: 0, color: "#aeb5c4" }}>{game.status} · {game.platforms} · {game.businessModel}</p></div><a href={`/games/${game.slug}`} style={{ color: "#76f5e3", fontWeight: 800, fontSize: 13 }}>View profile →</a></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 18 }}>{chips.map((chip) => <span key={chip} style={{ fontSize: 11, color: "#76f5e3", border: "1px solid rgba(118,245,227,.4)", padding: "5px 8px" }}>{chip}</span>)}</div><p style={{ fontSize: 12, color: "#929aad", marginBottom: 0 }}>Fact-checked: {game.factCheckedAt || "Not recorded"} · <a href={game.sourceUrl} style={{ color: "#76f5e3" }}>Official source</a></p></article>)}</div></section> : <section style={goldNotice}><h2>No factual matches yet.</h2><p>No published profile currently matches those exact verified fields. Try widening one preference, or check the directory for the latest reviewed records.</p><a href="/games" style={{ color: "#76f5e3", fontWeight: 800 }}>Browse the game directory →</a></section>}
    <section style={{ marginTop: 42, padding: 22, borderTop: "1px solid #2a3041", color: "#929aad", fontSize: 12, lineHeight: 1.6 }}><b style={{ color: "#f0f0ed" }}>How matching works.</b> Each displayed chip corresponds to a visible, owner-entered game field. Missing activity or time-commitment fields are not guessed and are flagged in the Owner Quality Report.</section>
  </main><PublicFooter /></>;
}

const notice = { marginTop: 38, padding: 28, borderLeft: "3px solid #76f5e3", background: "#111722", color: "#aeb5c4", lineHeight: 1.6 };
const goldNotice = { ...notice, borderLeft: "3px solid #c9a666" };
export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }) { const query = await searchParams; const hasQuery = Object.values(query).some(Boolean); return { title: "Find My MMO | MyRPG.IO", description: "Match your MMO preferences with human-approved factual game records.", alternates: { canonical: `${base}/find-my-mmo` }, robots: hasQuery ? { index: false, follow: true } : { index: true, follow: true } }; }
