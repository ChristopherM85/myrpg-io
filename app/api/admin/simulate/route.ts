import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { agentRuns, articles, auditEvents, sources, users } from "../../../../db/schema";

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
export async function POST() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  const db = getDb(); const stamp = now();
  const existing = await db.select().from(users).limit(1);
  const role = existing.length === 0 ? "owner" : "editor";
  await db.insert(users).values({ id: user.email, email: user.email, role, createdAt: stamp, updatedAt: stamp }).onConflictDoNothing();
  const allowed = await db.select().from(sources).limit(1);
  if (allowed.length === 0) await db.insert(sources).values({ id: id(), domain: "www.guildwars2.com", label: "ArenaNet", kind: "official developer", approved: true, createdAt: stamp, updatedAt: stamp });
  const articleId = id(); const sourceUrl = "https://www.guildwars2.com/en/news/";
  await db.insert(articles).values({ id: articleId, slug: `simulation-${Date.now()}`, title: "Simulation: official MMO update queued for review", summary: "A deterministic test draft created by the MyRPG simulation workflow. No external model or source fetch was used.", status: "review", sourceUrl, confidence: 96, factCheckedAt: stamp, createdAt: stamp, updatedAt: stamp });
  for (const agent of ["scout", "research", "validator", "editor", "director_review"] as const) await db.insert(agentRuns).values({ id: id(), agent, status: agent === "director_review" ? "awaiting_human" : "completed", itemId: articleId, plannedCostCents: 0, actualCostCents: 0, outputJson: JSON.stringify({ simulation: true, sourceUrl }), createdAt: stamp, updatedAt: stamp });
  await db.insert(auditEvents).values({ id: id(), actorEmail: user.email, action: "simulation_candidate_created", entityType: "article", entityId: articleId, details: JSON.stringify({ role, simulated: true }), createdAt: stamp });
  return Response.json({ articleId, role, status: "review" });
}
