import { requireChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { agentRuns, articles, games, mediaAssets, sourceCache, sources, users } from "../../../db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function QualityPage() {
  const user = await requireChatGPTUser("/admin/quality");
  const issues: string[] = [];
  try {
    const db = getDb();
    const me = (await db.select().from(users).where(eq(users.email, user.email)).limit(1))[0];
    if (me?.role !== "owner") return <main><h1>Owner access required</h1></main>;
    const publishedArticles = await db.select().from(articles).where(eq(articles.status, "published"));
    const articleRuns = await db.select().from(agentRuns);
    const publishedGameSlugs = new Set((await db.select().from(games).where(eq(games.published, true))).map((game) => game.slug));
    const approvedDomains = new Set((await db.select().from(sources)).filter((source) => source.approved).map((source) => source.domain.toLowerCase()));
    const articleSlugs = new Set<string>();
    for (const article of publishedArticles) {
      if (!article.title.trim()) issues.push(`${article.id}: missing title`);
      if (!article.summary.trim()) issues.push(`${article.id}: missing description`);
      if (!article.sourceUrl) issues.push(`${article.id}: missing citation`);
      if (!article.factCheckedAt) issues.push(`${article.id}: missing fact-check date`);
      if (article.factCheckedAt && Date.now() - Date.parse(article.factCheckedAt) > 1000 * 60 * 60 * 24 * 180) issues.push(`${article.id}: fact check is older than 180 days`);
      if (article.sourceUrl) { try { const domain = new URL(article.sourceUrl).hostname.toLowerCase().replace(/^www\./, ""); if (!approvedDomains.has(domain)) issues.push(`${article.id}: source domain is not approved`); } catch { issues.push(`${article.id}: source URL is invalid`); } }
      if (!article.contentFingerprint || !(await db.select().from(sourceCache).where(eq(sourceCache.contentHash, article.contentFingerprint)).limit(1))[0]) issues.push(`${article.id}: duplicate-check record is missing`);
      const intake = articleRuns.filter((run) => run.itemId === article.id && run.outputJson).map((run) => { try { return JSON.parse(run.outputJson!); } catch { return null; } }).find(Boolean);
      if (!intake?.sourceDate) issues.push(`${article.id}: Official Updates source date is missing`);
      if (!article.summary.trim()) issues.push(`${article.id}: visible gamer takeaway is missing`);
      if (intake?.gameSlug && !publishedGameSlugs.has(intake.gameSlug)) issues.push(`${article.id}: related published game is missing`);
      if (articleSlugs.has(article.slug)) issues.push(`${article.id}: duplicate slug`);
      articleSlugs.add(article.slug);
    }
    const gameSlugs = new Set<string>();
    for (const game of await db.select().from(games)) {
      const prefix = game.published ? game.name : `${game.name} (review candidate)`;
      if (game.published && !game.status) issues.push(`${prefix}: MMO Radar status is missing`);
      if (game.published && !game.platforms) issues.push(`${prefix}: MMO Radar platform field is missing`);
      if (game.published && !game.releaseDateConfidence) issues.push(`${prefix}: MMO Radar release confidence is missing`);
      if (!game.activity) issues.push(`${prefix}: Find My MMO activity fit is missing`);
      if (!game.timeCommitment) issues.push(`${prefix}: Find My MMO time commitment is missing`);
      if (!game.directorySummary) issues.push(`${prefix}: factual directory summary is missing`);
      if (!game.sourceUrl) issues.push(`${prefix}: approved official source is missing`);
      if (!game.factCheckedAt) issues.push(`${prefix}: fact-check date is missing`);
      if (game.sourceUrl) { try { const domain = new URL(game.sourceUrl).hostname.toLowerCase().replace(/^www\./, ""); if (!approvedDomains.has(domain)) issues.push(`${prefix}: source domain is not approved`); } catch { issues.push(`${prefix}: source URL is invalid`); } }
      if (game.factCheckedAt && Date.now() - Date.parse(game.factCheckedAt) > 1000 * 60 * 60 * 24 * 30) issues.push(`${prefix}: fact check is older than 30 days`);
      if (gameSlugs.has(game.slug)) issues.push(`${prefix}: duplicate slug`); gameSlugs.add(game.slug);
      if (!game.published && game.reviewStatus !== "approved") issues.push(`${prefix}: Owner review decision is still required`);
    }
    const media = await db.select().from(mediaAssets);
    const activeMedia = media.filter((asset) => asset.status !== "archived");
    for (const asset of activeMedia) {
      const target = asset.articleId || asset.gameId;
      const prefix = `media ${asset.id}`;
      if (!target || (asset.articleId && asset.gameId)) issues.push(`${prefix}: target record is missing or invalid`);
      if (!asset.altText.trim()) issues.push(`${prefix}: alt text is missing`);
      if (!asset.rightsNotes?.trim()) issues.push(`${prefix}: rights notes are missing`);
      if (!asset.width || !asset.height) issues.push(`${prefix}: image dimensions are missing`);
      if (asset.articleId && !["lead", "supporting"].includes(asset.placement)) issues.push(`${prefix}: invalid article placement`);
      if (asset.gameId && !["lead", "game-card", "directory-card"].includes(asset.placement)) issues.push(`${prefix}: invalid game placement`);
      if (asset.sourceType === "owner_upload" && !asset.r2Key) issues.push(`${prefix}: owner upload is missing its private R2 key`);
      if (asset.sourceType !== "owner_upload") { if (!asset.sourceUrl) issues.push(`${prefix}: approved media source is missing`); else { try { const domain = new URL(asset.sourceUrl).hostname.toLowerCase().replace(/^www\./, ""); if (!approvedDomains.has(domain)) issues.push(`${prefix}: media source domain is not approved`); } catch { issues.push(`${prefix}: media source URL is invalid`); } } }
    }
    for (const [target, assets] of Object.entries(activeMedia.reduce<Record<string, typeof activeMedia>>((all, asset) => { const key = asset.articleId || asset.gameId || asset.id; (all[key] ||= []).push(asset); return all; }, {}))) {
      if (assets.filter((asset) => asset.placement === "lead").length > 1) issues.push(`media target ${target}: more than one active lead visual`);
      if (assets.some((asset) => asset.articleId) && assets.filter((asset) => asset.placement === "supporting").length > 2) issues.push(`media target ${target}: more than two supporting article visuals`);
    }
  } catch { issues.push("D1 records are not available yet."); }
  return <main style={{ padding: 48, fontFamily: "Arial", background: "#090b12", color: "#edf3f5", minHeight: "100vh" }}>
    <p>MYRPG / OWNER QUALITY REPORT</p>
    <h1>{issues.length ? `${issues.length} items need attention` : "All records pass the lightweight checks"}</h1>
    <p>Checks prioritize source approval, fact-check freshness, duplicate slugs, and the factual status, platform, release-confidence, activity, and time-commitment fields that power Find My MMO and MMO Radar. Private launch candidates are checked too, so incomplete data is fixed before review.</p>
    <ul>{issues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
    <a href="/admin">Return to Director Console</a>
  </main>;
}
