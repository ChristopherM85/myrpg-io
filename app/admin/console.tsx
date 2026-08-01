"use client";

import { useState } from "react";

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
};

type Settings = { simulation: boolean; promotion: boolean; daily: number; perJob: number; stop: boolean };

export default function Console({ role, articles, sources, runs, audits, media, settings }: {
  role: string; articles: Item[]; sources: Item[]; runs: Item[]; audits: Item[]; media: Item[]; settings: Settings;
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
      <h2>Review Queue & Content Library</h2>
      <p className="director-console-helper">Nothing can publish until you approve it.</p>
      <div className="director-console-grid">{articles.length ? articles.map((article) => <article className="director-console-card" key={article.id}>
        <small>{article.status?.toUpperCase() || "DRAFT"} · human review required</small><h3>{article.title}</h3><p>{article.summary}</p>
        <div className="director-console-row">{["approve", "publish", "reject", "archive", "restore", "unpublish"].map((name) => <button key={name} disabled={busy} onClick={() => action("article", name, article.id)}>{name}</button>)}</div>
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
      <h2>Media Review</h2><p className={styles.helper}>Use only approved owner uploads or official game media. An Owner must approve display.</p>
      <div className={styles.grid}>{media.length ? media.map((item) => <article className={styles.card} key={item.id}><small>{item.status?.toUpperCase()} · {item.sourceType} · {item.placement}</small><h3>{item.altText}</h3><p>{item.credit || "No credit supplied"}</p><div className={styles.row}>{["approve", "reject", "archive", "restore"].map((name) => <button key={name} disabled={busy} onClick={() => action("media", name, item.id)}>{name}</button>)}</div></article>) : <div className={styles.empty}>No media is awaiting review.</div>}</div>
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
