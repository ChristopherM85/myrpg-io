import { requireChatGPTUser } from "../chatgpt-auth";
import { getDb } from "../../db";
import { agentRuns, articles, auditEvents, budgetPolicies, calendarItems, editorialPlans, games, mediaAssets, searchEngineStatuses, siteSettings, sources, sourceWatchlist, users } from "../../db/schema";
import { desc, eq } from "drizzle-orm";
import Console from "./console";
import { editorialGraphic, recommendEditorialGraphic } from "../components/editorial-media";

export const dynamic = "force-dynamic";

function adjacentArtworkRuns(label: string, rows: any[]) {
  const findings: { route: string; graphic: string; count: number; titles: string[] }[] = [];
  let start = 0;
  for (let index = 1; index <= rows.length; index++) {
    const previous = rows[index - 1]?.editorialGraphic || "neutral";
    const current = rows[index]?.editorialGraphic || "neutral";
    if (index < rows.length && current === previous) continue;
    const count = index - start;
    if (count > 2) findings.push({ route: label, graphic: previous, count, titles: rows.slice(start, index).map((row) => row.title || row.name) });
    start = index;
  }
  return findings;
}

export default async function AdminPage() {
  const user = await requireChatGPTUser("/admin");
  let role = "owner";
  let data: any = { articles: [], games: [], sources: [], sourceWatchlist: [], runs: [], audits: [], media: [], searchStatuses: [], editorialPlans: [], dailyEditorial: { enabled: false, dailyCap: 1000, perSlotCap: 250, latest: null, slots: [] }, cadence: { planned: 0, ready: 0, published: 0, blocked: 0, stale: 0 }, visualCoverage: { approved: 0, fallback: 0, pending: 0, metadata: 0 }, launchBatch: { ready: 0, correction: 0, hold: 0 }, overview: { articles: 0, games: 0, calendar: 0, published: 0 }, health: { records: [], seoIssues: 0, approvedSources: 0, nextAction: "Add an approved source before preparing a private record.", seoItems: [] }, launchGate: { published: { articles: 0, games: 0, calendar: 0 }, freshness: { current: 0, stale: 0, thresholdDays: 30 }, sitemap: { eligible: 0, blocked: 0 }, blockers: ["D1 data is unavailable; restore storage before assessing launch readiness."], routes: [], checkedAt: new Date().toISOString(), verificationNote: "Storage was unavailable for this structural check. Restore D1 before assessing launch readiness." }, settings: { simulation: true, promotion: true, daily: 1000, perJob: 250, stop: false } };
  try {
    const db = getDb(); let me = (await db.select().from(users).where(eq(users.email, user.email)).limit(1))[0];
    if (!me) { const any = await db.select().from(users).limit(1); role = any.length ? "editor" : "owner"; const now = new Date().toISOString(); await db.insert(users).values({ id: crypto.randomUUID(), email: user.email, role: role as "owner" | "admin" | "editor", createdAt: now, updatedAt: now }); } else role = me.role;
    const [articleRows, allArticles, sourceRows, watchRows, runRows, auditRows, mediaRows, budgets, settings, gameRows, calendarRows, searchRows, planRows] = await Promise.all([db.select().from(articles).orderBy(desc(articles.createdAt)).limit(16), db.select().from(articles), db.select().from(sources), db.select().from(sourceWatchlist), db.select().from(agentRuns).orderBy(desc(agentRuns.createdAt)).limit(20), db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(20), db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt)), db.select().from(budgetPolicies).limit(1), db.select().from(siteSettings).limit(1), db.select().from(games), db.select().from(calendarItems), db.select().from(searchEngineStatuses), db.select().from(editorialPlans).orderBy(desc(editorialPlans.proposedDate))]);
    const dailySlotRows = runRows.filter((run) => run.itemId?.startsWith("daily:")).map((run) => { let output: any = {}; try { output = JSON.parse(run.outputJson || "{}"); } catch { /* Keep an invalid stored run visible as blocked. */ } return { id: run.id, desk: output.desk || run.itemId?.split(":")[2] || "unknown", writer: output.writer || "MyRPG editorial desk", status: run.status, blocker: run.stoppedReason, articleId: null }; });
    const latestDailyRun = dailySlotRows[0] ? { runDate: String(runRows.find((run) => run.id === dailySlotRows[0].id)?.itemId || "").split(":")[1] || "", status: dailySlotRows.every((slot) => slot.status === "blocked") ? "paused_source_gate" : "completed", stoppedReason: dailySlotRows[0].blocker } : null;
    const publishedTargets = [...allArticles.filter((article) => article.status === "published").map((article) => `article:${article.id}`), ...gameRows.filter((game) => game.published).map((game) => `game:${game.id}`)];
    const targetFor = (asset: any) => asset.articleId ? `article:${asset.articleId}` : asset.gameId ? `game:${asset.gameId}` : "";
    const leadApproved = new Set(mediaRows.filter((asset) => asset.status === "approved" && asset.placement === "lead").map(targetFor));
    const pendingTargets = new Set(mediaRows.filter((asset) => asset.status === "pending_review").map(targetFor));
    const metadataIssues = mediaRows.filter((asset) => !asset.altText || !asset.rightsNotes || !asset.width || !asset.height || (!asset.articleId && !asset.gameId)).length;
    const publishedArticleRows = allArticles.filter((article) => article.status === "published").sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
    const publishedGameRows = gameRows.filter((game) => game.published);
    const visualItems = [
      ...publishedArticleRows.map((article) => { const target = `article:${article.id}`; const asset = mediaRows.find((item) => targetFor(item) === target && item.placement === "lead"); const recommendation = recommendEditorialGraphic({ kind: "article", title: article.title }); return { id: article.id, kind: "article", title: article.title, state: leadApproved.has(target) ? "approved official visual" : pendingTargets.has(target) ? "pending media review" : "MyRPG fallback in use", graphic: article.editorialGraphic || "neutral", recommendation, recommendationLabel: editorialGraphic(recommendation).label, assetId: asset?.id || null, previewHref: `/admin/preview/article/${article.id}` }; }),
      ...publishedGameRows.map((game) => { const target = `game:${game.id}`; const asset = mediaRows.find((item) => targetFor(item) === target && item.placement === "lead"); const recommendation = recommendEditorialGraphic({ kind: "game", title: game.name, setting: game.setting }); return { id: game.id, kind: "game", title: game.name, state: leadApproved.has(target) ? "approved official visual" : pendingTargets.has(target) ? "pending media review" : "MyRPG fallback in use", graphic: game.editorialGraphic || "neutral", recommendation, recommendationLabel: editorialGraphic(recommendation).label, assetId: asset?.id || null, previewHref: `/admin/preview/game/${game.id}` }; }),
    ];
    const artworkGroups = [...new Set(visualItems.map((item) => item.graphic))].map((graphic) => ({ graphic, label: editorialGraphic(graphic).label, count: visualItems.filter((item) => item.graphic === graphic).length })).sort((a, b) => b.count - a.count);
    const duplication = [
      ...adjacentArtworkRuns("Home · latest news", publishedArticleRows.slice(0, 4)),
      ...adjacentArtworkRuns("Home · featured games", publishedGameRows.slice(0, 6)),
      ...adjacentArtworkRuns("News", publishedArticleRows),
      ...adjacentArtworkRuns("Official Updates", publishedArticleRows),
      ...adjacentArtworkRuns("Games", publishedGameRows),
      ...adjacentArtworkRuns("MMO Radar", [...publishedGameRows].sort((a, b) => String(b.factCheckedAt || "").localeCompare(String(a.factCheckedAt || "")))),
    ].map((finding) => ({ ...finding, label: editorialGraphic(finding.graphic).label }));
    const visualCoverage = { approved: publishedTargets.filter((target) => leadApproved.has(target)).length, fallback: publishedTargets.filter((target) => !leadApproved.has(target)).length, pending: [...pendingTargets].filter(Boolean).length, metadata: metadataIssues, items: visualItems, artworkGroups, duplication };
    const launchBatch = { ready: 0, correction: 0, hold: 0 };
    const classify = (record: any, type: "article" | "game" | "calendar") => { if (record.published || record.status === "published") return; if (record.reviewStatus === "archived" || record.reviewStatus === "rejected" || record.status === "archived" || record.status === "rejected") { launchBatch.hold++; return; } if (type === "article") { const words = String(record.summary || "").trim().split(/\s+/).filter(Boolean).length; record.status === "review" && record.sourceUrl && record.factCheckedAt && words >= 120 && words <= 180 ? launchBatch.ready++ : launchBatch.correction++; return; } if (type === "calendar") { record.dateConfidence === "unconfirmed" ? launchBatch.hold++ : record.sourceUrl && record.factCheckedAt ? launchBatch.ready++ : launchBatch.correction++; return; } record.sourceConfidence === "high" && record.sourceUrl && record.factCheckedAt ? launchBatch.ready++ : launchBatch.hold++; };
    allArticles.forEach((record) => classify(record, "article")); gameRows.forEach((record) => classify(record, "game")); calendarRows.forEach((record) => classify(record, "calendar"));
    const intakeByArticle = new Map<string, any>();
    for (const run of runRows.filter((run) => run.agent === "director_review" && run.outputJson && run.itemId)) { try { intakeByArticle.set(run.itemId!, JSON.parse(run.outputJson!)); } catch { /* Invalid review metadata remains absent rather than guessed. */ } }
    const enrichedArticles = articleRows.map((article) => { const intake = intakeByArticle.get(article.id); return { ...article, sourceDate: article.sourceDate || intake?.sourceDate || null, relatedGame: intake?.gameName || null, recommendation: intake?.recommendation || "edit", gamerTakeaway: article.gamerTakeaway || intake?.gamerTakeaway || "Check the official announcement for requirements, timing, and scope before making plans.", retrospective: article.retrospective || Boolean(intake?.retrospective) }; });
    const approvedDomains = new Set(sourceRows.filter((source) => source.approved).map((source) => source.domain.toLowerCase()));
    const sourceApproved = (url?: string | null) => { try { return approvedDomains.has(new URL(url || "").hostname.toLowerCase().replace(/^www\./, "")); } catch { return false; } };
    const hasLead = (target: string) => leadApproved.has(target);
    const healthRecords = [
      ...allArticles.filter((article) => article.status === "published").map((article) => ({ kind: "article", factCheckedAt: article.factCheckedAt, approvedMedia: hasLead(`article:${article.id}`), fallback: !hasLead(`article:${article.id}`), valid: Boolean(article.title?.trim() && article.summary?.trim() && article.sourceUrl && article.factCheckedAt && sourceApproved(article.sourceUrl)) })),
      ...gameRows.filter((game) => game.published).map((game) => ({ kind: "game", factCheckedAt: game.factCheckedAt, approvedMedia: hasLead(`game:${game.id}`), fallback: !hasLead(`game:${game.id}`), valid: Boolean(game.name?.trim() && game.slug?.trim() && game.directorySummary?.trim() && game.sourceUrl && game.factCheckedAt && sourceApproved(game.sourceUrl)) })),
      ...calendarRows.filter((item) => item.published).map((item) => ({ kind: "calendar", factCheckedAt: item.factCheckedAt, approvedMedia: false, fallback: false, valid: Boolean(item.title?.trim() && item.sourceUrl && item.factCheckedAt && sourceApproved(item.sourceUrl)) })),
    ];
    const seoItems = [
      ...allArticles.filter((article) => article.status === "published").map((article) => ({ name: article.title, kind: "article", issues: [!article.slug && "missing stable URL", !article.title.trim() && "missing title", !article.summary.trim() && "missing description", !article.sourceUrl && "missing citation", !article.factCheckedAt && "missing fact-check date", !sourceApproved(article.sourceUrl) && "source is not approved", !article.contentFingerprint && "missing duplicate record"].filter(Boolean) as string[] })),
      ...gameRows.filter((game) => game.published).map((game) => ({ name: game.name, kind: "game", issues: [!game.slug && "missing stable URL", !game.name.trim() && "missing title", !game.directorySummary?.trim() && "missing description", !game.sourceUrl && "missing citation", !game.factCheckedAt && "missing fact-check date", !sourceApproved(game.sourceUrl) && "source is not approved", !game.setting || !game.platforms || !game.businessModel || !game.combat || !game.focus ? "incomplete VideoGame schema fields" : ""].filter(Boolean) as string[] })),
    ];
    const publishedArticles = allArticles.filter((article) => article.status === "published");
    const publishedGames = gameRows.filter((game) => game.published);
    const publishedCalendar = calendarRows.filter((item) => item.published);
    const freshnessThresholdDays = 30;
    const freshnessCutoff = Date.now() - freshnessThresholdDays * 86400000;
    const currentFactChecks = healthRecords.filter((record) => record.factCheckedAt && Date.parse(record.factCheckedAt) >= freshnessCutoff).length;
    const staleFactChecks = healthRecords.length - currentFactChecks;
    const eligibleForSitemap = healthRecords.filter((record) => record.valid).length;
    const privateGamesAwaitingOwner = gameRows.filter((game) => !game.published && game.reviewStatus !== "approved" && game.reviewStatus !== "rejected" && game.reviewStatus !== "archived").length;
    const privateCalendarAwaitingOwner = calendarRows.filter((item) => !item.published && item.reviewStatus !== "approved" && item.reviewStatus !== "rejected" && item.reviewStatus !== "archived").length;
    const privateArticlesAwaitingOwner = allArticles.filter((article) => article.status !== "published" && article.status !== "rejected" && article.status !== "archived").length;
    const launchBlockers = [
      !publishedGames.length && "No Owner-published game profile is available for the public directory.",
      !publishedArticles.length && "No Owner-published article is available for News, RSS, or Official Updates.",
      !publishedCalendar.length && "No Owner-published calendar item is available for the confirmed-release module.",
      staleFactChecks > 0 && `${staleFactChecks} published record${staleFactChecks === 1 ? " needs" : "s need"} a manual fact-check refresh at the ${freshnessThresholdDays}-day threshold.`,
      healthRecords.filter((record) => !record.valid).length > 0 && `${healthRecords.filter((record) => !record.valid).length} published record${healthRecords.filter((record) => !record.valid).length === 1 ? " is" : "s are"} missing source-backed sitemap prerequisites.`,
      privateGamesAwaitingOwner + privateCalendarAwaitingOwner + privateArticlesAwaitingOwner > 0 && `${privateGamesAwaitingOwner + privateCalendarAwaitingOwner + privateArticlesAwaitingOwner} private record${privateGamesAwaitingOwner + privateCalendarAwaitingOwner + privateArticlesAwaitingOwner === 1 ? " awaits" : "s await"} an Owner review decision.`,
    ].filter(Boolean) as string[];
    const publicRouteChecks = [
      { route: "/", label: "Home", visibility: "Public", detail: "Uses Owner-published records only; qualified gaps use editorial empty states." },
      { route: "/news", label: "News", visibility: "Public", detail: "Shows published, source-linked articles only." },
      { route: "/games", label: "Games", visibility: "Public", detail: "Shows published game profiles only; filter variants are noindex." },
      { route: "/calendar", label: "Calendar", visibility: "Public", detail: "Shows published calendar data only, with stored date confidence." },
      { route: "/compare", label: "Compare", visibility: "Public", detail: "Uses published factual game fields; parameterized selections are noindex." },
      { route: "/find-my-mmo", label: "Find My MMO", visibility: "Public", detail: "Matches published structured game data only." },
      { route: "/mmo-radar", label: "MMO Radar", visibility: "Public", detail: "Summarizes published factual fields without rankings or inferred claims." },
      { route: "/official-updates", label: "Official Updates", visibility: "Public", detail: "Includes only qualifying published, official-source article records." },
      { route: "/articles/[slug]", label: "Published articles", visibility: "Public", detail: `${publishedArticles.length} published record${publishedArticles.length === 1 ? " is" : "s are"} eligible for public article routes.` },
      { route: "/games/[slug]", label: "Game profiles", visibility: "Public", detail: `${publishedGames.length} published record${publishedGames.length === 1 ? " is" : "s are"} eligible for public game routes.` },
      { route: "/robots.txt", label: "Robots", visibility: "Public", detail: "Private, draft, preview, API, search, and filter surfaces retain protected or noindex intent." },
      { route: "/sitemap.xml", label: "Sitemap", visibility: "Public", detail: "Uses eligible published records only; private records are excluded." },
      { route: "/rss.xml", label: "RSS", visibility: "Public", detail: "Uses published article records only; drafts and private intake are excluded." },
    ];
    const nextAction = enrichedArticles.find((article) => article.status === "review" && article.title && article.sourceUrl && article.factCheckedAt) ? "Open the next article packet and confirm its source, fact-check date, draft, and fallback or approved lead visual." : gameRows.find((game) => !game.published && game.reviewStatus === "approved") ? "Open Game Management and review the first Owner-approved factual profile." : "Add an approved official source, then prepare one private factual record.";
    const cadence = { planned: planRows.filter((plan) => plan.status === "planned").length, ready: planRows.filter((plan) => plan.status === "ready").length, published: planRows.filter((plan) => plan.status === "published").length, blocked: planRows.filter((plan) => plan.status === "blocked").length, stale: staleFactChecks };
    data = { articles: enrichedArticles, games: gameRows.map((game) => ({ ...game, title: game.name })), sources: sourceRows, sourceWatchlist: watchRows, runs: runRows, audits: auditRows, media: mediaRows, searchStatuses: searchRows, editorialPlans: planRows, dailyEditorial: { enabled: !(budgets[0]?.emergencyStop ?? false), dailyCap: Math.min(budgets[0]?.dailyLimitCents ?? 1000, 1000), perSlotCap: Math.min(budgets[0]?.perJobLimitCents ?? 250, 250), latest: latestDailyRun, slots: dailySlotRows }, cadence, visualCoverage, launchBatch, overview: { articles: articleRows.filter((article) => article.status === "review").length, games: gameRows.filter((game) => !game.published && game.reviewStatus === "approved").length, calendar: calendarRows.filter((item) => !item.published && item.reviewStatus === "approved" && item.dateConfidence !== "unconfirmed").length, published: healthRecords.length }, health: { records: healthRecords, seoIssues: seoItems.reduce((count, item) => count + item.issues.length, 0), approvedSources: approvedDomains.size, nextAction, seoItems }, launchGate: { published: { articles: publishedArticles.length, games: publishedGames.length, calendar: publishedCalendar.length }, freshness: { current: currentFactChecks, stale: staleFactChecks, thresholdDays: 30 }, sitemap: { eligible: eligibleForSitemap, blocked: healthRecords.length - eligibleForSitemap }, blockers: launchBlockers, routes: publicRouteChecks, checkedAt: new Date().toISOString(), verificationNote: "This read-only structural check confirms route intent and stored publish eligibility. Complete a fresh production-browser pass before announcing the site." }, settings: { simulation: settings[0]?.simulationMode ?? true, promotion: settings[0]?.networkPromotionsEnabled ?? true, daily: budgets[0]?.dailyLimitCents ?? 1000, perJob: budgets[0]?.perJobLimitCents ?? 250, stop: budgets[0]?.emergencyStop ?? false } };
  } catch { /* The console has safe empty states while storage is unavailable. */ }
  return <><style>{`.console{display:block!important;min-height:100vh!important;max-width:1280px!important;margin:0 auto!important;padding:54px 32px 96px!important;background:#0d1018!important;color:#f0f0ed!important}.console h1{font-size:clamp(38px,5vw,62px)!important;line-height:.96!important;letter-spacing:-2.5px!important;margin:14px 0!important}.console>section{margin-top:44px!important;padding-top:28px!important;border-top:1px solid #2a3041!important}.console-grid{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(245px,1fr))!important;gap:12px!important;margin-top:20px!important}.console-card{min-width:0!important;padding:20px!important;border:1px solid #2a3041!important;background:#121622!important}.console-actions,.console .row{display:flex!important;flex-wrap:wrap!important;gap:9px!important}.console-actions{margin-top:25px!important}.console button{border:1px solid #2a3041!important;background:#171c29!important;color:#f0f0ed!important;padding:9px 12px!important;font-size:12px!important;font-weight:700!important}.source-form{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:9px!important;margin-top:18px!important;padding:18px!important;border:1px solid #2a3041!important;background:#121622!important}.source-form input,.source-form select,.source-form textarea{min-width:0!important;padding:10px!important;background:#0c1019!important;color:#f0f0ed!important;border:1px solid #2a3041!important}@media(max-width:800px){.console{padding:34px 18px 70px!important}.console-grid,.source-form{grid-template-columns:1fr!important}}`}</style><Console role={role} {...data} /></>;
}
