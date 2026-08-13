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

  async function archiveLead(leadRunId: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/admin/source-verification", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ leadRunId, action: "archive" }) });
      const result = await response.json(); setMessage(result.error || "Removed from the active research inbox. Refreshing…"); if (result.ok) setTimeout(() => location.reload(), 500);
    } catch { setMessage("Unable to update this lead. Please refresh and try again."); } finally { setBusy(false); }
  }

  return <main className="director-console">
    <p className="director-console-kicker">MYRPG / OWNER-ONLY / NOINDEX</p>
    <h1>Evidence review</h1>
    <p className="director-console-helper">Private, source-backed evidence only. This page never approves or publishes an article, game, or update.</p>
    <label className="director-console-helper">Evidence lane <select value={lane} onChange={(event) => setLane(event.target.value as "all" | "live-service")}><option value="all">All evidence packets</option><option value="live-service">Live Service &amp; Online Games</option></select></label>
    {message && <p className="director-console-message">{message}</p>}
    <section className="director-console-section">
      <p className="director-console-kicker">OFFICIAL EVIDENCE ONLY</p>
      <h2>Evidence review</h2>
      <p className="director-console-helper">This is where direct official developer, publisher, platform, and store evidence is reviewed. Only official-source packets appear here; nothing is approved or published from this screen.</p>
      {verificationPackets.length > 0 && <><h3 style={{ marginTop: 24 }}>Verified private official evidence</h3><div className="director-console-grid" style={{ marginTop: 14 }}>{verificationPackets.map((packet) => { let evidence: any = {}; try { evidence = JSON.parse(packet.evidenceJson); } catch {} return <article className="director-console-card" key={packet.id}><small>PRIVATE OFFICIAL EVIDENCE / {packet.confidence?.toUpperCase()} CONFIDENCE</small><h3>{evidence?.officialAnnouncement?.title || "Verified official announcement"}</h3><p>{packet.source?.domain || "Approved official source"} · {packet.sourceDate?.slice(0, 10) || "source date not visibly stated"}</p><a href={packet.normalizedUrl} target="_blank" rel="noreferrer">Open official announcement ↗</a><p className="director-console-helper">Nothing public was created. This is ready for a separate source-first content decision.</p></article>; })}</div></>}
      {leads.length > 0 && <details className="director-console-helper" style={{ marginTop: 24 }}><summary>Research backlog — {leads.length} third-party lead{leads.length === 1 ? "" : "s"} not eligible for factual coverage</summary><p>These are not official sources and cannot be approved, verified, or published. They are retained privately only as research pointers. Remove any that are not worth pursuing.</p><div className="director-console-grid" style={{ marginTop: 14 }}>{leads.map((lead) => <article className="director-console-card" key={lead.id}><small>THIRD-PARTY LEAD / NOT ACTIONABLE</small><h3>{lead.title}</h3><p>Spotted via {lead.sourceDomain} {lead.sourceDate ? `on ${lead.sourceDate.slice(0, 10)}` : ""}.</p>{lead.sourceUrl && <a href={lead.sourceUrl} target="_blank" rel="noreferrer">Read third-party lead ↗</a>}<p className="director-console-helper">It will not enter evidence, drafting, or publication without a separate direct official announcement.</p><button type="button" disabled={busy} onClick={() => archiveLead(lead.id)}>Remove from research inbox</button></article>)}</div></details>}
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
