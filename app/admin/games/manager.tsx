"use client";
import { useState } from "react";

type Game = Record<string, any>;
export default function GameManager({ role, games, sources }: { role: string; games: Game[]; sources: Game[] }) {
  const [message, setMessage] = useState("");
  const send = async (body: Record<string, unknown>) => {
    const response = await fetch("/api/admin/actions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    setMessage(result.error || "Saved. Refreshing…");
    if (result.ok) setTimeout(() => location.reload(), 500);
  };
  const candidates = games.filter((game) => !game.published && game.reviewStatus !== "archived");
  const sourceName = (url?: string) => { try { return new URL(url || "").hostname.replace(/^www\./, ""); } catch { return "source missing"; } };
  return <main className="console">
    <p>MYRPG / GAME MANAGEMENT</p>
    <h1>Factual game records</h1>
    <p>Launch batch records stay private until the Owner approves and publishes them. Live providers: OFF · $0.00.</p>
    <form className="source-form" onSubmit={(event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); send({ kind: "game", action: "create", ...values }); }}>
      {["name", "slug", "status", "platforms", "businessModel", "combat", "setting", "focus", "activity", "timeCommitment", "releaseDate", "officialUrl", "sourceUrl", "factCheckedAt"].map((name) => <input key={name} name={name} placeholder={name} required={!['activity', 'timeCommitment'].includes(name)} />)}
      <small>Activity and time commitment are optional for publication, but make Find My MMO more useful.</small>
      <button>Create factual game</button>
    </form>

    <section>
      <h2>Launch batch review</h2>
      <p className="console-sub">{candidates.length} private candidate{candidates.length === 1 ? "" : "s"}. Each needs an Owner decision before it can appear in the directory, calendar, comparison, or matcher.</p>
      <div className="console-grid">{candidates.map((game) => <article className="console-card" key={game.id}>
        <small>{String(game.reviewStatus || "draft").toUpperCase()} · source confidence: {game.sourceConfidence || "pending"}</small>
        <h3>{game.name}</h3>
        <p>{game.status} · {game.platforms} · {game.businessModel}</p>
        <p>{game.directorySummary || "No directory summary yet."}</p>
        <small>Release: {game.releaseDate || "Unconfirmed"} · {game.releaseDateConfidence || "unconfirmed"}</small><br />
        <small>Source: <a href={game.sourceUrl} target="_blank" rel="noopener noreferrer">{sourceName(game.sourceUrl)}</a> · checked {game.factCheckedAt?.slice(0, 10) || "missing"}</small>
        <div className="row">
          <button onClick={() => send({ kind: "game", action: "approve", id: game.id })} disabled={role !== "owner"}>Approve</button>
          <button onClick={() => { const summary = prompt("Edit factual directory summary", game.directorySummary || ""); if (summary !== null) send({ kind: "game", action: "edit", id: game.id, value: summary }); }}>Edit summary</button>
          <button onClick={() => send({ kind: "game", action: "reject", id: game.id })}>Reject</button>
          <button onClick={() => send({ kind: "game", action: "archive", id: game.id })}>Archive</button>
          <button onClick={() => send({ kind: "game", action: "publish", id: game.id })} disabled={role !== "owner" || game.reviewStatus !== "approved"}>Publish</button>
        </div>
      </article>)}</div>
    </section>
    <section><h2>Source Registry coverage</h2><p className="console-sub">{sources.filter((source) => source.approved).length} approved source domains. Candidate creation is blocked until its official source domain is approved.</p></section>
    {message && <p className="console-message">{message}</p>}
  </main>;
}
