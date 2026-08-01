import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { requireChatGPTUser } from "../../../../chatgpt-auth";
import { getDb } from "../../../../../db";
import { auditEvents, games, mediaAssets, sources, users } from "../../../../../db/schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Game preview | MyRPG Director Console", robots: { index: false, follow: false } };

const normalized = (value?: string | null) => { try { const url = new URL(value || ""); url.hash = ""; url.hostname = url.hostname.toLowerCase().replace(/^www\./, ""); for (const key of [...url.searchParams.keys()]) if (key.startsWith("utm_")) url.searchParams.delete(key); return url.toString().replace(/\/$/, ""); } catch { return ""; } };
const factCheckAge = (value?: string | null) => { const age = value ? Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 86400000)) : null; return age === null || Number.isNaN(age) ? "Missing" : `${age} day${age === 1 ? "" : "s"} ago`; };

export default async function GamePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const user = await requireChatGPTUser(`/admin/preview/game/${encodeURIComponent(id)}`); let packet: any = null;
  try {
    const db = getDb(); const account = (await db.select().from(users).where(eq(users.email, user.email)).limit(1))[0]; if (account?.role !== "owner") redirect("/admin/games");
    const game = (await db.select().from(games).where(eq(games.id, id)).limit(1))[0];
    if (game) {
      const normalizedSourceUrl = normalized(game.sourceUrl); const host = new URL(normalizedSourceUrl || game.officialUrl || "https://invalid.local").hostname.toLowerCase().replace(/^www\./, "");
      const [source, audits, visual, allGames] = await Promise.all([
        db.select().from(sources).where(eq(sources.domain, host)).limit(1),
        db.select().from(auditEvents).where(and(eq(auditEvents.entityType, "game"), eq(auditEvents.entityId, game.id))).orderBy(desc(auditEvents.createdAt)),
        db.select().from(mediaAssets).where(and(eq(mediaAssets.gameId, game.id), eq(mediaAssets.placement, "lead"), eq(mediaAssets.status, "approved"))).limit(1),
        db.select().from(games),
      ]);
      packet = { game, source: source[0], audits, visual: visual[0], normalizedSourceUrl, duplicate: allGames.find((candidate) => candidate.id !== game.id && (candidate.slug === game.slug || normalized(candidate.sourceUrl) === normalizedSourceUrl)) };
    }
  } catch { packet = null; }
  if (!packet) return <main style={shell}><h1>Preview unavailable</h1><p>This private game record is missing or unavailable to this Owner account.</p><a href="/admin/games" style={accent}>Back to Game Management</a></main>;
  const { game, source, audits, visual, normalizedSourceUrl, duplicate } = packet;
  const required = [game.name, game.slug, game.status, game.platforms, game.businessModel, game.combat, game.setting, game.focus, game.releaseDate, game.officialUrl, game.sourceUrl, game.factCheckedAt, game.directorySummary];
  const blockers = [required.some((value) => !value) && "One or more required factual fields are incomplete", !source?.approved && "Official source is not approved", duplicate && `Duplicate safeguard: matches ${duplicate.name}`, game.reviewStatus !== "approved" && "Owner approval has not been recorded", !visual && "No approved lead visual - branded fallback will be used"].filter((item): item is string => Boolean(item));
  return <main style={shell}><p style={kicker}>OWNER-ONLY GAME PREVIEW · NOINDEX</p><h1 style={heading}>{game.name}</h1><p style={muted}>Slug: <code>{game.slug}</code> · Review status: <strong>{game.reviewStatus}</strong> · Publication: {game.published ? "Published" : "Private"}</p><p><a href="/admin/games" style={accent}>Back to Game Management</a></p><Section title="Publish readiness"><ul>{blockers.length ? blockers.map((blocker: string) => <li key={blocker}>{blocker}</li>) : <li>All current game readiness checks pass.</li>}</ul></Section><Section title="Provenance"><div style={grid}>{[["Approved domain",source?.approved ? source.domain : "Not approved"],["Normalized official source",normalizedSourceUrl || "Invalid source URL"],["Duplicate result",duplicate ? `Matches ${duplicate.name}` : "Clear"],["Fact-check age",factCheckAge(game.factCheckedAt)],["Source date","Not stored for game profiles"]].map(([label,value]) => <article style={card} key={String(label)}><small>{label}</small><p>{value}</p></article>)}</div></Section><Section title="Factual record"><div style={grid}>{[["Status",game.status],["Platforms",game.platforms],["Business model",game.businessModel],["Combat",game.combat],["Setting",game.setting],["PvE / PvP",game.focus],["Activity fit",game.activity || "Not recorded"],["Time commitment",game.timeCommitment || "Not recorded"],["Release",`${game.releaseDate} (${game.releaseDateConfidence})`]].map(([label,value]) => <article style={card} key={String(label)}><small>{label}</small><p>{value}</p></article>)}</div><p style={body}>{game.directorySummary || "No directory summary yet."}</p></Section><Section title="Sources & visual"><p><a href={game.officialUrl} target="_blank" rel="noopener noreferrer" style={accent}>Official website</a></p><p><a href={game.sourceUrl} target="_blank" rel="noopener noreferrer" style={accent}>Approved source citation</a></p><p style={muted}>Source approved: {source?.approved ? "Yes" : "No"} · Fact-checked: {game.factCheckedAt || "Missing"}</p><article style={card}>{visual ? <><strong>Approved visual</strong><p>{visual.altText}</p></> : <><strong>MyRPG editorial fallback</strong><p>MyRPG editorial graphic - not gameplay.</p></>}</article></Section><Section title="Audit trail"><article style={card}>{audits.length ? <ul>{audits.map((audit: any) => <li key={audit.id}>{audit.action.replace(/_/g," ")} · {audit.actorEmail} · {audit.createdAt}</li>)}</ul> : <p>No audit events have been recorded.</p>}</article></Section></main>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section style={section}><h2 style={{ fontSize: 23, margin: "0 0 12px" }}>{title}</h2>{children}</section>; }
const shell = { maxWidth: 1040, margin: "0 auto", padding: "56px 24px 96px", minHeight: "100vh", background: "#090b12", color: "#edf3f5" }; const heading = { fontSize: "clamp(2.25rem, 6vw, 4.5rem)", letterSpacing: "-0.06em", margin: "0 0 16px" }; const kicker = { color: "#76f5e3", fontWeight: 800, fontSize: 12, letterSpacing: 1.2 }; const muted = { color: "#c0cada", lineHeight: 1.6 }; const body = { color: "#e0e7f1", lineHeight: 1.8, fontSize: 17 }; const accent = { color: "#76f5e3", wordBreak: "break-word" as const }; const section = { borderTop: "1px solid #39435a", paddingTop: 28, marginTop: 34 }; const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }; const card = { border: "1px solid #39435a", background: "#121622", padding: 18, color: "#e0e7f1" };
