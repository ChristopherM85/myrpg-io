import { desc, eq, inArray } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { auditEvents, games, sourceEvidencePackets, sources, users } from "../../../db/schema";
import EvidenceReview from "./review";

export const metadata = { robots: { index: false, follow: false }, title: "Owner evidence review | MyRPG" };

export default async function Page() {
  const user = await getChatGPTUser();
  if (!user) return <main><h1>Sign in required</h1></main>;
  const db = getDb();
  const me = (await db.select().from(users).where(eq(users.email, user.email)).limit(1))[0];
  if (me?.role !== "owner") return <main><h1>Owner access required</h1><p>This private evidence review surface is restricted to the Owner.</p></main>;
  const packets = await db.select().from(sourceEvidencePackets).orderBy(desc(sourceEvidencePackets.checkedAt));
  const sourceIds = packets.map((packet) => packet.sourceId); const gameIds = packets.map((packet) => packet.gameId);
  const [sourceRows, gameRows, audits] = await Promise.all([sourceIds.length ? db.select().from(sources).where(inArray(sources.id, sourceIds)) : [], gameIds.length ? db.select().from(games).where(inArray(games.id, gameIds)) : [], db.select().from(auditEvents).where(eq(auditEvents.entityType, "source_evidence")).orderBy(desc(auditEvents.createdAt))]);
  return <EvidenceReview packets={packets.map((packet) => ({ ...packet, source: sourceRows.find((source) => source.id === packet.sourceId), game: gameRows.find((game) => game.id === packet.gameId), audits: audits.filter((audit) => audit.entityId === packet.id) }))} />;
}
