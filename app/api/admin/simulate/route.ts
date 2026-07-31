import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { agentRuns, articles, auditEvents, budgetPolicies, siteSettings, sources, users } from "../../../../db/schema";
import { eq } from "drizzle-orm";

const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
export async function POST() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required" }, { status: 401 });
  const db = getDb(); const stamp = now();
  const existing = await db.select().from(users).limit(1);
  const role = existing.length === 0 ? "owner" : "editor";
  await db.insert(users).values({ id: user.email, email: user.email, role, createdAt: stamp, updatedAt: stamp }).onConflictDoNothing();
  const record = (await db.select().from(users).where(eq(users.email, user.email)).limit(1))[0];
  if (record?.role !== "owner") return Response.json({ error: "Only the Owner can run a workflow." }, { status: 403 });
  const [settings, budget] = await Promise.all([db.select().from(siteSettings).limit(1), db.select().from(budgetPolicies).limit(1)]);
  if (settings[0]?.simulationMode === false) return Response.json({ error: "Simulation mode is disabled." }, { status: 409 });
  if (budget[0]?.emergencyStop) return Response.json({ error: "Emergency stop is active." }, { status: 409 });
  const allowed = await db.select().from(sources).where(eq(sources.approved, true)).limit(1);
  if (allowed.length === 0) await db.insert(sources).values({ id: id(), domain: "guildwars2.com", label: "ArenaNet", kind: "official developer", approved: true, createdAt: stamp, updatedAt: stamp });
  const articleId = id(); const sourceUrl = "https://www.guildwars2.com/en/news/";
  const fingerprint = "sim-gw2-official-update-v1";
  const duplicate = await db.select().from(articles).where(eq(articles.contentFingerprint, fingerprint)).limit(1);
  if (duplicate[0]) return Response.json({ error: "Duplicate prevented: this deterministic simulation was already created." }, { status: 409 });
  await db.insert(articles).values({ id: articleId, slug: `simulation-${Date.now()}`, title: "Simulation: official MMO update queued for review", summary: "A deterministic test draft created by the MyRPG simulation workflow. No external model or source fetch was used. The approved official source is preserved for the human review packet.", status: "review", sourceUrl, contentFingerprint: fingerprint, confidence: 96, factCheckedAt: stamp, createdAt: stamp, updatedAt: stamp });
  for (const agent of ["scout", "research", "validator", "editor", "director_review"] as const) await db.insert(agentRuns).values({ id: id(), agent, status: agent === "director_review" ? "awaiting_human" : "completed", itemId: articleId, plannedCostCents: 0, actualCostCents: 0, outputJson: JSON.stringify({ simulation: true, sourceUrl }), createdAt: stamp, updatedAt: stamp });
  await db.insert(auditEvents).values({ id: id(), actorEmail: user.email, action: "simulation_candidate_created", entityType: "article", entityId: articleId, details: JSON.stringify({ role, simulated: true }), createdAt: stamp });
  return Response.json({ articleId, role, status: "review" });
}
