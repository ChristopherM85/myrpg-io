"use client";

import { useState } from "react";

export default function ArticlePreviewActions({ id, summary, ready, publicUrl }: { id: string; summary: string; ready: boolean; publicUrl: string }) {
  const [draft, setDraft] = useState(summary);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/actions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "article", action: "edit", id, value: draft }) });
      const result = await response.json();
      setMessage(result.error || "Draft saved. The audit log has been updated.");
    } catch { setMessage("Unable to save the draft. Please try again."); }
    finally { setSaving(false); }
  }
  async function publish() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/actions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "article", action: "publish", id }) });
      const result = await response.json();
      setMessage(result.error || "Article published. Opening the public article…");
      if (result.ok) setTimeout(() => location.assign(publicUrl), 700);
    } catch { setMessage("Unable to publish. Please refresh and try again."); }
    finally { setSaving(false); }
  }
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "28px 0" }}>
    <a href="/admin#review-queue" style={linkStyle}>Back to Review Queue</a>
    {ready && <button type="button" disabled={saving} onClick={publish} style={buttonStyle}>Confirm and publish</button>}
    <details style={{ width: "100%", marginTop: 8 }}><summary style={{ cursor: "pointer", color: "#76f5e3", fontWeight: 700 }}>Edit draft</summary>
      <label style={{ display: "block", marginTop: 14, color: "#c4cad8" }}>Draft summary
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={8} style={textareaStyle} />
      </label><button type="button" disabled={saving} onClick={save} style={buttonStyle}>{saving ? "Saving…" : "Save draft"}</button>
      {message && <p style={{ color: "#c4cad8" }}>{message}</p>}
    </details>
  </div>;
}
const linkStyle = { display: "inline-block", border: "1px solid #2a3041", background: "#171c29", color: "#edf3f5", padding: "10px 14px", textDecoration: "none", fontWeight: 700, fontSize: 13 };
const buttonStyle = { marginTop: 10, border: "1px solid #76f5e3", background: "#76f5e3", color: "#06100f", padding: "10px 14px", fontWeight: 800, cursor: "pointer" };
const textareaStyle = { display: "block", width: "100%", boxSizing: "border-box" as const, marginTop: 8, border: "1px solid #2a3041", background: "#0c1019", color: "#edf3f5", padding: 12, font: "inherit" };
