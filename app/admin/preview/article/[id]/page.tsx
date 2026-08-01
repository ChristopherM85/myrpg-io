import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { requireChatGPTUser } from "../../../../chatgpt-auth";
import { getDb } from "../../../../../db";
import { agentRuns, articles, auditEvents, mediaAssets, reviewDecisions, sources, users } from "../../../../../db/schema";
import ArticlePreviewActions from "./preview-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Article preview | MyRPG Director Console", robots: { index: false, follow: false } };
const pretty = (value?: string | null) => value ? value.replace(/_/g, " ") : "Not recorded";
const money = (cents?: number | null) => `$${((cents || 0) / 100).toFixed(2)}`;

export default async function ArticlePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireChatGPTUser(`/admin/preview/article/${encodeURIComponent(id)}`);
  let packet: any = null;
  try {
    const db = getDb();
    const account = (await db.select().from(users).where(eq(users.email, user.email)).limit(1))[0];
    if (account?.role !== "owner") redirect("/admin");
    const article = (await db.select().from(articles).where(eq(articles.id, id)).limit(1))[0];
    if (article) {
      const host = new URL(article.sourceUrl).hostname.toLowerCase().replace(/^www\./, "");
      const [source, runs, decisions, audits, visual] = await Promise.all([
        db.select().from(sources).where(eq(sources.domain, host)).limit(1),
        db.select().from(agentRuns).where(eq(agentRuns.itemId, article.id)).orderBy(desc(agentRuns.createdAt)),
        db.select().from(reviewDecisions).where(eq(reviewDecisions.articleId, article.id)).orderBy(desc(reviewDecisions.createdAt)),
        db.select().from(auditEvents).where(and(eq(auditEvents.entityType, "article"), eq(auditEvents.entityId, article.id))).orderBy(desc(auditEvents.createdAt)),
        db.select().from(mediaAssets).where(and(eq(mediaAssets.articleId, article.id), eq(mediaAssets.placement, "lead"), eq(mediaAssets.status, "approved"))).limit(1),
      ]);
      packet = { article, source: source[0], runs, decisions, audits, visual: visual[0] };
    }
  } catch { packet = null; }
  if (!packet) return <PrivateState title="Preview unavailable" message="This draft does not exist, is no longer available, or cannot be read by this Owner account." />;
  const { article, source, runs, decisions, audits, visual } = packet;
  const planned = runs.reduce((sum: number, run: any) => sum + (run.plannedCostCents || 0), 0);
  const actual = runs.reduce((sum: number, run: any) => sum + (run.actualCostCents || 0), 0);
  const intakeRun = runs.find((run: any) => run.agent === "director_review" && run.outputJson);
  let intake: any = null; try { intake = intakeRun ? JSON.parse(intakeRun.outputJson) : null; } catch { intake = null; }
  const blockers = [!source?.approved && "Official source is not approved", !article.factCheckedAt && "Fact-check date is missing", article.status !== "review" && "Draft is not in human review", !article.summary?.trim() && "Draft content is missing", !visual && "No approved lead visual — branded MyRPG fallback will be used"].filter((item): item is string => Boolean(item));
  return <main style={shell}>
    <p style={kicker}>OWNER-ONLY PREVIEW · NOINDEX</p><h1 style={heading}>{article.title}</h1>
    <p style={muted}>Slug: <code>{article.slug}</code> · Status: <strong>{pretty(article.status)}</strong> · Writer: Maya Chen, Signal Editor (AI persona; human-reviewed)</p>
    <ArticlePreviewActions id={article.id} summary={article.summary} />
    <Section title="Publication readiness"><ul>{blockers.length ? blockers.map((blocker: string) => <li key={blocker}>{blocker}</li>) : <li>All current readiness checks pass.</li>}</ul></Section>
    <Section title="Draft"><p style={body}>{article.summary}</p></Section>
    <Section title="Sources & fact check"><p><a href={article.sourceUrl} target="_blank" rel="noopener noreferrer" style={accent}>{article.sourceUrl}</a></p><p style={muted}>Approved source: {source?.approved ? "Yes" : "No"} · Confidence: {article.confidence}% · Fact-checked: {article.factCheckedAt || "Missing"}</p>{intake && <div style={card}><strong>Official announcement intake</strong><p style={muted}>Related published game: {intake.gameName || "Not recorded"} · Source date: {intake.sourceDate || "Missing"}</p><p style={muted}>Normalized URL: {intake.normalizedUrl || article.sourceUrl} · Duplicate result: {intake.duplicate || "Not recorded"} · Validation: {intake.validation || "Not recorded"}</p><p style={muted}>Recommendation: {intake.recommendation || "Hold for Owner review."}</p></div>}</Section>
    <Section title="Validation & workflow"><div style={grid}>{runs.length ? runs.map((run: any) => <Card key={run.id} title={pretty(run.agent)}><p>{pretty(run.status)}</p><p>Planned {money(run.plannedCostCents)} · actual {money(run.actualCostCents)}</p><small>{run.stoppedReason || "Deterministic simulation output recorded."}</small></Card>) : <Card title="No agent runs">No validation output exists for this draft.</Card>}</div><p style={muted}>Packet total: planned {money(planned)} · actual {money(actual)}</p></Section>
    <Section title="Lead visual"><Card title={visual ? "Approved visual" : "MyRPG editorial fallback"}>{visual ? <><p>{visual.altText}</p><p>{visual.credit || "Credit not supplied"}</p><p><a href={visual.assetUrl || visual.sourceUrl || "#"} target="_blank" rel="noopener noreferrer" style={accent}>View approved asset</a></p></> : <p>MyRPG editorial graphic — not gameplay. A lead visual has not yet been approved.</p>}</Card></Section>
    <Section title="Review decisions"><History items={decisions.map((item: any) => `${pretty(item.decision)} by ${item.decidedBy} · ${item.createdAt}${item.note ? ` — ${item.note}` : ""}`)} empty="No review decision has been recorded." /></Section>
    <Section title="Audit trail"><History items={audits.map((item: any) => `${pretty(item.action)} · ${item.actorEmail} · ${item.createdAt}`)} empty="No audit events have been recorded." /></Section>
  </main>;
}
function PrivateState({ title, message }: { title: string; message: string }) { return <main style={shell}><p style={kicker}>OWNER-ONLY PREVIEW · NOINDEX</p><h1 style={heading}>{title}</h1><p style={body}>{message}</p><a href="/admin#review-queue" style={accent}>Back to Review Queue</a></main>; }
function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section style={section}><h2 style={{ fontSize: 23, margin: "0 0 12px" }}>{title}</h2>{children}</section>; }
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <article style={card}><h3 style={{ marginTop: 0 }}>{title}</h3>{children}</article>; }
function History({ items, empty }: { items: string[]; empty: string }) { return <div style={card}>{items.length ? <ul>{items.map((item) => <li key={item} style={{ marginBottom: 8 }}>{item}</li>)}</ul> : <p>{empty}</p>}</div>; }
const shell = { maxWidth: 1040, margin: "0 auto", padding: "56px 24px 96px", minHeight: "100vh", background: "#090b12", color: "#edf3f5" }; const heading = { fontSize: "clamp(2.25rem, 6vw, 4.5rem)", letterSpacing: "-0.06em", margin: "0 0 16px" }; const kicker = { color: "#76f5e3", fontWeight: 800, fontSize: 12, letterSpacing: 1.2 }; const muted = { color: "#aeb6c7", lineHeight: 1.6 }; const body = { color: "#d8deea", lineHeight: 1.8, fontSize: 17 }; const accent = { color: "#76f5e3", wordBreak: "break-word" as const }; const section = { borderTop: "1px solid #2a3041", paddingTop: 28, marginTop: 34 }; const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }; const card = { border: "1px solid #2a3041", background: "#121622", padding: 18, color: "#d8deea" };
