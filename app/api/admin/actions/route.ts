import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { agentRuns, articles, auditEvents, budgetPolicies, calendarItems, editorialPlans, gameTimelineEvents, games, mediaAssets, publicCorrections, reviewDecisions, searchEngineStatuses, siteSettings, sourceCache, sourceEvidencePackets, sources, sourceWatchlist, users } from "../../../../db/schema";
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
const normalizedOrEmpty = (value?: string | null) => { try { return value ? normalizeUrl(value) : ""; } catch { return ""; } };
const calendarFingerprint = (gameId: string, dateLabel: string, sourceUrl: string) => fingerprint(`calendar|${gameId}|${dateLabel.trim().toLowerCase()}|${sourceUrl}`);
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
  const body = await request.json() as { kind?: string; action?: string; id?: string; evidenceId?: string; taxonomyField?: string; value?: string | boolean | number; label?: string; domain?: string; note?: string; articleId?:string; assetUrl?:string; r2Key?:string; sourceUrl?:string; sourceType?:string; credit?:string; rightsNotes?:string; altText?:string; caption?:string; placement?:string; width?:number; height?:number; name?:string; slug?:string; status?:string; platforms?:string; businessModel?:string; combat?:string; setting?:string; focus?:string; activity?:string; timeCommitment?:string; multiplayerType?:string; worldModel?:string; lifecycleStatus?:string; releaseDate?:string; releaseDateConfidence?:string; officialUrl?:string; factCheckedAt?:string; directorySummary?:string; sourceConfidence?:string; title?:string; dateLabel?:string; dateConfidence?:string; gameId?:string; retrospective?:boolean; gamerTakeaway?:string; engine?:string; propertyUrl?:string; verificationStatus?:string; sitemapStatus?:string; proposedDate?:string; contentType?:string; recordId?:string; relatedGame?:string; reviewStatus?:string; mediaStatus?:string; blocker?:string; explanation?:string; eventType?:string; eventDate?:string; citation?:string; confidence?:string; calendarItemId?:string; correctionType?:string; targetType?:string; targetId?:string; summary?:string; reason?:string };
  const { db, email, role } = identity; const kind = body.kind ?? ""; const time = stamp();
  if (kind === "source_watch") {
    if (role !== "owner") return Response.json({ error: "Only the Owner can add or trigger a source watch." }, { status: 403 });
    if (!body.id) return Response.json({ error: "Approved source required." }, { status: 400 });
    const source = (await db.select().from(sources).where(eq(sources.id, body.id)).limit(1))[0];
    if (!source?.approved) return Response.json({ error: "Only an approved official source can enter the watchlist." }, { status: 409 });
    const existing = (await db.select().from(sourceWatchlist).where(eq(sourceWatchlist.sourceId, source.id)).limit(1))[0];
    if (body.action === "watch") {
      if (!existing) await db.insert(sourceWatchlist).values({ id: id(), sourceId: source.id, checkMode: "owner_triggered", status: "ready", note: "Owner-triggered checks only; no scheduled collection.", createdAt: time, updatedAt: time });
      await audit(db, email, "source_watch_added", "source", source.id, { domain: source.domain, mode: "owner_triggered" });
      return Response.json({ ok: true });
    }
    if (!existing) return Response.json({ error: "Add this approved source to the watchlist first." }, { status: 409 });
    if (body.action === "request") {
      await db.update(sourceWatchlist).set({ status: "requested", lastRequestedAt: time, updatedAt: time }).where(eq(sourceWatchlist.id, existing.id));
      await audit(db, email, "source_watch_requested", "source", source.id, { domain: source.domain, mode: "one_time_owner_triggered", noFetch: true, noPublish: true });
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Unknown source-watch action." }, { status: 400 });
  }
  if (kind === "source_evidence") {
    if (role !== "owner") return Response.json({ error: "Only the Owner can decide taxonomy evidence." }, { status: 403 });
    if (!body.evidenceId || !body.taxonomyField || !["apply", "hold", "reject"].includes(body.action || "")) return Response.json({ error: "Evidence packet, taxonomy field, and decision are required." }, { status: 400 });
    const packet = (await db.select().from(sourceEvidencePackets).where(eq(sourceEvidencePackets.id, body.evidenceId)).limit(1))[0];
    if (!packet || packet.status !== "private_review") return Response.json({ error: "Private evidence packet not found." }, { status: 404 });
    let evidence: any; try { evidence = JSON.parse(packet.evidenceJson); } catch { return Response.json({ error: "Evidence packet is invalid and cannot be applied." }, { status: 409 }); }
    const supported = evidence?.supported?.[body.taxonomyField];
    if (body.action === "apply") {
      if (!supported) return Response.json({ error: "Only a field explicitly supported by this official evidence packet can be applied." }, { status: 409 });
      const patch = body.taxonomyField === "multiplayer_type" ? { multiplayerType: String(supported), updatedAt: time } : body.taxonomyField === "world_model" ? { worldModel: String(supported), updatedAt: time } : body.taxonomyField === "lifecycle_status" ? { lifecycleStatus: String(supported), updatedAt: time } : null;
      if (!patch) return Response.json({ error: "Unsupported taxonomy field." }, { status: 400 });
      await db.update(games).set(patch).where(eq(games.id, packet.gameId));
    }
    await audit(db, email, `source_evidence_${body.action}`, "source_evidence", packet.id, { field: body.taxonomyField, supported: supported || null, gameId: packet.gameId });
    return Response.json({ ok: true });
  }
  if (kind === "search_status") {
    if (role !== "owner") return Response.json({ error: "Only the Owner can record search-console status." }, { status: 403 });
    const engine = String(body.engine || "").toLowerCase();
    const verificationStatus = String(body.verificationStatus || "not_started"); const sitemapStatus = String(body.sitemapStatus || "not_submitted");
    if (!["google", "bing"].includes(engine) || !["not_started", "pending", "verified"].includes(verificationStatus) || !["not_submitted", "submitted", "accepted"].includes(sitemapStatus)) return Response.json({ error: "Choose a supported engine and valid manual status." }, { status: 400 });
    const propertyUrl = String(body.propertyUrl || "https://myrpg.io/").trim();
    if (propertyUrl !== "https://myrpg.io/") return Response.json({ error: "Use the canonical property https://myrpg.io/." }, { status: 400 });
    const current = (await db.select().from(searchEngineStatuses).where(eq(searchEngineStatuses.engine, engine)).limit(1))[0]; const recordId = current?.id || id();
    const values = { engine, propertyUrl, verificationStatus, sitemapStatus, verifiedAt: verificationStatus === "verified" ? current?.verifiedAt || time : null, submittedAt: sitemapStatus !== "not_submitted" ? current?.submittedAt || time : null, notes: String(body.note || "").trim() || null, updatedAt: time };
    if (current) await db.update(searchEngineStatuses).set(values).where(eq(searchEngineStatuses.id, recordId)); else await db.insert(searchEngineStatuses).values({ id: recordId, ...values, createdAt: time });
    await audit(db, email, "search_status_recorded", "search_engine", recordId, { engine, verificationStatus, sitemapStatus }); return Response.json({ ok: true });
  }
  if (kind === "editorial_plan") {
    if (role !== "owner") return Response.json({ error: "Only the Owner can manage the private editorial calendar." }, { status: 403 });
    if (body.action === "create") {
      const proposedDate = String(body.proposedDate || ""); const contentType = String(body.contentType || ""); const title = String(body.title || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(proposedDate) || !["article", "game", "calendar"].includes(contentType) || !title) return Response.json({ error: "Title, proposed date, and supported content type are required." }, { status: 400 });
      const proposed = new Date(`${proposedDate}T00:00:00Z`); if (Number.isNaN(proposed.valueOf())) return Response.json({ error: "Use a valid proposed date." }, { status: 400 });
      const day = proposed.getUTCDay(); const monday = new Date(proposed); monday.setUTCDate(proposed.getUTCDate() - ((day + 6) % 7)); const sunday = new Date(monday); sunday.setUTCDate(monday.getUTCDate() + 6);
      const weekly = (await db.select().from(editorialPlans)).filter((plan) => { const date = new Date(`${plan.proposedDate}T00:00:00Z`); return date >= monday && date <= sunday && !["cancelled", "published"].includes(plan.status); });
      if (weekly.length >= 3) return Response.json({ error: "This week already has three active planned publications. Move or complete one before adding another." }, { status: 409 });
      const planId = id(); await db.insert(editorialPlans).values({ id: planId, recordId: String(body.recordId || "").trim() || null, title, proposedDate, contentType, relatedGame: String(body.relatedGame || "").trim() || null, sourceStatus: String(body.sourceConfidence || "pending"), reviewStatus: String(body.reviewStatus || "planned"), mediaStatus: String(body.mediaStatus || "fallback"), blocker: String(body.blocker || "").trim() || null, status: body.blocker ? "blocked" : "planned", createdAt: time, updatedAt: time });
      await audit(db, email, "editorial_plan_created", "editorial_plan", planId, { proposedDate, contentType, title }); return Response.json({ ok: true });
    }
    if (!body.id || !["ready", "blocked", "published", "cancelled", "planned"].includes(String(body.action))) return Response.json({ error: "Choose a valid planning record and status." }, { status: 400 });
    await db.update(editorialPlans).set({ status: String(body.action), updatedAt: time }).where(eq(editorialPlans.id, body.id));
    await audit(db, email, `editorial_plan_${body.action}`, "editorial_plan", body.id); return Response.json({ ok: true });
  }
  if (kind === "editorial_graphic") {
    if (role !== "owner") return Response.json({ error: "Only the Owner can select a public MyRPG editorial graphic." }, { status: 403 });
    const graphic = String(body.value || "");
    if (!body.id || !["neutral", "fantasy", "science", "science-transit", "science-campaign", "anime", "historical", "strategy", "fantasy-live", "science-profile", "anime-update", "historical-world", "neutral-industry"].includes(graphic)) return Response.json({ error: "Choose a valid MyRPG editorial graphic." }, { status: 400 });
    if (body.action !== "article" && body.action !== "game") return Response.json({ error: "Choose an article or game record." }, { status: 400 });
    if (body.action === "article") { const record = await db.select().from(articles).where(eq(articles.id, body.id)).limit(1); if (!record[0] || record[0].status !== "published") return Response.json({ error: "Editorial graphics can only be selected for published records." }, { status: 409 }); await db.update(articles).set({ editorialGraphic: graphic, updatedAt: stamp() }).where(eq(articles.id, body.id)); }
    else { const record = await db.select().from(games).where(eq(games.id, body.id)).limit(1); if (!record[0]?.published) return Response.json({ error: "Editorial graphics can only be selected for published records." }, { status: 409 }); await db.update(games).set({ editorialGraphic: graphic, updatedAt: stamp() }).where(eq(games.id, body.id)); }
    await audit(db, email, "editorial_graphic_selected", body.action, body.id, { graphic, rights: "Original MyRPG editorial artwork; not gameplay." });
    return Response.json({ ok: true });
  }
  if (kind === "timeline") {
    if (!["owner", "admin"].includes(role)) return Response.json({ error: "Owner or Admin access required." }, { status: 403 });
    if (body.action === "create") {
      const gameId = String(body.gameId || ""); const title = String(body.title || "").trim(); const explanation = String((body as any).explanation || "").trim(); const eventType = String((body as any).eventType || ""); const eventDate = String((body as any).eventDate || ""); const dateConfidence = String(body.dateConfidence || ""); const sourceUrl = normalizedOrEmpty(body.sourceUrl); const citation = String((body as any).citation || "").trim(); const factCheckedAt = String(body.factCheckedAt || "");
      if (!gameId || !title || !explanation || !["launch","early_access_launch","major_update","platform_release","confirmed_delay","status_change","business_model_change","sunset","material_correction"].includes(eventType) || !/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !["confirmed","estimated","unconfirmed"].includes(dateConfidence) || !sourceUrl || !citation || !factCheckedAt) return Response.json({ error: "Complete every required factual timeline field." }, { status: 400 });
      const game = (await db.select().from(games).where(eq(games.id, gameId)).limit(1))[0]; if (!game?.published) return Response.json({ error: "Timeline events require a published related game." }, { status: 409 });
      const host = new URL(sourceUrl).hostname; if (!(await db.select().from(sources).where(eq(sources.domain, host)).limit(1))[0]?.approved) return Response.json({ error: "Source domain must be approved first." }, { status: 400 });
      const eventFingerprint = fingerprint(`timeline|${gameId}|${eventType}|${eventDate}|${sourceUrl}`); if ((await db.select().from(gameTimelineEvents).where(eq(gameTimelineEvents.fingerprint, eventFingerprint)).limit(1))[0]) return Response.json({ error: "Duplicate timeline event fingerprint." }, { status: 409 });
      const eventId = id(); await db.insert(gameTimelineEvents).values({ id:eventId, gameId, title, explanation, eventType, eventDate, dateConfidence, sourceUrl, normalizedSourceUrl:sourceUrl, citation, factCheckedAt, confidence:String((body as any).confidence || "high"), reviewStatus:"draft", published:false, fingerprint:eventFingerprint, articleId:String(body.articleId || "").trim() || null, calendarItemId:String((body as any).calendarItemId || "").trim() || null, createdAt:time, updatedAt:time });
      await audit(db, email, "timeline_created", "game_timeline_event", eventId, { gameId, eventType, eventDate, sourceUrl, eventFingerprint }); return Response.json({ ok:true });
    }
    if (!body.id) return Response.json({ error:"Timeline event required." }, { status:400 });
    const event = (await db.select().from(gameTimelineEvents).where(eq(gameTimelineEvents.id, body.id)).limit(1))[0]; if (!event) return Response.json({ error:"Timeline event not found." }, { status:404 });
    if (["approve","publish","unpublish"].includes(String(body.action)) && role !== "owner") return Response.json({ error:"Only the Owner can make the final timeline decision." }, { status:403 });
    const action = String(body.action); const patch = action === "approve" ? { reviewStatus:"approved", updatedAt:time } : action === "publish" ? { published:true, reviewStatus:"approved", updatedAt:time } : action === "unpublish" ? { published:false, updatedAt:time } : action === "reject" ? { published:false, reviewStatus:"rejected", updatedAt:time } : action === "archive" ? { published:false, reviewStatus:"archived", updatedAt:time } : action === "restore" ? { reviewStatus:"draft", updatedAt:time } : null;
    if (!patch) return Response.json({ error:"Unsupported timeline action." }, { status:400 }); if (action === "publish" && event.reviewStatus !== "approved") return Response.json({ error:"Owner approval is required before publication." }, { status:409 });
    await db.update(gameTimelineEvents).set(patch).where(eq(gameTimelineEvents.id, body.id)); await audit(db,email,`timeline_${action}`,"game_timeline_event",body.id,patch); return Response.json({ok:true});
  }
  if (kind === "correction") {
    if (role !== "owner") return Response.json({ error:"Only the Owner can manage the public correction record." }, { status:403 });
    if (body.action === "create") { const correctionType=String((body as any).correctionType||""); const targetType=String((body as any).targetType||""); const targetId=String((body as any).targetId||""); const summary=String((body as any).summary||"").trim(); const reason=String((body as any).reason||"").trim(); const sourceUrl=normalizedOrEmpty(body.sourceUrl); if(!["correction","update","clarification"].includes(correctionType)||!["article","game"].includes(targetType)||!targetId||!summary||!reason||!sourceUrl)return Response.json({error:"Complete every correction field."},{status:400}); const correctionId=id(); await db.insert(publicCorrections).values({id:correctionId,correctionType,targetType,targetId,summary,reason,sourceUrl,reviewStatus:"approved",published:false,createdAt:time,updatedAt:time}); await audit(db,email,"correction_created","public_correction",correctionId,{correctionType,targetType,targetId}); return Response.json({ok:true}); }
    if(!body.id)return Response.json({error:"Correction record required."},{status:400}); if(body.action==="publish"){await db.update(publicCorrections).set({published:true,publishedAt:time,reviewStatus:"approved",updatedAt:time}).where(eq(publicCorrections.id,body.id)); await audit(db,email,"correction_published","public_correction",body.id); return Response.json({ok:true});}
    return Response.json({error:"Unsupported correction action."},{status:400});
  }
  if (!allowed(role, kind)) return Response.json({ error: "Owner permission required" }, { status: 403 });
  if(kind==="game"){
    if(body.action==="create"){
      const fields=[body.name,body.slug,body.status,body.platforms,body.businessModel,body.combat,body.setting,body.focus,body.releaseDate,body.officialUrl,body.sourceUrl,body.factCheckedAt,body.directorySummary];
      if(fields.some(x=>!String(x||"").trim())||!String(body.slug).match(/^[a-z0-9-]+$/)) return Response.json({error:"All factual fields and the directory summary are required; slug must be lowercase letters, numbers, and hyphens."},{status:400});
      const normalizedSourceUrl=normalizedOrEmpty(body.sourceUrl); if(!normalizedSourceUrl) return Response.json({error:"Use a complete official source URL."},{status:400});
      const host=new URL(normalizedSourceUrl).hostname; const source=(await db.select().from(sources).where(eq(sources.domain,host)).limit(1))[0];
      if(!source?.approved) return Response.json({error:"Source domain must be approved first."},{status:400});
      const existing=await db.select().from(games); const duplicate=existing.find((game)=>game.slug===body.slug||normalizedOrEmpty(game.sourceUrl)===normalizedSourceUrl);
      if(duplicate) return Response.json({error:`Duplicate game candidate: this ${duplicate.slug===body.slug?"slug":"normalized official source URL"} already belongs to ${duplicate.name}.`},{status:409});
      const releaseDateConfidence=["confirmed","estimated","unconfirmed"].includes(body.releaseDateConfidence||"")?body.releaseDateConfidence!:"unconfirmed";
      await db.insert(games).values({id:id(),slug:body.slug!,name:body.name!,status:body.status!,platforms:body.platforms!,businessModel:body.businessModel!,combat:body.combat!,setting:body.setting!,focus:body.focus!,activity:body.activity?.trim()||null,timeCommitment:body.timeCommitment?.trim()||null,multiplayerType:body.multiplayerType?.trim()||null,worldModel:body.worldModel?.trim()||null,lifecycleStatus:body.lifecycleStatus?.trim()||body.status!,releaseDate:body.releaseDate!,releaseDateConfidence,officialUrl:normalizedOrEmpty(body.officialUrl),sourceUrl:normalizedSourceUrl,factCheckedAt:body.factCheckedAt!,directorySummary:body.directorySummary!,sourceConfidence:"high",reviewStatus:"draft",published:false,createdAt:time,updatedAt:time});
      await audit(db,email,"game_created","game",body.slug,{normalizedSourceUrl,sourceFingerprint:fingerprint(`game|${body.slug}|${normalizedSourceUrl}`)}); return Response.json({ok:true});
    }
    if(!body.id)return Response.json({error:"Game required"},{status:400});if(body.action==="publish"&&role!=="owner")return Response.json({error:"Only the Owner can publish games."},{status:403});const game=(await db.select().from(games).where(eq(games.id,body.id)).limit(1))[0];if(!game)return Response.json({error:"Game not found"},{status:404});if(body.action==="approve"&&role!=="owner")return Response.json({error:"Only the Owner can approve a game."},{status:403});if(body.action==="correct"){if(role!=="owner")return Response.json({error:"Only the Owner can correct verified factual fields."},{status:403});const normalizedSourceUrl=normalizedOrEmpty(String(body.sourceUrl||game.sourceUrl));if(!normalizedSourceUrl)return Response.json({error:"Use a complete approved official source URL."},{status:400});const host=new URL(normalizedSourceUrl).hostname;if(!(await db.select().from(sources).where(eq(sources.domain,host)).limit(1))[0]?.approved)return Response.json({error:"Source domain must be approved first."},{status:400});const patch={status:body.status||game.status,platforms:body.platforms||game.platforms,businessModel:body.businessModel||game.businessModel,combat:body.combat||game.combat,setting:body.setting||game.setting,focus:body.focus||game.focus,activity:body.activity||null,timeCommitment:body.timeCommitment||null,releaseDate:body.releaseDate||game.releaseDate,releaseDateConfidence:["confirmed","estimated","unconfirmed"].includes(body.releaseDateConfidence||"")?body.releaseDateConfidence!:game.releaseDateConfidence,officialUrl:normalizedOrEmpty(String(body.officialUrl||game.officialUrl)),sourceUrl:normalizedSourceUrl,factCheckedAt:body.factCheckedAt||game.factCheckedAt,directorySummary:body.directorySummary||game.directorySummary,sourceConfidence:body.sourceConfidence||game.sourceConfidence,updatedAt:time};await db.update(games).set(patch).where(eq(games.id,body.id));await audit(db,email,"game_facts_corrected","game",body.id,{...patch,sourceFingerprint:fingerprint(`game|${game.slug}|${normalizedSourceUrl}`)});return Response.json({ok:true})}if(body.action==="edit"){await db.update(games).set({directorySummary:String(body.value??""),updatedAt:time}).where(eq(games.id,body.id));await audit(db,email,"game_edited","game",body.id);return Response.json({ok:true})}if(body.action==="publish"){const required=[game.name,game.slug,game.status,game.platforms,game.businessModel,game.combat,game.setting,game.focus,game.releaseDate,game.officialUrl,game.sourceUrl,game.factCheckedAt,game.directorySummary];if(required.some(x=>!x))return Response.json({error:"Publish readiness blocked: required factual fields or directory summary are incomplete."},{status:409});if(game.reviewStatus!=="approved")return Response.json({error:"Publish readiness blocked: Owner approval is required."},{status:409});let host="";try{host=new URL(game.sourceUrl!).hostname.replace(/^www\./,"")}catch{}if(!(await db.select().from(sources).where(eq(sources.domain,host)).limit(1))[0]?.approved)return Response.json({error:"Publish readiness blocked: source is not approved."},{status:409});await db.update(games).set({published:true,updatedAt:time}).where(eq(games.id,body.id));}else if(body.action==="unpublish")await db.update(games).set({published:false,updatedAt:time}).where(eq(games.id,body.id));else {const reviewStates:Record<string,string>={approve:"approved",reject:"rejected",archive:"archived",restore:"draft"};const reviewStatus=reviewStates[body.action||""];if(!reviewStatus)return Response.json({error:"Unknown game action"},{status:400});await db.update(games).set({reviewStatus,updatedAt:time}).where(eq(games.id,body.id));}await audit(db,email,`game_${body.action}`,"game",body.id);return Response.json({ok:true})}
  if(kind==="calendar"){
    if(body.action==="create"){
      if(!body.gameId||!body.title||!body.dateLabel||!body.sourceUrl||!body.factCheckedAt) return Response.json({error:"Calendar title, game, source, fact-check date, and date label are required."},{status:400});
      const normalizedSourceUrl=normalizedOrEmpty(body.sourceUrl); if(!normalizedSourceUrl) return Response.json({error:"Use a complete approved official source URL."},{status:400});
      const host=new URL(normalizedSourceUrl).hostname; if(!(await db.select().from(sources).where(eq(sources.domain,host)).limit(1))[0]?.approved) return Response.json({error:"Calendar source domain must be approved first."},{status:400});
      const candidateFingerprint=calendarFingerprint(body.gameId,body.dateLabel,normalizedSourceUrl); const existing=await db.select().from(calendarItems);
      if(existing.some((item)=>calendarFingerprint(item.gameId,item.dateLabel,normalizedOrEmpty(item.sourceUrl))===candidateFingerprint)) return Response.json({error:"Duplicate calendar candidate: the same game, date label, and normalized official source are already recorded."},{status:409});
      await db.insert(calendarItems).values({id:id(),gameId:body.gameId,title:body.title,dateLabel:body.dateLabel,dateConfidence:["confirmed","estimated","unconfirmed"].includes(body.dateConfidence||"")?body.dateConfidence!:"unconfirmed",sourceUrl:normalizedSourceUrl,factCheckedAt:body.factCheckedAt,reviewStatus:"draft",published:false,createdAt:time,updatedAt:time});
      await audit(db,email,"calendar_created","calendar",body.gameId,{normalizedSourceUrl,calendarFingerprint:candidateFingerprint}); return Response.json({ok:true});
    }
    if(!body.id)return Response.json({error:"Calendar item required"},{status:400});const item=(await db.select().from(calendarItems).where(eq(calendarItems.id,body.id)).limit(1))[0];if(!item)return Response.json({error:"Calendar item not found"},{status:404});if(body.action==="correct"){if(role!=="owner")return Response.json({error:"Only the Owner can correct calendar facts."},{status:403});const normalizedSourceUrl=normalizedOrEmpty(String(body.sourceUrl||item.sourceUrl));if(!normalizedSourceUrl)return Response.json({error:"Use a complete approved official source URL."},{status:400});const host=new URL(normalizedSourceUrl).hostname;if(!(await db.select().from(sources).where(eq(sources.domain,host)).limit(1))[0]?.approved)return Response.json({error:"Source domain must be approved first."},{status:400});const patch={title:body.title||item.title,dateLabel:body.dateLabel||item.dateLabel,dateConfidence:["confirmed","estimated","unconfirmed"].includes(body.dateConfidence||"")?body.dateConfidence!:item.dateConfidence,sourceUrl:normalizedSourceUrl,factCheckedAt:body.factCheckedAt||item.factCheckedAt,updatedAt:time};await db.update(calendarItems).set(patch).where(eq(calendarItems.id,body.id));await audit(db,email,"calendar_facts_corrected","calendar",body.id,{...patch,calendarFingerprint:calendarFingerprint(item.gameId,patch.dateLabel,normalizedSourceUrl)});return Response.json({ok:true})}if(body.action==="approve"&&role!=="owner")return Response.json({error:"Only the Owner can approve a calendar item."},{status:403});if(body.action==="publish"){if(role!=="owner")return Response.json({error:"Only the Owner can publish a calendar item."},{status:403});if(item.reviewStatus!=="approved")return Response.json({error:"Publish readiness blocked: Owner approval is required."},{status:409});if(item.dateConfidence==="unconfirmed")return Response.json({error:"Publish readiness blocked: release-date confidence is unresolved."},{status:409});let host="";try{host=new URL(item.sourceUrl).hostname.toLowerCase().replace(/^www\./,"")}catch{}if(!(await db.select().from(sources).where(eq(sources.domain,host)).limit(1))[0]?.approved)return Response.json({error:"Publish readiness blocked: source is not approved."},{status:409});await db.update(calendarItems).set({published:true,updatedAt:time}).where(eq(calendarItems.id,body.id));}else{const states:Record<string,string>={approve:"approved",reject:"rejected",archive:"archived",restore:"draft",unpublish:"draft"};const reviewStatus=states[body.action||""];if(!reviewStatus)return Response.json({error:"Unknown calendar action"},{status:400});await db.update(calendarItems).set({reviewStatus,published:body.action==="unpublish"?false:item.published,updatedAt:time}).where(eq(calendarItems.id,body.id));}await audit(db,email,`calendar_${body.action}`,"calendar",body.id);return Response.json({ok:true});}
  if (kind === "article" && body.action === "intake") {
    if (role === "editor") return Response.json({ error: "Only an Owner or Admin can create an official announcement intake record." }, { status: 403 });
    if (!body.title || !body.sourceUrl || !body.factCheckedAt || !body.releaseDate || !body.gameId || !body.value) return Response.json({ error: "Title, official announcement URL, related published game, source date, fact-check date, and draft are required." }, { status: 400 });
    let normalizedUrl = ""; let host = "";
    try { normalizedUrl = normalizeUrl(String(body.sourceUrl)); host = new URL(normalizedUrl).hostname; } catch { return Response.json({ error: "Use a complete official announcement URL." }, { status: 400 }); }
    const source = (await db.select().from(sources).where(eq(sources.domain, host)).limit(1))[0];
    if (!source?.approved) return Response.json({ error: "That source domain is not approved in the Source Registry." }, { status: 400 });
    const sourceDate = new Date(String(body.releaseDate)); const factChecked = new Date(String(body.factCheckedAt));
    if (Number.isNaN(sourceDate.valueOf()) || Number.isNaN(factChecked.valueOf())) return Response.json({ error: "Source date and fact-check date must be valid dates." }, { status: 400 });
    if (sourceDate.valueOf() > Date.now() + 86400000) return Response.json({ error: "The official source date cannot be in the future." }, { status: 400 });
    const retrospective = Boolean(body.retrospective); const sourceAge = Date.now() - sourceDate.valueOf();
    if (retrospective && sourceAge > 60 * 86400000) return Response.json({ error: "Retrospective candidates must use an official source from the previous 60 days." }, { status: 400 });
    if (!retrospective && sourceAge > 180 * 86400000) return Response.json({ error: "This announcement is more than 180 days old. Hold it unless a current official update supports it." }, { status: 400 });
    const relatedGame = (await db.select().from(games).where(eq(games.slug, String(body.gameId))).limit(1))[0];
    if (!relatedGame?.published) return Response.json({ error: "Choose a published game profile for the related-game link." }, { status: 400 });
    const draft = String(body.value).trim();
    const minimumWords = retrospective ? 140 : 120; const maximumWords = retrospective ? 220 : 180;
    if (words(draft) < minimumWords || words(draft) > maximumWords) return Response.json({ error: `The factual draft must be ${minimumWords}–${maximumWords} words.` }, { status: 400 });
    const gamerTakeaway = String(body.gamerTakeaway || "").trim();
    if (retrospective && gamerTakeaway.length < 24) return Response.json({ error: "Retrospective coverage requires a concise Why this still matters takeaway." }, { status: 400 });
    const contentFingerprint = fingerprint(`${normalizedUrl}|${String(body.title).trim().toLowerCase()}`);
    const duplicateCache = (await db.select().from(sourceCache).where(eq(sourceCache.normalizedUrl, normalizedUrl)).limit(1))[0];
    const duplicateArticle = (await db.select().from(articles).where(eq(articles.contentFingerprint, contentFingerprint)).limit(1))[0];
    if (duplicateCache || duplicateArticle) return Response.json({ error: "Duplicate announcement detected. This official URL or content fingerprint is already in the intake workflow." }, { status: 409 });
    const pending = await db.select().from(articles);
    const activeRetrospectives = pending.filter((article) => article.retrospective && !["published", "rejected", "archived"].includes(article.status)).length;
    const activeCurrent = pending.filter((article) => !article.retrospective && !["published", "rejected", "archived"].includes(article.status)).length;
    if ((retrospective && activeRetrospectives >= 8) || (!retrospective && activeCurrent >= 3)) return Response.json({ error: retrospective ? "The retrospective review batch limit is eight active candidates." : "The private announcement intake limit is three active candidates. Review or archive an existing item first." }, { status: 409 });
    const baseSlug = makeSlug(String(body.title)); const articleId = id(); const slug = `${baseSlug}-${contentFingerprint.slice(-6)}`;
    if ((await db.select().from(articles).where(eq(articles.slug, slug)).limit(1))[0]) return Response.json({ error: "A matching article slug already exists." }, { status: 409 });
    await db.insert(articles).values({ id: articleId, slug, title: String(body.title).trim(), summary: draft, status: "review", sourceUrl: normalizedUrl, sourceDate: sourceDate.toISOString(), gamerTakeaway: gamerTakeaway || "Check the official announcement for requirements, timing, and scope before making plans.", retrospective, contentFingerprint, confidence: 95, factCheckedAt: factChecked.toISOString(), createdAt: time, updatedAt: time });
    await db.insert(sourceCache).values({ id: id(), normalizedUrl, contentHash: contentFingerprint, sourceId: source.id, lastCheckedAt: factChecked.toISOString(), createdAt: time, updatedAt: time });
    const intake = { manualIntake: true, noModel: true, retrospective, normalizedUrl, sourceDate: sourceDate.toISOString(), gameSlug: relatedGame.slug, gameName: relatedGame.name, citation: normalizedUrl, sourceConfidence: "high", duplicate: "clear", validation: "pass", gamerTakeaway: gamerTakeaway || "Check the official announcement for requirements, timing, and scope before making plans.", recommendation: "approve after Owner confirms the source, factual summary, citation, original source date, and fallback media." };
    for (const agent of ["validator", "editor", "director_review"] as const) await db.insert(agentRuns).values({ id: id(), agent, status: "completed", itemId: articleId, plannedCostCents: 0, actualCostCents: 0, outputJson: JSON.stringify(intake), createdAt: time, updatedAt: time });
    await audit(db, email, retrospective ? "article_retrospective_intake" : "article_official_announcement_intake", "article", articleId, intake);
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
    if(body.action==="publish") { let host="";try{host=new URL(currentArticle.sourceUrl).hostname.toLowerCase().replace(/^www\./,"")}catch{} const approved=(await db.select().from(sources).where(eq(sources.domain,host)).limit(1))[0]?.approved; const cache=(await db.select().from(sourceCache).where(eq(sourceCache.contentHash,currentArticle.contentFingerprint||"")).limit(1))[0]; const decisions=await db.select().from(reviewDecisions).where(eq(reviewDecisions.articleId,currentArticle.id)); const ownerApproved=decisions.some(decision=>decision.decision==="approve"); const fresh=currentArticle.factCheckedAt&&Date.now()-new Date(currentArticle.factCheckedAt).valueOf()<=180*86400000; const minimum=currentArticle.retrospective?140:120; const maximum=currentArticle.retrospective?220:180; const checklist=[Boolean(currentArticle.title.trim()),words(currentArticle.summary)>=minimum&&words(currentArticle.summary)<=maximum,Boolean(currentArticle.factCheckedAt),Boolean(fresh),Boolean(approved),Boolean(cache),!currentArticle.retrospective||Boolean(currentArticle.sourceDate&&currentArticle.gamerTakeaway),ownerApproved,currentArticle.status==="review"]; if(checklist.some(v=>!v)) return Response.json({error:`Publication checklist incomplete: approved source, clear duplicate record, current fact-check, ${minimum}–${maximum}-word draft, required retrospective provenance, and explicit Owner approval are required. The labelled MyRPG fallback satisfies the lead-visual requirement when no approved media exists.`},{status:409}); }
    if (body.action === "edit") await db.update(articles).set({ summary: String(body.value ?? ""), updatedAt: time }).where(eq(articles.id, body.id));
    else await db.update(articles).set({ status, publishedAt: status === "published" ? time : null, updatedAt: time }).where(eq(articles.id, body.id));
    if (["approve", "reject", "archive", "restore", "publish", "unpublish"].includes(body.action || "")) await db.insert(reviewDecisions).values({ id: id(), articleId: body.id, decision: body.action!, decidedBy: email, createdAt: time });
    await audit(db, email, `article_${body.action}`, "article", body.id, { status });
    return Response.json({ ok: true });
  }
  if (kind === "media") {
    const officialTypes = ["official_press_kit","official_game_site","verified_store","official_trailer","owner_upload"];
    if (body.action === "add") {
      if (role !== "owner") return Response.json({ error: "Only the Owner can add media for approval." }, { status: 403 });
      if ((!body.articleId && !body.gameId) || !body.altText || !body.sourceType || !officialTypes.includes(body.sourceType) || !body.rightsNotes?.trim()) return Response.json({ error: "Choose one article or game, provide alt text, an approved source type, and rights notes." }, { status: 400 });
      if (body.articleId && body.gameId) return Response.json({ error: "Attach media to either one article or one game, not both." }, { status: 400 });
      const placement = ["lead","supporting","game-card","directory-card"].includes(body.placement || "") ? body.placement! : "lead";
      if (body.articleId && !["lead", "supporting"].includes(placement)) return Response.json({ error: "Article media can be lead or supporting placement only." }, { status: 400 });
      if (body.gameId && !["lead", "game-card", "directory-card"].includes(placement)) return Response.json({ error: "Game media can be lead, game-card, or directory-card placement only." }, { status: 400 });
      if (body.sourceType === "owner_upload" && !body.r2Key?.trim()) return Response.json({ error: "Owner uploads require an R2 object key." }, { status: 400 });
      if (body.sourceType !== "owner_upload") { if (!body.assetUrl || !body.sourceUrl) return Response.json({ error: "Official media requires both an asset URL and its approved official source URL." }, { status: 400 }); try { const host = new URL(String(body.sourceUrl)).hostname.toLowerCase().replace(/^www\./, ""); const allowedSource = await db.select().from(sources).where(eq(sources.domain, host)).limit(1); if (!allowedSource[0]?.approved) return Response.json({ error: "Official media source must be approved in Source Registry." }, { status: 400 }); } catch { return Response.json({ error: "Use a complete approved source URL." }, { status: 400 }); } }
      const attached = await db.select().from(mediaAssets).where(body.articleId ? eq(mediaAssets.articleId, body.articleId) : eq(mediaAssets.gameId, body.gameId!));
      if (placement === "lead" && attached.some((asset) => asset.placement === "lead" && asset.status !== "archived")) return Response.json({ error: "Only one lead visual is allowed per article or game." }, { status: 409 });
      if (body.articleId && placement === "supporting" && attached.filter((asset) => asset.placement === "supporting" && asset.status !== "archived").length >= 2) return Response.json({ error: "An article may have up to two supporting visuals." }, { status: 409 });
      await db.insert(mediaAssets).values({ id:id(), articleId:body.articleId||null, gameId:body.gameId||null, assetUrl:body.assetUrl||null, r2Key:body.r2Key||null, sourceUrl:body.sourceUrl||null, sourceType:body.sourceType, credit:body.credit||null, rightsNotes:body.rightsNotes.trim(), altText:body.altText, caption:body.caption||null, width:Math.max(1,Number(body.width)||1200), height:Math.max(1,Number(body.height)||675), placement, status:"pending_review", createdAt:time, updatedAt:time });
      await audit(db,email,"media_added","media",body.articleId||body.gameId,{sourceType:body.sourceType,placement,rightsNotes:body.rightsNotes}); return Response.json({ok:true});
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
