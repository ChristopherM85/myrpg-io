import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { articles, auditEvents, budgetPolicies, siteSettings, sources, users } from "../../../../db/schema";
import { eq } from "drizzle-orm";

const stamp = () => new Date().toISOString();
const id = () => crypto.randomUUID();
type Role = "owner" | "admin" | "editor";

async function actor() {
  const identity = await getChatGPTUser();
  if (!identity) return null;
  const db = getDb(); const time = stamp();
  const current = await db.select().from(users).where(eq(users.email, identity.email)).limit(1);
  if (!current[0]) {
    const all = await db.select().from(users).limit(1);
    const role: Role = all.length ? "editor" : "owner";
    await db.insert(users).values({ id: id(), email: identity.email, role, createdAt: time, updatedAt: time });
    return { db, email: identity.email, role };
  }
  return { db, email: identity.email, role: current[0].role as Role };
}
function allowed(role: Role, action: string) {
  if (role === "owner") return true;
  if (role === "admin") return ["article", "source"].includes(action);
  return action === "article";
}
async function audit(db: ReturnType<typeof getDb>, email: string, action: string, type: string, entityId?: string, details?: unknown) {
  await db.insert(auditEvents).values({ id: id(), actorEmail: email, action, entityType: type, entityId, details: details ? JSON.stringify(details) : null, createdAt: stamp() });
}
export async function POST(request: Request) {
  const identity = await actor();
  if (!identity) return Response.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json() as { kind?: string; action?: string; id?: string; value?: string | boolean | number; label?: string; domain?: string; note?: string };
  const { db, email, role } = identity; const kind = body.kind ?? "";
  if (!allowed(role, kind)) return Response.json({ error: "Owner permission required" }, { status: 403 });
  const time = stamp();
  if (kind === "article" && body.id) {
    const statuses: Record<string, "review" | "published" | "rejected" | "archived" | "draft"> = { approve: "review", publish: "published", reject: "rejected", archive: "archived", restore: "review", unpublish: "draft" };
    const status = statuses[body.action ?? ""];
    if (!status && body.action !== "edit") return Response.json({ error: "Unknown article action" }, { status: 400 });
    if (body.action === "edit") await db.update(articles).set({ summary: String(body.value ?? ""), updatedAt: time }).where(eq(articles.id, body.id));
    else await db.update(articles).set({ status, publishedAt: status === "published" ? time : null, updatedAt: time }).where(eq(articles.id, body.id));
    await audit(db, email, `article_${body.action}`, "article", body.id, { status });
    return Response.json({ ok: true });
  }
  if (kind === "source") {
    if (body.action === "add") {
      let hostname: string; try { hostname = new URL(String(body.domain)).hostname.toLowerCase().replace(/^www\./, ""); } catch { return Response.json({ error: "Use a complete https URL" }, { status: 400 }); }
      await db.insert(sources).values({ id: id(), domain: hostname, label: body.label || hostname, kind: "official", approved: false, createdAt: time, updatedAt: time });
      await audit(db, email, "source_added", "source", hostname); return Response.json({ ok: true });
    }
    if (!body.id) return Response.json({ error: "Missing source" }, { status: 400 });
    const approved = body.action === "approve";
    await db.update(sources).set({ approved, updatedAt: time }).where(eq(sources.id, body.id));
    await audit(db, email, `source_${body.action}`, "source", body.id); return Response.json({ ok: true });
  }
  if (kind === "settings") {
    const settings = await db.select().from(siteSettings).limit(1); const settingId = settings[0]?.id ?? "primary";
    if (!settings[0]) await db.insert(siteSettings).values({ id: settingId, simulationMode: true, networkPromotionsEnabled: true, createdAt: time, updatedAt: time });
    const patch = body.action === "promotion" ? { networkPromotionsEnabled: Boolean(body.value), updatedAt: time } : body.action === "simulation" ? { simulationMode: Boolean(body.value), updatedAt: time } : {};
    if (Object.keys(patch).length) await db.update(siteSettings).set(patch).where(eq(siteSettings.id, settingId));
    await audit(db, email, `settings_${body.action}`, "settings", settingId, { value: body.value }); return Response.json({ ok: true });
  }
  if (kind === "budget") {
    const rows = await db.select().from(budgetPolicies).limit(1); const policyId = rows[0]?.id ?? "primary";
    if (!rows[0]) await db.insert(budgetPolicies).values({ id: policyId, createdAt: time, updatedAt: time });
    const safe = Math.max(0, Math.min(100000, Number(body.value) || 0));
    const patch = body.action === "daily" ? { dailyLimitCents: safe, updatedAt: time } : body.action === "per_job" ? { perJobLimitCents: safe, updatedAt: time } : { emergencyStop: Boolean(body.value), updatedAt: time };
    await db.update(budgetPolicies).set(patch).where(eq(budgetPolicies.id, policyId));
    await audit(db, email, `budget_${body.action}`, "budget", policyId, patch); return Response.json({ ok: true });
  }
  if (kind === "role" && body.id && ["owner", "admin", "editor"].includes(String(body.value))) {
    await db.update(users).set({ role: String(body.value) as Role, updatedAt: time }).where(eq(users.id, body.id));
    await audit(db, email, "role_changed", "user", body.id, { role: body.value }); return Response.json({ ok: true });
  }
  return Response.json({ error: "Unknown action" }, { status: 400 });
}
