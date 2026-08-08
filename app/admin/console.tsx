"use client";

import { useState } from "react";
import MediaUploader from "./media-uploader";

const styles = {
  section: "director-console-section",
  helper: "director-console-helper",
  grid: "director-console-grid",
  card: "director-console-card",
  row: "director-console-row",
  empty: "director-console-empty",
  muted: "director-console-helper",
};

type Item = {
  id: string;
  title?: string;
  summary?: string;
  status?: string;
  sourceUrl?: string;
  factCheckedAt?: string;
  domain?: string;
  label?: string;
  approved?: boolean;
  agent?: string;
  action?: string;
  createdAt?: string;
  actorEmail?: string;
  entityType?: string;
  sourceType?: string;
  altText?: string;
  credit?: string;
  placement?: string;
  articleId?: string;
  gameId?: string;
  assetUrl?: string;
  r2Key?: string;
  rightsNotes?: string;
  width?: number;
  height?: number;
  caption?: string;
  sourceDate?: string;
  relatedGame?: string;
  recommendation?: string;
  gamerTakeaway?: string;
  retrospective?: boolean;
};

type Settings = { simulation: boolean; promotion: boolean; daily: number; perJob: number; stop: boolean };
type DailyEditorial = { enabled: boolean; dailyCap: number; perSlotCap: number; latest: { runDate: string; status: string; stoppedReason?: string | null } | null; slots: { id: string; desk: string; writer: string; status: string; blocker?: string | null; articleId?: string | null }[] };
type SearchStatus = { id: string; engine: string; propertyUrl: string; verificationStatus: string; sitemapStatus: string; verifiedAt?: string | null; submittedAt?: string | null; notes?: string | null };
type EditorialPlan = { id: string; recordId?: string | null; title: string; proposedDate: string; contentType: string; relatedGame?: string | null; sourceStatus: string; reviewStatus: string; mediaStatus: string; blocker?: string | null; status: string };

type LaunchGate = {
  published: { articles: number; games: number; calendar: number };
  freshness: { current: number; stale: number; thresholdDays: number };
  sitemap: { eligible: number; blocked: number };
  blockers: string[];
  routes: { route: string; label: string; visibility: string; detail: string }[];
  checkedAt: string;
  verificationNote: string;
};

