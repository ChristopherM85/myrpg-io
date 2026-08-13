"use client";

import { useState } from "react";

const LIVE_SERVICE_DOMAINS = new Set(["rockstargames.com", "callofduty.com", "fortnite.com", "battlefield.com", "arcraiders.com"]);

export default function EvidenceReview({ packets, leads, verificationPackets, primaryDomains }: { packets: any[]; leads: any[]; verificationPackets: any[]; primaryDomains: string[] }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [lane, setLane] = useState<"all" | "live-service">("all");
  const visiblePackets = lane === "live-service" ? packets.filter((packet) => LIVE_SERVICE_DOMAINS.has(String(packet.source?.domain || "").replace(/^www\./, "").toLowerCase())) : packets;

  async function decide(evidenceId: string, taxonomyField: string, action: "apply" | "hold" | "reject") {
    setBusy(true);
    const response = await fetch("/api/admin/actions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "source_evidence", evidenceId, taxonomyField, action }) });
    const result = await response.json();
    setMessage(result.error || "Decision recorded. Refreshing…");
    if (result.ok) setTimeout(() => location.reload(), 450);
    setBusy(false);
  }

  async function verifyLead(leadRunId: string, officialUrl: string) {
    try { const url = new URL(officialUrl); if (url.pathname === "/" || /(?:^|\/)(?:feed|rss|tag|category)(?:\/|$)|\.xml$/i.test(url.pathname)) { setMessage("Use a specific official announcement page—not a site homepage, tag page, or RSS feed."); return; } } catch { setMessage("Paste a complete HTTPS official announcement URL."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/admin/source-verification", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ leadRunId, officialUrl }) });
      const result = await response.json(); setMessage(result.error || "Private official evidence packet created. Refreshing…");
      if (result.ok) setTimeout(() => location.reload(), 500);
    } catch { setMessage("Unable to verify the official announcement. Please refresh and try again."); }
    finally { setBusy(false); }
  }

  async function holdLead(leadRunId: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/source-verification", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ leadRunId, action: "hold" }) });
      const result = await response.json(); setMessage(result.error || "Lead kept private for later. Refreshing…"); if (result.ok) setTimeout(() => location.reload(), 500);
    } catch { setMessage("Unable to update this lead. Please refresh and try again."); } finally { setBusy(false); }
  }

  return <main className="director-console">
    <p className="director-console-kicker">MYRPG / OWNER-ONLY / NOINDEX</p>
    <h1>Evidence review</h1>
    <p className="director-console-helper">Private, source-backed evidence only. This page never approves or publishes an article, game, or update.</p>
    <label className="director-console-helper">Evidence lane <select value={lane} onChange={(event) => setLane(event.target.value as "all" | "live-service")}><option value="all">All evidence packets</option><option value="live-service">Live Service &amp; Online Games</option></select></label>
    {message && <p className="director-console-message">{message}</p>}
    <section className="director-console-section">
      <p className="director-console-kicker">SIMPLE OWNER STEP</p>
      <h2>Verify an official source</h2>
      <p className="director-console-helper">Nothing is being approved or published here. A news-site link tells us what to investigate; only the matching official announcement can become private evidence.</p>
      <details className="director-console-helper"><summary>Which URLs work?</summary><p>Use one specific announcement from the game’s developer, publisher, platform, or official store. A news article, homepage, category page, tag page, and RSS feed will not work.</p><p>Approved primary domains: {primaryDomains.length ? primaryDomains.join(" · ") : "none configured yet"}.</p></details>
      <div className="director-console-grid">{leads.length ? leads.map((lead) => <article className="director-console-card" key={lead.id}>
        <small>{lead.verified ? "DONE / PRIVATE OFFICIAL EVIDENCE" : "NOT READY / OFFICIAL SOURCE NEEDED"}</small><h3>{lead.title}</h3>
        <p className="director-console-helper">Spotted via {lead.sourceDomain} {lead.sourceDate ? `on ${lead.sourceDate.slice(0, 10)}` : ""}. This is a third-party lead, not an official citation.</p>
        {lead.sourceUrl && <p><a href={lead.sourceUrl} target="_blank" rel="noreferrer">Read the lead ↗</a></p>}
        {lead.verified ? <p className="director-console-helper">Official page verified on {lead.verified.source?.domain || "an approved official source"}. It remains private; you will review it separately before any content can be prepared.</p> : <><p className="director-console-helper"><strong>What to do:</strong> if you know the matching official announcement, paste that exact page below. If you do not, choose <strong>Keep private for later</strong>; do not paste this news link or a homepage.</p><form className="director-console-form" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); verifyLead(lead.id, String(form.get("officialUrl") || "")); }}><label>Direct official announcement URL <input name="officialUrl" type="url" placeholder="https://official-site.example/news/announcement" required /></label><div className="director-console-row"><button className="director-console-primary" disabled={busy}>Verify official source</button><button type="button" disabled={busy} onClick={() => holdLead(lead.id)}>Keep private for later</button></div></form></>}
      </article>) : <div className="director-console-empty">No unverified private discovery leads are waiting.</div>}</div>
      {verificationPackets.length > 0 && <><h3 style={{ marginTop: 24 }}>Completed private verification</h3><div className="director-console-grid" style={{ marginTop: 14 }}>{verificationPackets.map((packet) => { let evidence: any = {}; try { evidence = JSON.parse(packet.evidenceJson); } catch {} return <article className="director-console-card" key={packet.id}><small>DONE / PRIVATE OFFICIAL EVIDENCE</small><h3>{evidence?.officialAnnouncement?.title || "Verified official announcement"}</h3><p>{packet.source?.domain || "Approved official source"} · {packet.sourceDate?.slice(0, 10) || "source date not visibly stated"}</p><a href={packet.normalizedUrl} target="_blank" rel="noreferrer">Open official announcement ↗</a><p className="director-console-helper">Nothing public was created. This is ready for a separate source-first content decision.</p></article>; })}</div></>}
    </section>
    {visiblePackets.map((packet) => {
      let evidence: any = {}; try { evidence = JSON.parse(packet.evidenceJson); } catch {}
      const fields = ["multiplayer_type", "world_model", "lifecycle_status"];
      return <section className="director-console-section" key={packet.id}>
        <h2>{packet.game?.name || packet.subjectName || "Prospective game"}</h2>
        <p>{packet.source?.domain || "Unknown approved source"} · {packet.confidence} confidence · checked {packet.checkedAt?.slice(0, 10)}</p><p className="director-console-helper">{packet.coverageLane?.replaceAll("_", " ") || "unclassified"} · Jordan Hale — The Live Service Desk · MyRPG AI editorial persona, Owner-overseen.</p>
        <p><a href={packet.normalizedUrl} target="_blank" rel="noreferrer">Official URL ↗</a></p>
        <pre style={{ whiteSpace: "pre-wrap", background: "#0c1019", padding: 16, border: "1px solid #2a3041" }}>{JSON.stringify(evidence, null, 2)}</pre>
        <div className="director-console-grid">{fields.map((field) => <article className="director-console-card" key={field}><small>{field.replaceAll("_", " ")}</small><h3>{evidence?.supported?.[field] || "Not supported"}</h3><p>{evidence?.unsupported?.find((item: string) => item.startsWith(field)) || "No unsupported note recorded."}</p><div className="director-console-row"><button disabled={busy || !packet.game || !evidence?.supported?.[field]} onClick={() => decide(packet.id, field, "apply")}>Apply</button><button disabled={busy} onClick={() => decide(packet.id, field, "hold")}>Hold</button><button disabled={busy} onClick={() => decide(packet.id, field, "reject")}>Reject</button></div></article>)}</div>
        <p className="director-console-helper">{packet.game ? "A supported field may be applied to the existing private or published game record; this never publishes." : "Prospective-only evidence: create no profile from this screen. Apply remains unavailable until a separate Owner-approved game record exists."}</p><p className="director-console-helper">Audit: {packet.audits?.length ? packet.audits.map((audit: any) => `${audit.action} · ${audit.createdAt}`).join(" · ") : "No field decision recorded."}</p>
      </section>;
    })}
    {!visiblePackets.length && <section className="director-console-section"><p className="director-console-helper">No private Live Service Desk evidence packets are ready. Approve one official source and request one Owner-bounded URL review first.</p></section>}
  </main>;
}
