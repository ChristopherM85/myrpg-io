import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { agentRuns, articles, auditEvents, budgetPolicies, calendarItems, games, mediaAssets, reviewDecisions, siteSettings, sourceCache, sources, users } from "../../../../db/schema";
import { eq } from "drizzle-orm";

const stamp = () => new Date().toISOString();
const id = () => crypto.randomUUID();
type Role = "owner" | "admin" | "editor";
const normalizeUrl = (value: string) => {
  const url = new URL(value);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  for (const key of [...url.searchParams.keys()]) if (key.startsWith("utm_")) url.searchParams.delete(key);
  return url.toString().replace(/\/$/, "");
};
const fingerprint = (value: string) => {
  let hash = 5381;
  for (let index = 0; index < value.length; index++) hash = ((hash * 33) ^ value.charCodeAt(index)) >>> 0;
  return `myrpg-${hash.toString(16)}`;
};
const words = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;
const makeSlug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 72);

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
  if (role === "admin") return ["article", "source", "media", "game", "calendar"].includes(action);
  return action === "article";
}
async function audit(db: ReturnType<typeof getDb>, email: string, action: string, type: string, entityId?: string, details?: unknown) {
  await db.insert(auditEvents).values({ id: id(), actorEmail: email, action, entityType: type, entityId, details: details ? JSON.stringify(details) : null, createdAt: stamp() });
}
export async function POST(request: Request) {
  const identity = await actor();
  if (!identity) return Response.json({ error: "Sign in required" }, { status: 401 });
  const body = await request.json() as { kind?: string; action?: string; id?: string; value?: string | boolean | number; label?: string; domain?: string; note?: string; articleId?:string; assetUrl?:string; sourceUrl?:string; sourceType?:string; credit?:string; altText?:string; caption?:string; placement?:string; width?:number; height?:number; name?:string; slug?:string; status?:string; platforms?:string; businessModel?:string; combat?:string; setting?:string; focus?:string; activity?:string; timeCommitment?:string; releaseDate?:string; releaseDateConfidence?:string; officialUrl?:string; factCheckedAt?:string; directorySummary?:string; sourceConfidence?:string; title?:string; dateLabel?:string; dateConfidence?:string; gameId?:string };
  const { db, email, role } = identity; const kind = body.kind ?? "";
  if (!allowed(role, kind)) return Response.json({ error: "Owner permission required" }, { status: 403 });
  const time = stamp();
  if(kind==="game"){
    if(body.action==="create"){const fields=[body.name,body.slug,body.status,body.platforms,body.businessModel,body.combat,body.setting,body.focus,body.releaseDate,body.officialUrl,body.sourceUrl,body.factCheckedAt];if(fields.some(x=>!String(x||"").trim())||!String(body.slug).match(/^[a-z0-9-]+$/))return Response.json({error:"All factual fields are required; slug must be lowercase letters, numbers, and hyphens."},{status:400});let host="";try{host=new URL(String(body.sourceUrl)).hostname.replace(/^www\./,"")}catch{return Response.json({error:"Use a complete official source URL."},{status:400})}const source=(await db.select().from(sources).where(eq(sources.domain,host)).limit(1))[0];if(!source?.approved)return Response.json({error:"Source domain must be approved first."},{status:400});const releaseDateConfidence=["confirmed","estimated","unconfirmed"].includes(body.releaseDateConfidence||"")?body.releaseDateConfidence!:"unconfirmed";await db.insert(games).values({id:id(),slug:body.slug!,name:body.name!,status:body.status!,platforms:body.platforms!,businessModel:body.businessModel!,combat:body.combat!,setting:body.setting!,focus:body.focus!,activity:body.activity?.trim()||null,timeCommitment:body.timeCommitment?.trim()||null,releaseDate:body.releaseDate!,releaseDateConfidence,officialUrl:body.officialUrl!,sourceUrl:body.sourceUrl!,factCheckedAt:body.factCheckedAt!,sourceConfidence:"high",reviewStatus:"draft",published:false,createdAt:time,updatedAt:time});await audit(db,email,"game_created","game",body.slug);return Response.json({ok:true})}
    if(!body.id)return Response.json({error:"Game required"},{status:400});if(body.action==="publish"&&role!=="owner")return Response.json({error:"Only the Owner can publish games."},{status:403});const game=(await db.select().from(games).where(eq(games.id,body.id)).limit(1))[0];if(!game)return Response.json({error:"Game not found"},{status:404});if(body.action==="approve"&&role!=="owner")return Response.json({error:"Only the Owner can approve a game."},{status:403});if(body.action==="correct"){if(role!=="owner")return Response.json({error:"Only the Owner can correct verified factual fields."},{status:403});let host="";try{host=new URL(String(body.sourceUrl||game.sourceUrl)).hostname.toLowerCase().replace(/^www\./,"")}catch{return Response.json({error:"Use a complete approved official source URL."},{status:400})}if(!(await db.select().from(sources).where(eq(sources.domain,host)).limit(1))[0]?.approved)return Response.json({error:"Source domain must be approved first."},{status:400});const patch={status:body.status||game.status,platforms:body.platforms||game.platforms,businessModel:body.businessModel||game.businessModel,combat:body.combat||game.combat,setting:body.setting||game.setting,focus:body.focus||game.focus,activity:body.activity||null,timeCommitment:body.timeCommitment||null,releaseDate:body.releaseDate||game.releaseDate,releaseDateConfidence:["confirmed","estimated","unconfirmed"].includes(body.releaseDateConfidence||"")?body.releaseDateConfidence!:game.releaseDateConfidence,officialUrl:body.officialUrl||game.officialUrl,sourceUrl:body.sourceUrl||game.sourceUrl,factCheckedAt:body.factCheckedAt||game.factCheckedAt,directorySummary:body.directorySummary||game.directorySummary,sourceConfidence:body.sourceConfidence||game.sourceConfidence,updatedAt:time};await db.update(games).set(patch).where(eq(games.id,body.id));await audit(db,email,"game_facts_corrected","game",body.id,patch);return Response.json({ok:true})}if(body.action==="edit"){await db.update(games).set({directorySummary:String(body.value??""),updatedAt:time}).where(eq(games.id,body.id));await audit(db,email,"game_edited","game",body.id);return Response.json({ok:true})}if(body.action==="publish"){const required=[game.name,game.slug,game.status,game.platforms,game.businessModel,game.combat,game.setting,game.focus,game.releaseDate,game.officialUrl,game.sourceUrl,game.factCheckedAt,game.directorySummary];if(required.some(x=>!x))return Response.json({error:"Publish readiness blocked: required factual fields or directory summary are incomplete."},{status:409});if(game.reviewStatus!=="approved")return Response.json({error:"Publish readiness blocked: Owner approval is required."},{status:409});let host="";try{host=new URL(game.sourceUrl!).hostname.replace(/^www\./,"")}catch{}if(!(await db.select().from(sources).where(eq(sources.domain,host)).limit(1))[0]?.approved)return Response.json({error:"Publish readiness blocked: source is not approved."},{status:409});await db.update(games).set({published:true,updatedAt:time}).where(eq(games.id,body.id));}else if(body.action==="unpublish")await db.update(games).set({published:false,updatedAt:time}).where(eq(games.id,body.id));else {const reviewStates:Record<string,string>={approve:"approved",reject:"rejected",archive:"archived",restore:"draft"};const reviewStatus=reviewStates[body.action||""];if(!reviewStatus)return Response.json({error:"Unknown game action"},{status:400});await db.update(games).set({reviewStatus,updatedAt:time}).where(eq(games.id,body.id));}await audit(db,email,`game_${body.action}`,"game",body.id);return Response.json({ok:true})}
  if(kind==="calendar"){if(body.action==="create"){if(!body.gameId||!body.title||!body.dateLabel||!body.sourceUrl||!body.factCheckedAt)return Response.json({error:"Calendar title, game, source, fact-check date, and date label are required."},{status:400});let host="";try{host=new URL(body.sourceUrl).hostname.toLowerCase().replace(/^www\./,"")}catch{return Response.json({error:"Use a complete approved official source URL."},{status:400})}if(!(await db.select().from(sources).where(eq(sources.domain,host)).limit(1))[0]?.approved)return Response.json({error:"Calendar source domain must be approved first."},{status:400});await db.insert(calendarItems).values({id:id(),gameId:body.gameId,title:body.title,dateLabel:body.dateLabel,dateConfidence:["confirmed","estimated","unconfirmed"].includes(body.dateConfidence||"")?body.dateConfidence!:"unconfirmed",sourceUrl:body.sourceUrl,factCheckedAt:body.factCheckedAt,reviewStatus:"draft",published:false,createdAt:time,updatedAt:time});await audit(db,email,"calendar_created","calendar",body.gameId);return Response.json({ok:true});}if(!body.id)return Response.json({error:"Calendar item required"},{status:400});const item=(await db.select().from(calendarItems).where(eq(calendarItems.id,body.id)).limit(1))[0];if(!item)return Response.json({error:"Calendar item not found"},{status:404});if(body.action==="correct"){if(role!=="owner")return Response.json({error:"Only the Owner can correct calendar facts."},{status:403});let host="";try{host=new URL(String(body.sourceUrl||item.sourceUrl)).hostname.toLowerCase().replace(/^www\./,"")}catch{return Response.json({error:"Use a complete approved official source URL."},{status:400})}if(!(await db.select().from(sources).where(eq(sources.domain,host)).limit(1))[0]?.approved)return Response.json({error:"Source domain must be approved first."},{status:400});const patch={title:body.title||item.title,dateLabel:body.dateLabel||item.dateLabel,dateConfidence:["confirmed","estimated","unconfirmed"].includes(body.dateConfidence||"")?body.dateConfidence!:item.dateConfidence,sourceUrl:body.sourceUrl||item.sourceUrl,factCheckedAt:body.factCheckedAt||item.factCheckedAt,updatedAt:time};await db.update(calendarItems).set(patch).where(eq(calendarItems.id,body.id));await audit(db,email,"calendar_facts_corrected","calendar",body.id,patch);return Response.json({ok:true})}if(body.action==="approve"&&role!=="owner")return Response.json({error:"Only the Owner can approve a calendar item."},{status:403});if(body.action==="publish"){if(role!=="owner")return Response.json({error:"Only the Owner can publish a calendar item."},{status:403});if(item.reviewStatus!=="approved")return Response.json({error:"Publish readiness blocked: Owner approval is required."},{status:409});if(item.dateConfidence==="unconfirmed")return Response.json({error:"Publish readiness blocked: release-date confidence is unresolved."},{status:409});let host="";try{host=new URL(item.sourceUrl).hostname.toLowerCase().replace(/^www\./,"")}catch{}if(!(await db.select().from(sources).where(eq(sources.domain,host)).limit(1))[0]?.approved)return Response.json({error:"Publish readiness blocked: source is not approved."},{status:409});await db.update(calendarItems).set({published:true,updatedAt:time}).where(eq(calendarItems.id,body.id));}else{const states:Record<string,string>={approve:"approved",reject:"rejected",archive:"archived",restore:"draft",unpublish:"draft"};const reviewStatus=states[body.action||""];if(!reviewStatus)return Response.json({error:"Unknown calendar action"},{status:400});await db.update(calendarItems).set({reviewStatus,published:body.action==="unpublish"?false:item.published,updatedAt:time}).where(eq(calendarItems.id,body.id));}await audit(db,email,`calendar_${body.action}`,"calendar",body.id);return Response.json({ok:true});}
  if (kind === "article" && body.action === "intake") {
    if (role === "editor") return Response.json({ error: "Only an Owner or Admin can create an official announcement intake record." }, { status: 403 });
    if (!body.title || !body.sourceUrl || !body.factCheckedAt || !body.releaseDate || !body.gameId || !body.value) return Response.json({ error: "Title, official announcement URL, related published game, source date, fact-check date, and draft are required." }, { status: 400 });
    let normalizedUrl = ""; let host = "";
    try { normalizedUrl = normalizeUrl(String(body.sourceUrl)); host = new URL(normalizedUrl).hostname; } catch { return Response.json({ error: "Use a complete official announcement URL." }, { status: 400 }); }
    const source = (await db.select().from(sources).where(eq(sources.domain, host)).limit(1))[0];
    if (!source?.approved) return Response.json({ error: "That source domain is not approved in the Source Registry." }, { status: 400 });
    const sourceDate = new Date(String(body.releaseDate)); const factChecked = new Date(String(body.factCheckedAt));
    if (Number.isNaN(sourceDate.valueOf()) || Number.isNaN(factChecked.valueOf())) return Response.json({ error: "Source date and fact-check date must be valid dates." }, { status: 400 });
    if (Date.now() - sourceDate.valueOf() > 180 * 86400000) return Response.json({ error: "This announcement is more than 180 days old. Hold it unless a current official update supports it." }, { status: 400 });
    const relatedGame = (await db.select().from(games).where(eq(games.slug, String(body.gameId))).limit(1))[0];
    if (!relatedGame?.published) return Response.json({ error: "Choose a published game profile for the related-game link." }, { status: 400 });
    const draft = String(body.value).trim();
    if (words(draft) < 120 || words(draft) > 180) return Response.json({ error: "The factual draft must be 120–180 words." }, { status: 400 });
    const contentFingerprint = fingerprint(`${normalizedUrl}|${String(body.title).trim().toLowerCase()}`);
    const duplicateCache = (await db.select().from(sourceCache).where(eq(sourceCache.normalizedUrl, normalizedUrl)).limit(1))[0];
    const duplicateArticle = (await db.select().from(articles).where(eq(articles.contentFingerprint, contentFingerprint)).limit(1))[0];
    if (duplicateCache || duplicateArticle) return Response.json({ error: "Duplicate announcement detected. This official URL or content fingerprint is already in the intake workflow." }, { status: 409 });
    const pending = await db.select().from(articles); if (pending.filter((article) => article.status !== "published").length >= 3) return Response.json({ error: "The private announcement intake limit is three candidates. Review or archive an existing item first." }, { status: 409 });
    const baseSlug = makeSlug(String(body.title)); const articleId = id(); const slug = `${baseSlug}-${contentFingerprint.slice(-6)}`;
    if ((await db.select().from(articles).where(eq(articles.slug, slug)).limit(1))[0]) return Response.json({ error: "A matching article slug already exists." }, { status: 409 });
    await db.insert(articles).values({ id: articleId, slug, title: String(body.title).trim(), summary: draft, status: "review", sourceUrl: normalizedUrl, contentFingerprint, confidence: 95, factCheckedAt: factChecked.toISOString(), createdAt: time, updatedAt: time });
    await db.insert(sourceCache).values({ id: id(), normalizedUrl, contentHash: contentFingerprint, sourceId: source.id, lastCheckedAt: factChecked.toISOString(), createdAt: time, updatedAt: time });
    const intake = { manualIntake: true, noModel: true, normalizedUrl, sourceDate: sourceDate.toISOString(), gameSlug: relatedGame.slug, gameName: relatedGame.name, citation: normalizedUrl, sourceConfidence: "high", duplicate: "clear", validation: "pass", recommendation: "approve after Owner confirms the source, factual summary, citation, date, and fallback media." };
    for (const agent of ["validator", "editor", "director_review"] as const) await db.insert(agentRuns).values({ id: id(), agent, status: "completed", itemId: articleId, plannedCostCents: 0, actualCostCents: 0, outputJson: JSON.stringify(intake), createdAt: time, updatedAt: time });
    await audit(db, email, "article_official_announcement_intake", "article", articleId, intake);
    return Response.json({ ok: true, articleId });
  }
  if (kind === "article" && body.id) {
    if (role === "editor" && body.action !== "edit") return Response.json({ error: "Editors may prepare drafts only." }, { status: 403 });
    if (role === "admin" && !["edit"].includes(body.action || "")) return Response.json({ error: "Only the Owner can make article review or publication decisions." }, { status: 403 });
    if (body.action === "publish" && role !== "owner") return Response.json({ error: "Only the Owner can publish." }, { status: 403 });
    if (body.action === "approve" && role !== "owner") return Response.json({ error: "Only the Owner can approve article publication readiness." }, { status: 403 });
    const statuses: Record<string, "review" | "published" | "rejected" | "archived" | "draft"> = { approve: "review", publish: "published", reject: "rejected", archive: "archived", restore: "review", unpublish: "draft" };
    const status = statuses[body.action ?? ""];
    if (!status && body.action !== "edit") return Response.json({ error: "Unknown article action" }, { status: 400 });
    const currentArticle=(await db.select().from(articles).where(eq(articles.id,body.id)).limit(1))[0];
    if(!currentArticle) return Response.json({error:"Article not found"},{status:404});
    if(body.action==="publish") { let host="";try{host=new URL(currentArticle.sourceUrl).hostname.toLowerCase().replace(/^www\./,"")}catch{} const approved=(await db.select().from(sources).where(eq(sources.domain,host)).limit(1))[0]?.approved; const cache=(await db.select().from(sourceCache).where(eq(sourceCache.contentHash,currentArticle.contentFingerprint||"")).limit(1))[0]; const decisions=await db.select().from(reviewDecisions).where(eq(reviewDecisions.articleId,currentArticle.id)); const ownerApproved=decisions.some(decision=>decision.decision==="approve"); const fresh=currentArticle.factCheckedAt&&Date.now()-new Date(currentArticle.factCheckedAt).valueOf()<=180*86400000; const checklist=[Boolean(currentArticle.title.trim()),words(currentArticle.summary)>=120&&words(currentArticle.summary)<=180,Boolean(currentArticle.factCheckedAt),Boolean(fresh),Boolean(approved),Boolean(cache),ownerApproved,currentArticle.status==="review"]; if(checklist.some(v=>!v)) return Response.json({error:"Publication checklist incomplete: approved source, clear duplicate record, current fact-check, 120–180-word draft, and explicit Owner approval are required. The labelled MyRPG fallback satisfies the lead-visual requirement when no approved media exists."},{status:409}); }
    if (body.action === "edit") await db.update(articles).set({ summary: String(body.value ?? ""), updatedAt: time }).where(eq(articles.id, body.id));
    else await db.update(articles).set({ status, publishedAt: status === "published" ? time : null, updatedAt: time }).where(eq(articles.id, body.id));
    if (["approve", "reject", "archive", "restore", "publish", "unpublish"].includes(body.action || "")) await db.insert(reviewDecisions).values({ id: id(), articleId: body.id, decision: body.action!, decidedBy: email, createdAt: time });
    await audit(db, email, `article_${body.action}`, "article", body.id, { status });
    return Response.json({ ok: true });
  }
  if (kind === "media") {
    const officialTypes = ["official_press_kit","official_game_site","verified_store","official_trailer","owner_upload"];
    if (body.action === "add") {
      if (!body.articleId || !body.altText || !body.sourceType || !officialTypes.includes(body.sourceType)) return Response.json({ error: "Article, alt text, and an approved source type are required." }, { status: 400 });
      if (body.sourceType !== "owner_upload") { try { const host = new URL(String(body.sourceUrl || body.assetUrl)).hostname.toLowerCase().replace(/^www\./, ""); const allowedSource = await db.select().from(sources).where(eq(sources.domain, host)).limit(1); if (!allowedSource[0]?.approved) return Response.json({ error: "Official media source must be approved in Source Registry." }, { status: 400 }); } catch { return Response.json({ error: "Use a complete approved source URL." }, { status: 400 }); } }
      await db.insert(mediaAssets).values({ id:id(), articleId:body.articleId, assetUrl:body.assetUrl||null, sourceUrl:body.sourceUrl||null, sourceType:body.sourceType, credit:body.credit||null, altText:body.altText, caption:body.caption||null, width:Math.max(1,Number(body.width)||1200), height:Math.max(1,Number(body.height)||675), placement:["lead","supporting"].includes(body.placement||"")?body.placement!:"lead", status:"pending_review", createdAt:time, updatedAt:time });
      await audit(db,email,"media_added","media",body.articleId,{sourceType:body.sourceType,placement:body.placement}); return Response.json({ok:true});
    }
    if (!body.id) return Response.json({error:"Missing media asset"},{status:400});
    const states:Record<string,string>={approve:"approved",reject:"rejected",archive:"archived",restore:"pending_review"}; const status=states[body.action||""]; if(!status) return Response.json({error:"Unknown media action"},{status:400});
    if(body.action==="approve"&&role!=="owner") return Response.json({error:"Only the Owner can approve media."},{status:403});
    await db.update(mediaAssets).set({status,updatedAt:time}).where(eq(mediaAssets.id,body.id)); await audit(db,email,`media_${body.action}`,"media",body.id,{status}); return Response.json({ok:true});
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
