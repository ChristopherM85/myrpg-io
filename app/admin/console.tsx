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
};

type Settings = { simulation: boolean; promotion: boolean; daily: number; perJob: number; stop: boolean };

export default function Console({ role, articles, games, sources, runs, audits, media, settings, overview, visualCoverage, launchBatch, health }: {
  role: string; articles: Item[]; games: Item[]; sources: Item[]; runs: Item[]; audits: Item[]; media: Item[]; settings: Settings; overview: { articles: number; games: number; calendar: number; published: number }; visualCoverage: { approved: number; fallback: number; pending: number; metadata: number }; launchBatch: { ready: number; correction: number; hold: number }; health: { records: { kind: string; factCheckedAt?: string | null; approvedMedia: boolean; fallback: boolean; valid: boolean }[]; seoIssues: number; approvedSources: number; nextAction: string };
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
  const [freshnessDays, setFreshnessDays] = useState(30);
  const cutoff = Date.now() - freshnessDays * 86400000;
  const currentFacts = health.records.filter((record) => record.factCheckedAt && Date.parse(record.factCheckedAt) >= cutoff).length;
  const staleFacts = health.records.filter((record) => !record.factCheckedAt || Date.parse(record.factCheckedAt) < cutoff).length;
  const fallbackRecords = health.records.filter((record) => record.fallback).length;

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

    <section className="director-console-section">
      <h2>Publishing overview</h2><p className="director-console-helper">Final publication remains Owner-only. Open the relevant review packet to see the exact readiness checks.</p>
      <div className="director-console-grid"><article className="director-console-card"><small>ARTICLES READY / IN REVIEW</small><h3>{overview.articles}</h3><p>Blocked until source, fact check, duplicate record, word count, and Owner decision all pass.</p>{reviewNext[0] && <button onClick={() => window.location.assign(`/admin/preview/article/${encodeURIComponent(reviewNext[0].id)}`)}>Review next article</button>}</article><article className="director-console-card"><small>GAMES READY TO PUBLISH</small><h3>{overview.games}</h3><p>Open Game Management for exact field and source blockers.</p><a href="/admin/games">Open Game Management</a></article><article className="director-console-card"><small>CALENDAR ITEMS READY</small><h3>{overview.calendar}</h3><p>Only approved records with confirmed or estimated dates can proceed.</p><a href="/admin/games">Open calendar review</a></article><article className="director-console-card"><small>RECENT PUBLISHED RECORDS</small><h3>{overview.published}</h3><p>Published records are the only ones visible on public pages.</p><a href="/admin/quality">Run quality report</a></article></div>
    </section>

    {role === "owner" && <section className="director-console-section">
      <h2>Launch checklist</h2><p className="director-console-helper">Read-only D1 summary. It never fetches, schedules, changes records, or spends money.</p>
      <div className="director-console-grid"><article className="director-console-card"><small>PUBLISHED COVERAGE</small><h3>{health.records.length}</h3><p>{health.records.filter((record) => record.kind === "article").length} articles · {health.records.filter((record) => record.kind === "game").length} games · {health.records.filter((record) => record.kind === "calendar").length} calendar items</p></article><article className="director-console-card"><small>READY FOR OWNER REVIEW</small><h3>{launchBatch.ready}</h3><p>{launchBatch.correction} need correction · {launchBatch.hold} intentionally held.</p></article><article className="director-console-card"><small>VISUAL COVERAGE</small><h3>{visualCoverage.approved} approved</h3><p>{fallbackRecords} published records use the labelled MyRPG fallback. {visualCoverage.pending} media items await review.</p></article><article className="director-console-card"><small>APPROVED SOURCES</small><h3>{health.approvedSources}</h3><p>Use Source Registry before entering any new private record.</p></article></div>
      <div className="director-console-card" style={{ marginTop: 14 }}><small>NEXT SAFE MANUAL ACTION</small><p>{health.nextAction}</p></div>
    </section>}

    {role === "owner" && <section className="director-console-section">
      <h2>Content health</h2><p className="director-console-helper">Counts use stored D1 dates only. Change the threshold to plan a manual fact-check pass; no record is changed.</p>
      <label className="director-console-helper" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>Fact-check threshold <select value={freshnessDays} onChange={(event) => setFreshnessDays(Number(event.target.value))}><option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days</option><option value={180}>180 days</option></select></label>
      <div className="director-console-grid"><article className="director-console-card"><small>WITHIN STORED THRESHOLD</small><h3>{currentFacts}</h3><p>Published records fact-checked within {freshnessDays} days.</p></article><article className="director-console-card"><small>NEEDS MANUAL REFRESH</small><h3>{staleFacts}</h3><p>Published records with a missing or older stored fact-check date.</p></article><article className="director-console-card"><small>APPROVED LEAD MEDIA</small><h3>{health.records.filter((record) => record.approvedMedia).length}</h3><p>{fallbackRecords} published records use the labelled fallback instead.</p></article><article className="director-console-card"><small>QUALITY FLAGS</small><h3>{health.seoIssues}</h3><p>Published records with missing source-backed public metadata. <a href="/admin/quality">Open Quality Report</a></p></article></div>
    </section>}

    <section className="director-console-section">
      <h2>Launch batch</h2><p className="director-console-helper">Private games, calendar records, and article packets are grouped from their current source, freshness, and review state. “Ready” means ready for an Owner decision, never automatic publication.</p>
      <div className="director-console-grid"><article className="director-console-card"><small>READY FOR REVIEW</small><h3>{launchBatch.ready}</h3><p>Source-backed records that can move to an Owner decision.</p></article><article className="director-console-card"><small>NEEDS CORRECTION</small><h3>{launchBatch.correction}</h3><p>Records missing a required source, date, draft detail, or other factual check.</p></article><article className="director-console-card"><small>HOLD</small><h3>{launchBatch.hold}</h3><p>Archived, rejected, or intentionally unresolved records.</p><a href="/admin/games">Review game and calendar batch</a></article></div>
    </section>

    <section className="director-console-section">
      <h2>Official Announcement Intake</h2>
      <p className="director-console-helper">Manual, source-first intake only. Paste a recent announcement from an already approved official domain. This never fetches, crawls, calls a model, or publishes automatically.</p>
      <form className="director-console-form" onSubmit={(event) => { event.preventDefault(); const values = new FormData(event.currentTarget); send({ kind: "article", action: "intake", sourceUrl: values.get("sourceUrl"), title: values.get("title"), gameId: values.get("gameSlug"), releaseDate: values.get("sourceDate"), factCheckedAt: values.get("factCheckedAt"), value: values.get("summary") }); }}>
        <input name="sourceUrl" type="url" placeholder="Official announcement URL" required />
        <input name="title" placeholder="Factual article title" required />
        <input name="gameSlug" placeholder="Published game slug (for example: lost-ark)" required />
        <label>Source date<input name="sourceDate" type="date" required /></label>
        <label>Fact-check date<input name="factCheckedAt" type="date" required /></label>
        <textarea name="summary" rows={7} placeholder="120–180 word factual, human-reviewed draft. Use only claims supported by the official source." required />
        <button className="director-console-primary" disabled={busy}>Create private intake candidate</button>
      </form>
    </section>

    <section className="director-console-section">
      <h2>Review next: articles</h2>
      <p className="director-console-helper">Only complete, current, source-approved article packets appear here. Recommendation: confirm, then approve or hold.</p>
      <div className="director-console-grid">{reviewNext.length ? reviewNext.map((article) => <article className="director-console-card" key={article.id}><small>{(article.recommendation || "edit").toUpperCase()} · {sourceHost(article.sourceUrl)}</small><h3>{article.title}</h3><p>Related game: {article.relatedGame || "Not recorded"} · Source date: {article.sourceDate?.slice(0, 10) || "Missing"}</p><p>Gamer takeaway: {article.gamerTakeaway}</p><p>Source, 120–180 word draft, and fact-check date are present. Media will use the labelled MyRPG fallback unless separately approved.</p><div className="director-console-row"><button onClick={() => window.location.assign(`/admin/preview/article/${encodeURIComponent(article.id)}`)}>Open source-first packet</button><button disabled={busy} onClick={() => action("article", "approve", article.id)}>Owner approve</button><button disabled={busy} onClick={() => action("article", "archive", article.id)}>Hold / archive</button></div></article>) : <div className="director-console-empty">No complete official announcement packets are ready. Create one only from a recent approved official announcement.</div>}</div>
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
