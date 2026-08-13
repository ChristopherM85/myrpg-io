import { desc, eq, inArray } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { agentRuns, auditEvents, games, sourceEvidencePackets, sourceVerificationPackets, sources, users } from "../../../db/schema";
import EvidenceReview from "./review";

export const metadata = { robots: { index: false, follow: false }, title: "Owner evidence review | MyRPG" };

export default async function Page() {
  const user = await getChatGPTUser();
  if (!user) return <main><h1>Sign in required</h1></main>;
  const db = getDb();
  const me = (await db.select().from(users).where(eq(users.email, user.email)).limit(1))[0];
  if (me?.role !== "owner") return <main><h1>Owner access required</h1><p>This private evidence review surface is restricted to the Owner.</p></main>;
  const [packets, leads, verificationPackets, allSources] = await Promise.all([
    db.select().from(sourceEvidencePackets).orderBy(desc(sourceEvidencePackets.checkedAt)),
    db.select().from(agentRuns).where(eq(agentRuns.status, "verification_lead")).orderBy(desc(agentRuns.createdAt)),
    db.select().from(sourceVerificationPackets).orderBy(desc(sourceVerificationPackets.checkedAt)),
    db.select().from(sources),
  ]);
  const sourceIds = packets.map((packet) => packet.sourceId); const gameIds = packets.map((packet) => packet.gameId);
  const [sourceRows, gameRows, audits] = await Promise.all([sourceIds.length ? db.select().from(sources).where(inArray(sources.id, sourceIds)) : [], gameIds.length ? db.select().from(games).where(inArray(games.id, gameIds)) : [], db.select().from(auditEvents).where(eq(auditEvents.entityType, "source_evidence")).orderBy(desc(auditEvents.createdAt))]);
  const verificationByLead = new Map(verificationPackets.map((packet) => [packet.leadRunId, packet]));
  const privateLeads = leads.map((lead) => { let output: any = {}; try { output = JSON.parse(lead.outputJson || "{}"); } catch { /* Invalid private lead stays visible for hold/review. */ } return { id: lead.id, title: output.title || "Untitled discovery lead", sourceUrl: output.sourceUrl || "", sourceDate: output.sourceDate || null, sourceDomain: output.sourceDomain || "Configured discovery source", checkedAt: lead.createdAt, verified: verificationByLead.get(lead.id) || null }; });
  const primaryDomains = allSources.filter((source) => source.approved && (source.sourceRole || "primary") === "primary").map((source) => source.domain).sort();
  return <EvidenceReview packets={packets.map((packet) => ({ ...packet, source: sourceRows.find((source) => source.id === packet.sourceId), game: gameRows.find((game) => game.id === packet.gameId), audits: audits.filter((audit) => audit.entityId === packet.id) }))} leads={privateLeads} verificationPackets={verificationPackets.map((packet) => ({ ...packet, source: allSources.find((source) => source.id === packet.sourceId), audits: audits.filter((audit) => audit.entityId === packet.id) }))} primaryDomains={primaryDomains} />;
}
