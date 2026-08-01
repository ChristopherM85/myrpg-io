import { and, desc, eq } from "drizzle-orm";
import { requireChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { articles, auditEvents, games, mediaAssets, users } from "../../../../db/schema";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function MediaRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireChatGPTUser("/admin"); const { id } = await params;
  try {
    const db = getDb(); const account = (await db.select().from(users).where(eq(users.email, user.email)).limit(1))[0];
    if (!account || !["owner", "admin"].includes(account.role)) return <main style={shell}><h1>Media inspection is limited to Owners and Admins.</h1></main>;
    const media = (await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1))[0];
    if (!media) return <main style={shell}><h1>Media record not found.</h1><a href="/admin">Return to Director Console</a></main>;
    const parent = media.articleId ? (await db.select().from(articles).where(eq(articles.id, media.articleId)).limit(1))[0] : media.gameId ? (await db.select().from(games).where(eq(games.id, media.gameId)).limit(1))[0] : null;
    const audit = await db.select().from(auditEvents).where(and(eq(auditEvents.entityType, "media"), eq(auditEvents.entityId, id))).orderBy(desc(auditEvents.createdAt));
    const publicReady = media.status === "approved" && Boolean(parent) && (media.articleId ? parent && "status" in parent && parent.status === "published" : parent && "published" in parent && parent.published);
    return <main style={shell}><p style={kicker}>MYRPG / PRIVATE MEDIA RECORD</p><h1>{media.altText}</h1><p style={muted}>Status: <strong>{media.status}</strong> · {media.sourceType} · {media.placement}</p>{publicReady && media.assetUrl ? <img src={media.assetUrl} alt={media.altText} width={media.width || 1200} height={media.height || 675} style={image} /> : <p style={notice}>This item is private. It will not be served publicly until the Owner approves it and the attached article or game is published.</p>}<section style={card}><h2>Attachment & rights</h2><p>Target: {parent ? ("title" in parent ? parent.title : parent.name) : "Unattached"}</p><p>Credit: {media.credit || "Not supplied"}</p><p>Rights notes: {media.rightsNotes || "Missing"}</p><p>Caption: {media.caption || "None"}</p><p>Dimensions: {media.width || "?"} × {media.height || "?"}</p><p>Source: {media.sourceUrl ? <a href={media.sourceUrl} target="_blank" rel="noopener noreferrer">Open approved source</a> : "Owner-controlled upload"}</p></section><section style={card}><h2>Audit trail</h2>{audit.length ? <ul>{audit.map((entry) => <li key={entry.id}>{entry.createdAt}: {entry.action}</li>)}</ul> : <p>No audit entries yet.</p>}</section><p><a href="/admin">← Return to Media Review</a></p></main>;
  } catch { return <main style={shell}><h1>Media record is unavailable.</h1><a href="/admin">Return to Director Console</a></main>; }
}

const shell = { minHeight: "100vh", background: "#090b12", color: "#edf3f5", padding: "54px max(24px, calc((100vw - 980px) / 2))", fontFamily: "Arial, sans-serif" };
const kicker = { color: "#76f5e3", fontSize: 11, fontWeight: 800, letterSpacing: 1.5 };
const muted = { color: "#aeb6c7" };
const notice = { borderLeft: "3px solid #c9a666", background: "#101521", padding: 16, color: "#d8d1be" };
const card = { border: "1px solid #273044", background: "#101521", padding: 20, marginTop: 18, lineHeight: 1.6 };
const image = { width: "100%", height: "auto", maxWidth: 900, border: "1px solid #273044", marginTop: 16 };
