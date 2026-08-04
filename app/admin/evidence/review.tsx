"use client";

import { useState } from "react";

const LIVE_SERVICE_DOMAINS = new Set(["rockstargames.com", "callofduty.com", "fortnite.com", "battlefield.com", "arcraiders.com"]);

export default function EvidenceReview({ packets }: { packets: any[] }) {
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

  return <main className="director-console">
    <p className="director-console-kicker">MYRPG / OWNER-ONLY / NOINDEX</p>
    <h1>Evidence review</h1>
    <p className="director-console-helper">Private official-source evidence only. Applying a field updates just that factual taxonomy field; it never publishes content.</p>
    <label className="director-console-helper">Evidence lane <select value={lane} onChange={(event) => setLane(event.target.value as "all" | "live-service")}><option value="all">All evidence packets</option><option value="live-service">Live Service &amp; Online Games</option></select></label>
    {message && <p className="director-console-message">{message}</p>}
    {visiblePackets.map((packet) => {
      let evidence: any = {}; try { evidence = JSON.parse(packet.evidenceJson); } catch {}
      const fields = ["multiplayer_type", "world_model", "lifecycle_status"];
      return <section className="director-console-section" key={packet.id}>
        <h2>{packet.game?.name || packet.subjectName || "Prospective game"}</h2>
        <p>{packet.source?.domain || "Unknown approved source"} · {packet.confidence} confidence · checked {packet.checkedAt?.slice(0, 10)}</p><p className="director-console-helper">{packet.coverageLane?.replaceAll("_", " ") || "unclassified"} · Jordan Hale — The Live Service Desk · MyRPG AI editorial persona, Owner-overseen.</p>
        <p><a href={packet.normalizedUrl} target="_blank" rel="noreferrer">Official URL ↗</a></p>
        <pre style={{ whiteSpace: "pre-wrap", background: "#0c1019", padding: 16, border: "1px solid #2a3041" }}>{JSON.stringify(evidence, null, 2)}</pre>
        <div className="director-console-grid">{fields.map((field) => <article className="director-console-card" key={field}><small>{field.replaceAll("_", " ")}</small><h3>{evidence?.supported?.[field] || "Not supported"}</h3><p>{evidence?.unsupported?.find((item: string) => item.startsWith(field)) || "No unsupported note recorded."}</p><div className="director-console-row"><button disabled={busy || !evidence?.supported?.[field]} onClick={() => decide(packet.id, field, "apply")}>Apply</button><button disabled={busy} onClick={() => decide(packet.id, field, "hold")}>Hold</button><button disabled={busy} onClick={() => decide(packet.id, field, "reject")}>Reject</button></div></article>)}</div>
        <p className="director-console-helper">{packet.game ? "A supported field may be applied to the existing private or published game record; this never publishes." : "Prospective-only evidence: create no profile from this screen. Apply remains unavailable until a separate Owner-approved game record exists."}</p><p className="director-console-helper">Audit: {packet.audits?.length ? packet.audits.map((audit: any) => `${audit.action} · ${audit.createdAt}`).join(" · ") : "No field decision recorded."}</p>
      </section>;
    })}
    {!visiblePackets.length && <section className="director-console-section"><p className="director-console-helper">No private Live Service Desk evidence packets are ready. Approve one official source and request one Owner-bounded URL review first.</p></section>}
  </main>;
}
