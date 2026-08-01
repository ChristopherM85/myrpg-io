import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { requireChatGPTUser } from "../../../../chatgpt-auth";
import { getDb } from "../../../../../db";
import { auditEvents, calendarItems, games, sources, users } from "../../../../../db/schema";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Calendar preview | MyRPG Director Console", robots: { index: false, follow: false } };

export default async function CalendarPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireChatGPTUser(`/admin/preview/calendar/${encodeURIComponent(id)}`);
  let packet: any = null;
  try {
    const db = getDb();
    const account = (await db.select().from(users).where(eq(users.email, user.email)).limit(1))[0];
    if (account?.role !== "owner") redirect("/admin/games");
    const item = (await db.select().from(calendarItems).where(eq(calendarItems.id, id)).limit(1))[0];
    if (item) {
      const host = new URL(item.sourceUrl).hostname.toLowerCase().replace(/^www\./, "");
      const [game, source, audits] = await Promise.all([
        db.select().from(games).where(eq(games.id, item.gameId)).limit(1),
        db.select().from(sources).where(eq(sources.domain, host)).limit(1),
        db.select().from(auditEvents).where(and(eq(auditEvents.entityType, "calendar"), eq(auditEvents.entityId, item.id))).orderBy(desc(auditEvents.createdAt)),
      ]);
      packet = { item, game: game[0], source: source[0], audits };
    }
  } catch { packet = null; }
  if (!packet) return <main style={shell}><h1>Preview unavailable</h1><p>This private calendar record is missing or unavailable to this Owner account.</p><a href="/admin/games" style={accent}>Back to Game Management</a></main>;
  const { item, game, source, audits } = packet;
  const blockers = [!game && "Linked game record is missing", (!item.title || !item.dateLabel || !item.factCheckedAt) && "Incomplete calendar fields", !source?.approved && "Official source is not approved", item.dateConfidence === "unconfirmed" && "Release-date confidence is unresolved", item.reviewStatus !== "approved" && "Owner approval has not been recorded"].filter((item): item is string => Boolean(item));
  return <main style={shell}><p style={kicker}>OWNER-ONLY CALENDAR PREVIEW · NOINDEX</p><h1 style={heading}>{item.title}</h1><p style={muted}>Review status: <strong>{item.reviewStatus}</strong> · Publication: {item.published ? "Published" : "Private"}</p><p><a href="/admin/games" style={accent}>Back to Game Management</a></p><Section title="Publish readiness"><ul>{blockers.length ? blockers.map((blocker) => <li key={blocker}>{blocker}</li>) : <li>All current calendar readiness checks pass.</li>}</ul></Section><Section title="Release detail"><article style={card}><small>DATE LABEL</small><p style={body}>{item.dateLabel}</p><small>CONFIDENCE</small><p style={body}>{item.dateConfidence}</p>{game && <p><a href={`/admin/preview/game/${game.id}`} style={accent}>View linked game packet: {game.name}</a></p>}</article></Section><Section title="Source & fact check"><article style={card}><p><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" style={accent}>Official source citation</a></p><p style={muted}>Source approved: {source?.approved ? "Yes" : "No"} · Fact-checked: {item.factCheckedAt || "Missing"}</p></article></Section><Section title="Audit trail"><article style={card}>{audits.length ? <ul>{audits.map((audit: any) => <li key={audit.id}>{audit.action.replace(/_/g, " ")} · {audit.actorEmail} · {audit.createdAt}</li>)}</ul> : <p>No audit events have been recorded.</p>}</article></Section></main>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section style={section}><h2 style={{ fontSize: 23, margin: "0 0 12px" }}>{title}</h2>{children}</section>; }
const shell = { maxWidth: 1040, margin: "0 auto", padding: "56px 24px 96px", minHeight: "100vh", background: "#090b12", color: "#edf3f5" }; const heading = { fontSize: "clamp(2.25rem, 6vw, 4.5rem)", letterSpacing: "-0.06em", margin: "0 0 16px" }; const kicker = { color: "#76f5e3", fontWeight: 800, fontSize: 12, letterSpacing: 1.2 }; const muted = { color: "#aeb6c7", lineHeight: 1.6 }; const body = { color: "#d8deea", lineHeight: 1.8, fontSize: 17 }; const accent = { color: "#76f5e3", wordBreak: "break-word" as const }; const section = { borderTop: "1px solid #2a3041", paddingTop: 28, marginTop: 34 }; const card = { border: "1px solid #2a3041", background: "#121622", padding: 18, color: "#d8deea" };