export default function Console({ role, articles, games, sources, sourceWatchlist, runs, audits, media, searchStatuses, editorialPlans, dailyEditorial, cadence, settings, overview, visualCoverage, launchBatch, health, launchGate }: {
  role: string; articles: Item[]; games: Item[]; sources: Item[]; sourceWatchlist: { sourceId: string; status: string; lastRequestedAt?: string | null }[]; runs: Item[]; audits: Item[]; media: Item[]; searchStatuses: SearchStatus[]; editorialPlans: EditorialPlan[]; dailyEditorial: DailyEditorial; cadence: { planned: number; ready: number; published: number; blocked: number; stale: number }; settings: Settings; overview: { articles: number; games: number; calendar: number; published: number }; visualCoverage: { approved: number; fallback: number; pending: number; metadata: number; artworkGroups?: { graphic: string; label: string; count: number; }[]; duplication?: { route: string; graphic: string; label: string; count: number; titles: string[] }[]; items?: { id: string; kind: string; title: string; state: string; graphic: string; recommendation: string; recommendationLabel: string; assetId: string | null; previewHref: string }[] }; launchBatch: { ready: number; correction: number; hold: number }; health: { records: { kind: string; factCheckedAt?: string | null; approvedMedia: boolean; fallback: boolean; valid: boolean }[]; seoIssues: number; approvedSources: number; nextAction: string; seoItems: { name: string; kind: string; issues: string[] }[] }; launchGate: LaunchGate;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function send(body: Record<string, unknown>, url = "/api/admin/actions") {
    setBusy(true);
    try {
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      setMessage(result.error || "Saved. Refreshing…");
      if (result.ok || result.articleId) setTimeout(() => location.reload(), 500);
    } catch {
      setMessage("Unable to save. Please refresh and try again.");
    } finally { setBusy(false); }
  }

  const action = (kind: string, actionName: string, id?: string, value?: string | boolean | number) => send({ kind, action: actionName, id, value });
  const sourceHost = (value?: string) => { try { return new URL(value || "").hostname; } catch { return value || "Source missing"; } };
  const reviewNext = articles.filter((article) => article.status === "review" && !article.title?.startsWith("Simulation:") && article.title && article.summary && article.summary.trim().split(/\s+/).length >= 120 && article.sourceUrl && article.factCheckedAt);
  const intakeGroups = {
    ready: reviewNext,
    correction: articles.filter((article) => article.status === "review" && !reviewNext.some((ready) => ready.id === article.id)),
    blocked: editorialPlans.filter((plan) => plan.status === "blocked"),
    duplicate: articles.filter((article) => article.title?.startsWith("Simulation:")),
  };
  const [articleFilter, setArticleFilter] = useState<"all" | "retrospective">("all");
  const filteredReviewNext = articleFilter === "retrospective" ? reviewNext.filter((article) => article.retrospective) : reviewNext;
  const [freshnessDays, setFreshnessDays] = useState(30);
  const cutoff = Date.parse(launchGate.checkedAt) - freshnessDays * 86400000;
  const currentFacts = health.records.filter((record) => record.factCheckedAt && Date.parse(record.factCheckedAt) >= cutoff).length;
  const staleFacts = health.records.filter((record) => !record.factCheckedAt || Date.parse(record.factCheckedAt) < cutoff).length;
  const fallbackRecords = health.records.filter((record) => record.fallback).length;
  const searchFor = (engine: string) => searchStatuses.find((item) => item.engine === engine);
  const watchFor = (sourceId: string) => sourceWatchlist.find((item) => item.sourceId === sourceId);
  const plannedWeeks = editorialPlans.reduce<Record<string, EditorialPlan[]>>((groups, plan) => { const date = new Date(`${plan.proposedDate}T00:00:00Z`); const day = date.getUTCDay(); date.setUTCDate(date.getUTCDate() - ((day + 6) % 7)); const key = date.toISOString().slice(0, 10); (groups[key] ||= []).push(plan); return groups; }, {});
  const approvalCount = reviewNext.length + overview.games + overview.calendar;
  const informationCount = launchBatch.correction + launchBatch.hold + cadence.blocked + health.seoIssues;
  const operationalCount = overview.published + launchGate.freshness.current;

  return <main className="director-console">
    <header className="director-console-header">
      <div className="director-console-kicker">MYRPG / DIRECTOR CONSOLE</div>
      <h1>Editorial operations</h1>
      <p>Role: <strong>{role}</strong> · Simulation only · Live model calls are off · Publishing is human-controlled.</p>
      <div className="director-console-actions">
        <button className="director-console-primary" disabled={busy} onClick={() => send({}, "/api/admin/simulate")}>Create simulation candidate</button>
        <button disabled={busy} onClick={() => action("budget", "stop", undefined, !settings.stop)}>{settings.stop ? "Release emergency stop" : "Emergency stop"}</button>
        <button disabled={busy} onClick={() => action("settings", "promotion", undefined, !settings.promotion)}>{settings.promotion ? "Hide MyMafia placements" : "Show MyMafia placements"}</button>
      </div>
      {message && <p className="director-console-message">{message}</p>}
    </header>

    {role === "owner" && <section className="director-console-section">
      <h2>Daily AI editorial workflow</h2><p className="director-console-helper">Four private desk slots run daily at 15:00 UTC. Each slot is capped at $2.50 within the approved $10.00 daily ceiling. A slot cannot create a draft without a validated approved-source evidence packet, and no run can publish.</p>
      <div className="director-console-grid"><article className={`director-console-card ${dailyEditorial.enabled && !settings.stop ? "director-console-card-operational" : "director-console-card-approval"}`}><p className={`director-console-status ${dailyEditorial.enabled && !settings.stop ? "director-console-status-operational" : "director-console-status-approval"}`}>{dailyEditorial.enabled && !settings.stop ? "OPERATIONAL / SOURCE-GATED" : "OWNER ACTION REQUIRED"}</p><h3>{dailyEditorial.enabled && !settings.stop ? "Enabled" : "Paused"}</h3><p>Daily cap: ${(dailyEditorial.dailyCap / 100).toFixed(2)} · Per desk slot: ${(dailyEditorial.perSlotCap / 100).toFixed(2)}</p><button disabled={busy} onClick={() => action("daily_editorial", dailyEditorial.enabled ? "disable" : "enable")}>{dailyEditorial.enabled ? "Pause daily workflow" : "Enable daily workflow"}</button></article><article className="director-console-card director-console-card-information"><p className="director-console-status director-console-status-information">LATEST RUN</p><h3>{dailyEditorial.latest ? dailyEditorial.latest.status.replaceAll("_", " ") : "Awaiting schedule"}</h3><p>{dailyEditorial.latest ? `${dailyEditorial.latest.runDate}${dailyEditorial.latest.stoppedReason ? ` · ${dailyEditorial.latest.stoppedReason}` : ""}` : "The first run will be recorded after the next 15:00 UTC trigger."}</p></article><article className="director-console-card"><small>PRIVATE-ONLY GUARDRAILS</small><p>Owner review is required for every draft. Unsupported facts, missing evidence, duplicate risks, budget stops, and source gaps halt the relevant slot before a model call.</p></article></div>
      {dailyEditorial.slots.length > 0 && <div className="director-console-grid" style={{ marginTop: 14 }}>{dailyEditorial.slots.map((slot) => <article className="director-console-card" key={slot.id}><small>{slot.writer.toUpperCase()}</small><h3>{slot.desk.replaceAll("_", " ")}</h3><p><strong>{slot.status.replaceAll("_", " ")}</strong></p><p>{slot.blocker || (slot.articleId ? "Private draft created; Owner review required." : "Awaiting a source-qualified task.")}</p></article>)}</div>}
      <div className="director-console-card" style={{ marginTop: 14 }}><small>CONTENT POLICY</small><p>Official and approved source evidence comes first. Comparisons and guides can be drafted only from stored, cited factual fields. Community or player commentary is not collected automatically and can never be presented as verified fact. Video coverage remains a future Owner-approved official-media workflow.</p></div>
    </section>}

    <section className="director-console-section director-console-signal">
      <h2>Owner action signal</h2><p className="director-console-helper">Red means an Owner decision is required. Yellow means more factual information or remediation is needed. Green means the stored record or route is operational.</p>
      <div className="director-console-grid"><article className="director-console-card director-console-card-approval"><p className="director-console-status director-console-status-approval">OWNER APPROVAL REQUIRED</p><h3>{approvalCount}</h3><p>Review-ready articles, games, and calendar items waiting for your explicit decision.</p></article><article className="director-console-card director-console-card-information"><p className="director-console-status director-console-status-information">MORE INFORMATION NEEDED</p><h3>{informationCount}</h3><p>Source, fact-check, readiness, or public-metadata issues that need attention before release.</p></article><article className="director-console-card director-console-card-operational"><p className="director-console-status director-console-status-operational">OPERATIONAL</p><h3>{operationalCount}</h3><p>Published or currently fact-checked records that meet their stored operational checks.</p></article></div>
    </section>

    <section className="director-console-section">
      <h2>Publishing overview</h2><p className="director-console-helper">Final publication remains Owner-only. Open the relevant review packet to see the exact readiness checks.</p>
      <div className="director-console-grid"><article className="director-console-card"><small>ARTICLES READY / IN REVIEW</small><h3>{overview.articles}</h3><p>Blocked until source, fact check, duplicate record, word count, and Owner decision all pass.</p>{reviewNext[0] && <button onClick={() => window.location.assign(`/admin/preview/article/${encodeURIComponent(reviewNext[0].id)}`)}>Review next article</button>}</article><article className="director-console-card"><small>GAMES READY TO PUBLISH</small><h3>{overview.games}</h3><p>Open Game Management for exact field and source blockers.</p><a href="/admin/games">Open Game Management</a></article><article className="director-console-card"><small>CALENDAR ITEMS READY</small><h3>{overview.calendar}</h3><p>Only approved records with confirmed or estimated dates can proceed.</p><a href="/admin/games">Open calendar review</a></article><article className="director-console-card"><small>RECENT PUBLISHED RECORDS</small><h3>{overview.published}</h3><p>Published records are the only ones visible on public pages.</p><a href="/admin/quality">Run quality report</a></article></div>
      <p><a href="/admin/timeline">Manage private game timelines and public corrections →</a></p>
    </section>

    {role === "owner" && <section className="director-console-section">
      <h2>Official-source watchlist</h2><p className="director-console-helper">Owner-triggered intake preparation only. A watch request records an audit event but never fetches, schedules, drafts, or publishes content on its own.</p>
      <div className="director-console-grid">{sources.filter((source) => source.approved).map((source) => { const watch = watchFor(source.id); return <article className="director-console-card" key={source.id}><small>APPROVED OFFICIAL SOURCE</small><h3>{source.label || source.domain}</h3><p>{source.domain} · {watch ? `Watch: ${watch.status}` : "Not watched"}</p><div className="director-console-row"><button disabled={busy || Boolean(watch)} onClick={() => action("source_watch", "watch", source.id)}>Add to watchlist</button>{watch && <button disabled={busy} onClick={() => action("source_watch", "request", source.id)}>Record one-time check</button>}</div></article>; })}</div>
      <div className="director-console-card" style={{ marginTop: 14 }}><small>AI-ASSISTED EDITORIAL DESKS</small><p><strong>Archive Desk</strong> — launches, expansions, and material history. <strong>Systems Desk</strong> — combat, progression, economy, and platform changes. <strong>Signal Desk</strong> — official announcements and confirmed release windows. <strong>World Atlas Desk</strong> — factual game profiles and multiplayer taxonomy.</p><p>These are transparent MyRPG AI editorial roles, not human journalists. All public publication still requires an Owner decision.</p></div>
    </section>}

    {role === "owner" && <section className="director-console-section">
      <h2>Private intake queue</h2><p className="director-console-helper">Source-backed candidates remain private until an Owner approves and publishes them. These groups do not run models or inspect the web.</p>
      <div className="director-console-grid">{(["ready", "correction", "blocked", "duplicate"] as const).map((group) => <article className="director-console-card" key={group}><small>{group === "ready" ? "READY FOR REVIEW" : group === "correction" ? "NEEDS FACTUAL CORRECTION" : group === "blocked" ? "MISSING OFFICIAL EVIDENCE" : "DUPLICATE / ALREADY COVERED"}</small><h3>{intakeGroups[group].length}</h3>{intakeGroups[group].slice(0, 3).map((item: any) => <p key={item.id}><strong>{item.title}</strong><br />{item.sourceUrl ? sourceHost(item.sourceUrl) : item.blocker || "No record supplied"}</p>)}</article>)}</div>
    </section>}

    {role === "owner" && <section className="director-console-section">
      <h2>Live Service &amp; Online Games</h2><p className="director-console-helper">Jordan Hale — The Live Service Desk is a transparent MyRPG AI editorial persona, overseen by the Owner. This lane covers official seasonal updates, multiplayer launches, platform releases, live-service roadmaps, major online modes, and confirmed large-scale multiplayer changes. It is not a human reporter or player testimonial.</p>
      {(() => { const domains = new Set(["rockstargames.com", "callofduty.com", "fortnite.com", "battlefield.com", "arcraiders.com"]); const laneSources = sources.filter((source) => domains.has((source.domain || "").toLowerCase().replace(/^www\./, ""))); const laneGames = games.filter((game: any) => game.coverageLane); const lanePlans = editorialPlans.filter((plan) => /live service|online game/i.test(`${plan.contentType} ${plan.title}`)); return <><div className="director-console-grid"><article className="director-console-card"><small>SOURCE APPROVED / READY FOR EVIDENCE REVIEW</small><h3>{laneSources.filter((source) => source.approved).length}</h3><p>Approved sources may receive one Owner-triggered, bounded evidence request.</p></article><article className="director-console-card"><small>PRIVATE EVIDENCE PACKET READY</small><h3>0</h3><p>No new evidence packet or content draft is created in this setup phase.</p><a href="/admin/evidence">Open Evidence Review</a></article><article className="director-console-card"><small>BLOCKED BY MISSING OFFICIAL EVIDENCE</small><h3>{laneSources.filter((source) => !source.approved).length}</h3><p>Approve a specific official domain before requesting one URL review.</p></article><article className="director-console-card"><small>PUBLISHED FACTUAL PROFILE / UPDATE</small><h3>{laneGames.filter((game: any) => game.published).length}</h3><p>Only Owner-published records appear on public routes.</p></article></div><div className="director-console-grid" style={{ marginTop: 14 }}>{laneSources.map((source) => <article className="director-console-card" key={`live-${source.id}`}><small>{source.approved ? "APPROVED SOURCE" : "PENDING OWNER APPROVAL"}</small><h3>{source.label || source.domain}</h3><p>{source.domain}</p><div className="director-console-row"><button disabled={busy || source.approved} onClick={() => action("source", "approve", source.id)}>Approve official source</button>{source.approved && <button disabled={busy} onClick={() => action("source_watch", "watch", source.id)}>Add bounded watch</button>}</div></article>)}</div><div className="director-console-card" style={{ marginTop: 14 }}><small>EDITORIAL CALENDAR</small><p>{lanePlans.length ? `${lanePlans.length} private Live Service Desk plans are present.` : "No live-service plan is scheduled. Planning remains private and cannot trigger a fetch, draft, or publication."}</p></div></>; })()}
    </section>}

    {role === "owner" && <section className="director-console-section">
      <h2>Launch checklist</h2><p className="director-console-helper">Read-only D1 summary. It never fetches, schedules, changes records, or spends money.</p>
      <div className="director-console-grid"><article className="director-console-card"><small>PUBLISHED COVERAGE</small><h3>{health.records.length}</h3><p>{health.records.filter((record) => record.kind === "article").length} articles · {health.records.filter((record) => record.kind === "game").length} games · {health.records.filter((record) => record.kind === "calendar").length} calendar items</p></article><article className="director-console-card"><small>READY FOR OWNER REVIEW</small><h3>{launchBatch.ready}</h3><p>{launchBatch.correction} need correction · {launchBatch.hold} intentionally held.</p></article><article className="director-console-card"><small>VISUAL COVERAGE</small><h3>{visualCoverage.approved} approved</h3><p>{fallbackRecords} published records use the labelled MyRPG fallback. {visualCoverage.pending} media items await review.</p></article><article className="director-console-card"><small>APPROVED SOURCES</small><h3>{health.approvedSources}</h3><p>Use Source Registry before entering any new private record.</p></article></div>
      <div className="director-console-card" style={{ marginTop: 14 }}><small>NEXT SAFE MANUAL ACTION</small><p>{health.nextAction}</p></div>
    </section>}

    {role === "owner" && <section className="director-console-section">
      <h2>Public launch gate</h2><p className="director-console-helper">A read-only release check using stored D1 records and the public route rules. It does not fetch pages, change content, or spend money.</p>
      <div className="director-console-grid"><article className="director-console-card"><small>PUBLISHED RECORDS</small><h3>{launchGate.published.articles + launchGate.published.games + launchGate.published.calendar}</h3><p>{launchGate.published.articles} articles · {launchGate.published.games} games · {launchGate.published.calendar} calendar items</p></article><article className="director-console-card"><small>VISUAL COVERAGE</small><h3>{visualCoverage.approved} approved</h3><p>{visualCoverage.fallback} labelled fallbacks · {visualCoverage.pending} awaiting review</p></article><article className="director-console-card"><small>FACT-CHECK FRESHNESS</small><h3>{launchGate.freshness.current}</h3><p>{launchGate.freshness.stale} need manual refresh at the {launchGate.freshness.thresholdDays}-day threshold.</p></article><article className="director-console-card"><small>SITEMAP ELIGIBILITY</small><h3>{launchGate.sitemap.eligible}</h3><p>{launchGate.sitemap.blocked} published records lack data needed for public-page eligibility.</p></article></div>
      <div className="director-console-card" style={{ marginTop: 14 }}><small>PUBLIC-ROUTE REGRESSION CHECKLIST</small><div className="director-console-grid" style={{ marginTop: 12 }}>{launchGate.routes.map((route) => <div key={route.route}><strong>{route.label}</strong><p><code>{route.route}</code> · {route.visibility}</p><p>{route.detail}</p></div>)}</div></div>
      <div className="director-console-card" style={{ marginTop: 14 }}><small>REMAINING LAUNCH BLOCKERS</small>{launchGate.blockers.length ? <ul>{launchGate.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul> : <p>No D1 launch-gate blocker is currently detected. Complete a fresh public-browser review before announcing the site.</p>}</div>
      <div className="director-console-card" style={{ marginTop: 14 }}><small>PRE-LAUNCH QA RESULT</small><p>Structural route check generated {new Date(launchGate.checkedAt).toLocaleString()}.</p><p>{launchGate.verificationNote}</p></div>
    </section>}

    {role === "owner" && <section className="director-console-section">
      <h2>Search-engine launch</h2><p className="director-console-helper">Manual status records only. MyRPG never claims verification or submission until you record the result from the official console.</p>
      <div className="director-console-grid">{["google", "bing"].map((engine) => { const current = searchFor(engine); return <article className="director-console-card" key={engine}><small>{engine.toUpperCase()} WEBMASTER STATUS</small><h3>{current?.verificationStatus === "verified" ? "Verified" : current?.verificationStatus === "pending" ? "Pending verification" : "Not started"}</h3><p>Canonical property: <code>https://myrpg.io/</code></p><p>Sitemap: {current?.sitemapStatus?.replaceAll("_", " ") || "not submitted"}</p>{current?.notes && <p>{current.notes}</p>}<form className="director-console-form" onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); send({ kind: "search_status", engine, propertyUrl: "https://myrpg.io/", verificationStatus: values.get("verificationStatus"), sitemapStatus: values.get("sitemapStatus"), note: values.get("note") }); }}><select name="verificationStatus" defaultValue={current?.verificationStatus || "not_started"}><option value="not_started">Not started</option><option value="pending">Pending</option><option value="verified">Verified by Owner</option></select><select name="sitemapStatus" defaultValue={current?.sitemapStatus || "not_submitted"}><option value="not_submitted">Not submitted</option><option value="submitted">Submitted by Owner</option><option value="accepted">Accepted / processed</option></select><input name="note" defaultValue={current?.notes || ""} placeholder="Optional confirmation note" /><button disabled={busy}>Save manual status</button></form></article>; })}</div>
      <div className="director-console-card" style={{ marginTop: 14 }}><small>SUBMISSION CHECKLIST</small><ol><li>Add the URL-prefix property <code>https://myrpg.io/</code> in Google Search Console and Bing Webmaster Tools.</li><li>Complete ownership verification in each service.</li><li>Submit <code>https://myrpg.io/sitemap.xml</code> in each Sitemaps report.</li><li>Return here and record the confirmed status; this panel performs no external submission.</li></ol></div>
    </section>}

    {role === "owner" && <section className="director-console-section">
      <h2>Private editorial calendar</h2><p className="director-console-helper">Planning only. Entries never publish, fetch, schedule, or trigger an agent. The server limits each week to three active planned publications.</p>
      <div className="director-console-grid"><article className="director-console-card"><small>PLANNED</small><h3>{cadence.planned}</h3><p>Private future entries.</p></article><article className="director-console-card"><small>READY</small><h3>{cadence.ready}</h3><p>Prepared for a manual Owner action.</p></article><article className="director-console-card"><small>PUBLISHED / RECORDED</small><h3>{cadence.published}</h3><p>Planning records marked complete.</p></article><article className="director-console-card"><small>BLOCKED / STALE</small><h3>{cadence.blocked} / {cadence.stale}</h3><p>Planning blockers and published records needing fact-check refresh.</p></article></div>
      <form className="director-console-form" onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); send({ kind: "editorial_plan", action: "create", title: values.get("title"), proposedDate: values.get("proposedDate"), contentType: values.get("contentType"), recordId: values.get("recordId"), relatedGame: values.get("relatedGame"), sourceConfidence: values.get("sourceStatus"), reviewStatus: values.get("reviewStatus"), mediaStatus: values.get("mediaStatus"), blocker: values.get("blocker") }); }}><input name="title" placeholder="Planned publication title" required /><label>Proposed date<input name="proposedDate" type="date" required /></label><select name="contentType" required><option value="article">Source-backed article</option><option value="game">New or refreshed game profile</option><option value="calendar">Confirmed calendar update</option></select><input name="recordId" placeholder="Existing D1 record ID (optional)" /><input name="relatedGame" placeholder="Related game (optional)" /><select name="sourceStatus"><option value="approved">Approved source</option><option value="pending">Source pending</option><option value="missing">Source missing</option></select><select name="reviewStatus"><option value="planned">Planned</option><option value="review">In review</option><option value="approved">Owner-approved</option></select><select name="mediaStatus"><option value="fallback">MyRPG fallback</option><option value="pending">Media pending</option><option value="approved">Approved media</option></select><input name="blocker" placeholder="Exact blocker (leave blank if none)" /><button className="director-console-primary" disabled={busy}>Add private plan</button></form>
      {Object.keys(plannedWeeks).length ? Object.entries(plannedWeeks).sort(([a], [b]) => a.localeCompare(b)).map(([week, plans]) => <div className="director-console-card" style={{ marginTop: 14 }} key={week}><small>WEEK OF {week} · {plans.length}/3 ACTIVE OR RECORDED</small><div className="director-console-grid">{plans.slice(0, 3).map((plan) => <article className="director-console-card" key={plan.id}><small>{plan.contentType.toUpperCase()} · {plan.status.toUpperCase()}</small><h3>{plan.title}</h3><p>{plan.proposedDate} · {plan.relatedGame || "General MMO coverage"}</p><p>Source: {plan.sourceStatus} · Review: {plan.reviewStatus} · Media: {plan.mediaStatus}</p><p>{plan.blocker || "No planning blocker recorded."}</p><div className="director-console-row">{["planned", "ready", "blocked", "published", "cancelled"].map((status) => <button key={status} disabled={busy || status === plan.status} onClick={() => action("editorial_plan", status, plan.id)}>{status}</button>)}</div></article>)}</div></div>) : <div className="director-console-empty" style={{ marginTop: 14 }}>No private publication plans yet. Start with two news articles and one game-profile action in the first launch week.</div>}
      <div className="director-console-card" style={{ marginTop: 14 }}><small>RECOMMENDED SUSTAINABLE CADENCE</small><p>Two source-backed news articles weekly · one new or refreshed game profile weekly · confirmed calendar updates only when direct official sources support them. Quality and source completeness always outrank volume.</p></div>
    </section>}

    {role === "owner" && <section className="director-console-section">
      <h2>Content health</h2><p className="director-console-helper">Counts use stored D1 dates only. Change the threshold to plan a manual fact-check pass; no record is changed.</p>
      <label className="director-console-helper" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>Fact-check threshold <select value={freshnessDays} onChange={(event) => setFreshnessDays(Number(event.target.value))}><option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days</option><option value={180}>180 days</option></select></label>
      <div className="director-console-grid"><article className="director-console-card"><small>WITHIN STORED THRESHOLD</small><h3>{currentFacts}</h3><p>Published records fact-checked within {freshnessDays} days.</p></article><article className="director-console-card"><small>NEEDS MANUAL REFRESH</small><h3>{staleFacts}</h3><p>Published records with a missing or older stored fact-check date.</p></article><article className="director-console-card"><small>APPROVED LEAD MEDIA</small><h3>{health.records.filter((record) => record.approvedMedia).length}</h3><p>{fallbackRecords} published records use the labelled fallback instead.</p></article><article className="director-console-card"><small>QUALITY FLAGS</small><h3>{health.seoIssues}</h3><p>Published records with missing source-backed public metadata. <a href="/admin/quality">Open Quality Report</a></p></article></div>
    </section>}

    {role === "owner" && <section className="director-console-section">
      <h2>SEO summary</h2><p className="director-console-helper">Read-only checks for published pages only. Canonical routes and structured data are generated by the public templates; this panel identifies records that lack the data those templates need.</p>
      <div className="director-console-grid">{health.seoItems.length ? health.seoItems.map((item) => <article className="director-console-card" key={`${item.kind}:${item.name}`}><small>{item.kind.toUpperCase()} · {item.issues.length ? "NEEDS DATA" : "READY"}</small><h3>{item.name}</h3><p>{item.issues.length ? item.issues.join(" · ") : "Title, description, canonical route, source citation, fact-check date, fallback/approved visual path, and schema prerequisites are present."}</p></article>) : <div className="director-console-empty">No published editorial pages are available for the SEO summary yet.</div>}</div>
    </section>}

    <section className="director-console-section">
      <h2>Launch batch</h2><p className="director-console-helper">Private games, calendar records, and article packets are grouped from their current source, freshness, and review state. “Ready” means ready for an Owner decision, never automatic publication.</p>
      <div className="director-console-grid"><article className="director-console-card"><small>READY FOR REVIEW</small><h3>{launchBatch.ready}</h3><p>Source-backed records that can move to an Owner decision.</p></article><article className="director-console-card"><small>NEEDS CORRECTION</small><h3>{launchBatch.correction}</h3><p>Records missing a required source, date, draft detail, or other factual check.</p></article><article className="director-console-card"><small>HOLD</small><h3>{launchBatch.hold}</h3><p>Archived, rejected, or intentionally unresolved records.</p><a href="/admin/games">Review game and calendar batch</a></article></div>
    </section>

    <section className="director-console-section">
      <h2>Official Announcement Intake</h2>
      <p className="director-console-helper">Manual, source-first intake only. Paste a recent announcement from an already approved official domain. This never fetches, crawls, calls a model, or publishes automatically.</p>
      <form className="director-console-form" onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); send({ kind: "article", action: "intake", sourceUrl: values.get("sourceUrl"), title: values.get("title"), gameId: values.get("gameSlug"), releaseDate: values.get("sourceDate"), factCheckedAt: values.get("factCheckedAt"), gamerTakeaway: values.get("gamerTakeaway"), retrospective: values.get("retrospective") === "on", value: values.get("summary") }); }}>
        <input name="sourceUrl" type="url" placeholder="Official announcement URL" required />
        <input name="title" placeholder="Factual article title" required />
        <input name="gameSlug" placeholder="Published game slug (for example: lost-ark)" required />
        <label>Source date<input name="sourceDate" type="date" required /></label>
        <label>Fact-check date<input name="factCheckedAt" type="date" required /></label>
        <label><input name="retrospective" type="checkbox" /> Retrospective — official update from the last 60 days</label>
        <textarea name="gamerTakeaway" rows={2} placeholder="Why this still matters to players (required for retrospective coverage)." />
        <textarea name="summary" rows={7} placeholder="120–180 words for current coverage; 140–220 words for retrospective coverage. Use only claims supported by the official source." required />
        <button className="director-console-primary" disabled={busy}>Create private intake candidate</button>
      </form>
    </section>

    <section className="director-console-section">
      <h2>Review next: articles</h2>
      <p className="director-console-helper">Only complete, current, source-approved article packets appear here. Recommendation: confirm, then approve or hold.</p>
      <label className="director-console-helper">Review filter <select value={articleFilter} onChange={(event) => setArticleFilter(event.target.value as "all" | "retrospective")}><option value="all">All review-ready articles</option><option value="retrospective">Retrospective — last 60 days</option></select></label>
      <div className="director-console-grid">{filteredReviewNext.length ? filteredReviewNext.map((article) => <article className="director-console-card" key={article.id}><small>{article.retrospective ? "RETROSPECTIVE · " : ""}{(article.recommendation || "edit").toUpperCase()} · {sourceHost(article.sourceUrl)}</small><h3>{article.title}</h3><p>Related game: {article.relatedGame || "Not recorded"} · Originally announced: {article.sourceDate?.slice(0, 10) || "Missing"}</p><p>Proposed MyRPG publication: only after Owner approval · Gamer takeaway: {article.gamerTakeaway}</p><p>Source, {article.retrospective ? "140–220" : "120–180"} word draft, and fact-check date are present. Media will use the labelled MyRPG fallback unless separately approved.</p><div className="director-console-row"><button onClick={() => window.location.assign(`/admin/preview/article/${encodeURIComponent(article.id)}`)}>Open source-first packet</button><button disabled={busy} onClick={() => action("article", "approve", article.id)}>Owner approve</button><button disabled={busy} onClick={() => action("article", "archive", article.id)}>Hold / archive</button></div></article>) : <div className="director-console-empty">No matching complete article packets are ready.</div>}</div>
    </section>

    <section className="director-console-section">
      <h2>Review Queue & Content Library</h2>
      <p className="director-console-helper">Nothing can publish until you approve it.</p>
      <div className="director-console-grid">{articles.length ? articles.map((article) => <article className="director-console-card" key={article.id}>
        <small>{article.status?.toUpperCase() || "DRAFT"} · human review required</small><h3>{article.title}</h3><p>{article.summary}</p>
        <div className="director-console-row"><button type="button" onClick={() => window.location.assign(`/admin/preview/article/${encodeURIComponent(article.id)}`)}>Preview packet</button>{["approve", "publish", "reject", "archive", "restore", "unpublish"].map((name) => <button key={name} disabled={busy} onClick={() => action("article", name, article.id)}>{name}</button>)}</div>
      </article>) : <div className="director-console-empty">No records yet. Create a deterministic simulation candidate to test the full review workflow.</div>}</div>
    </section>

    <section className="director-console-section">
      <h2>Source Registry</h2>
      <form className="director-console-form" onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); send({ kind: "source", action: "add", label: values.get("label"), domain: values.get("domain") }); }}>
        <input name="label" placeholder="Source label" required /><input name="domain" placeholder="https://official-game-site.com" required /><button disabled={busy}>Add source</button>
      </form>
      <div className="director-console-grid">{sources.map((source) => <article className="director-console-card" key={source.id}><h3>{source.label}</h3><p>{source.domain}</p><button disabled={busy} onClick={() => action("source", source.approved ? "disable" : "approve", source.id)}>{source.approved ? "Disable" : "Approve"}</button></article>)}</div>
    </section>

    <section className={styles.section}>
      <h2>Media Review</h2><p className={styles.helper}>Use only approved owner uploads or official game media. An Owner must approve display. Every item requires a rights note and a specific placement; fallback graphics remain labelled as non-gameplay.</p>
      {role === "owner" && <MediaUploader articles={articles.map(({ id, title }) => ({ id, title: title || "Untitled article" }))} games={games.map(({ id, title }) => ({ id, title: title || "Untitled game" }))} />}
      <div className={styles.grid}>{media.filter((item) => item.status === "approved" && item.assetUrl).map((item) => <article className={styles.card} key={`thumbnail:${item.id}`}><img src={item.assetUrl} alt="" width={item.width || 1200} height={item.height || 675} style={{ width: "100%", height: 116, objectFit: "cover", marginBottom: 12, border: "1px solid #2a3041" }} /><small>APPROVED PREVIEW · {item.sourceType}</small><h3>{item.altText}</h3><p>Target: {item.articleId ? "Article" : "Game"} · {item.width || "?"}×{item.height || "?"}</p><p>{item.rightsNotes || "Missing rights note"}</p><a href={`/admin/media/${encodeURIComponent(item.id)}`}>Open media record</a></article>)}</div>
      {role === "owner" && <form className="director-console-form" onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); const target = String(values.get("target") || ""); send({ kind: "media", action: "add", articleId: target.startsWith("article:") ? target.slice(8) : undefined, gameId: target.startsWith("game:") ? target.slice(5) : undefined, assetUrl: values.get("assetUrl"), r2Key: values.get("r2Key"), sourceUrl: values.get("sourceUrl"), sourceType: values.get("sourceType"), credit: values.get("credit"), rightsNotes: values.get("rightsNotes"), altText: values.get("altText"), caption: values.get("caption"), placement: values.get("placement"), width: Number(values.get("width")), height: Number(values.get("height")) }); }}>
        <select name="target" required><option value="">Attach to…</option>{articles.map((article) => <option key={`article:${article.id}`} value={`article:${article.id}`}>Article: {article.title}</option>)}{games.map((game) => <option key={`game:${game.id}`} value={`game:${game.id}`}>Game: {game.title}</option>)}</select><select name="placement" required><option value="lead">Lead visual</option><option value="supporting">Supporting visual (article only)</option><option value="game-card">Game-card visual</option><option value="directory-card">Directory-card visual</option></select><select name="sourceType" required><option value="official_press_kit">Official press kit</option><option value="official_game_site">Official game site</option><option value="verified_store">Verified store artwork</option><option value="official_trailer">Official trailer artwork</option><option value="owner_upload">Owner R2 upload</option></select>
        <input name="assetUrl" type="url" placeholder="Approved asset URL (official media only)" /><input name="r2Key" placeholder="R2 object key (owner upload only)" /><input name="sourceUrl" type="url" placeholder="Official source / press-kit URL" /><input name="credit" placeholder="Credit / copyright line" /><input name="rightsNotes" placeholder="Rights / reuse notes" required /><input name="altText" placeholder="Descriptive alt text" required /><input name="caption" placeholder="Visible caption (optional)" /><input name="width" type="number" min="1" defaultValue="1200" required /><input name="height" type="number" min="1" defaultValue="675" required /><button className="director-console-primary" disabled={busy}>Add media for Owner approval</button>
      </form>}
      <div className={styles.grid}>{media.length ? media.map((item) => <article className={styles.card} key={item.id}><small>{item.status?.toUpperCase()} · {item.sourceType} · {item.placement}</small><h3>{item.altText}</h3><p>{item.credit || "No credit supplied"}</p><div className={styles.row}>{["approve", "reject", "archive", "restore"].map((name) => <button key={name} disabled={busy} onClick={() => action("media", name, item.id)}>{name}</button>)}</div></article>) : <div className={styles.empty}>No media is awaiting review.</div>}</div>
    </section>

    <section className={styles.section}>
      <h2>Visual coverage</h2><p className={styles.helper}>Published records use an approved lead visual when one is available; otherwise MyRPG shows the labelled editorial fallback instead of unverified imagery.</p>
      <div className={styles.grid}><article className={styles.card}><small>APPROVED LEAD VISUALS</small><h3>{visualCoverage.approved}</h3><p>Published articles or games with an approved lead visual.</p></article><article className={styles.card}><small>FALLBACK IN USE</small><h3>{visualCoverage.fallback}</h3><p>Published records using the MyRPG editorial graphic — not gameplay.</p></article><article className={styles.card}><small>PENDING REVIEW</small><h3>{visualCoverage.pending}</h3><p>Attached media waiting for an Owner decision.</p></article><article className={styles.card}><small>MISSING METADATA</small><h3>{visualCoverage.metadata}</h3><p>Media records needing alt text, rights notes, dimensions, or a target.</p><a href="/admin/quality">Open Quality Report</a></article></div>
      <h3>Artwork duplication report</h3><p className={styles.muted}>Read-only production view. A listing is flagged when more than two adjacent cards currently share one graphic.</p>
      <div className={styles.grid}>{visualCoverage.artworkGroups?.map((group) => <article className={styles.card} key={group.graphic}><small>ARTWORK USAGE</small><h3>{group.count}</h3><p>{group.label}</p></article>)}</div>
      {visualCoverage.duplication?.length ? <div className={styles.grid}>{visualCoverage.duplication.map((finding, index) => <article className={styles.card} key={`${finding.route}:${finding.graphic}:${index}`}><small>ADJACENT DUPLICATION · {finding.route.toUpperCase()}</small><h3>{finding.count} repeated cards</h3><p>{finding.label}</p><small>{finding.titles.join(" · ")}</small></article>)}</div> : <div className={styles.empty}>No public listing has more than two adjacent cards using the same artwork.</div>}
      <h3>Record assignments</h3><div className={styles.grid}>{visualCoverage.items?.length ? visualCoverage.items.map((item) => <article className={styles.card} key={`${item.kind}:${item.id}`}><small>{item.kind.toUpperCase()} · {item.state.toUpperCase()}</small><h3>{item.title}</h3><p>{item.state === "MyRPG fallback in use" ? "A labelled MyRPG editorial graphic is public until licensed media is approved." : "Review the media record before changing public coverage."}</p>{item.state === "MyRPG fallback in use" && <><label htmlFor={`graphic-${item.kind}-${item.id}`}>Editorial graphic</label><select id={`graphic-${item.kind}-${item.id}`} value={item.graphic} disabled={role !== "owner" || busy} onChange={(event) => action("editorial_graphic", item.kind, item.id, event.target.value)}><option value="neutral">Neutral official updates</option><option value="fantasy">Dark fantasy intelligence</option><option value="science">Science-fiction intelligence</option><option value="science-transit">Science-fiction transit intelligence</option><option value="science-campaign">Science-fiction campaign intelligence</option><option value="anime">Anime-inspired intelligence</option><option value="historical">Historical intelligence</option><option value="strategy">Browser strategy intelligence</option><option value="fantasy-live">Fantasy live-service intelligence</option><option value="science-profile">Science-fiction world profile</option><option value="anime-update">Anime-inspired live update</option><option value="historical-world">Historical world intelligence</option><option value="neutral-industry">MMO industry signal</option></select><p><strong>Recommended:</strong> {item.recommendationLabel}</p>{item.recommendation !== item.graphic && <button type="button" disabled={role !== "owner" || busy} onClick={() => action("editorial_graphic", item.kind, item.id, item.recommendation)}>Apply recommendation</button>}<small>Original MyRPG editorial artwork · not gameplay.</small></>}<div className={styles.row}><a href={item.previewHref}>Open preview packet</a>{item.assetId && <a href={`/admin/media/${item.assetId}`}>Open media record</a>}</div></article>) : <div className={styles.empty}>No published articles or games require visual coverage review yet.</div>}</div>
    </section>

    <section className={styles.section}>
      <h2>Budget & Network Promotions</h2>
      <div className={styles.grid}>
        <article className={styles.card}><h3>Simulation mode</h3><p>{settings.simulation ? "Enabled — deterministic, zero-cost runs." : "Disabled"}</p><button disabled={busy} onClick={() => action("settings", "simulation", undefined, !settings.simulation)}>Toggle simulation</button></article>
        <article className={styles.card}><h3>Hard caps</h3><p>Daily ${ (settings.daily / 100).toFixed(2) } · per job ${ (settings.perJob / 100).toFixed(2) }</p></article>
        <article className={styles.card}><h3>MyMafia network placement</h3><p>{settings.promotion ? "Visible and clearly labelled." : "Hidden."} Anonymous clicks only.</p></article>
      </div>
    </section>

    <section className={styles.section}>
      <h2>Agent Runs</h2><div className={styles.grid}>{runs.length ? runs.map((run) => <article className={styles.card} key={run.id}><h3>{run.agent}</h3><p>{run.status} · $0.00 simulation cost</p></article>) : <div className={styles.empty}>No agent runs yet.</div>}</div>
    </section>

    <section className={styles.section}>
      <h2>Audit Log</h2><div className={styles.grid}>{audits.length ? audits.map((audit) => <article className={styles.card} key={audit.id}><h3>{audit.action}</h3><p>{audit.actorEmail} · {audit.entityType} · {audit.createdAt}</p></article>) : <div className={styles.empty}>Actions will appear here after the first review decision.</div>}</div>
    </section>
  </main>;
}
