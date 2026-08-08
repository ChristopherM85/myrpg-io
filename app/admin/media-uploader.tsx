"use client";

import { useState } from "react";

type Target = { id: string; title: string };

export default function MediaUploader({ articles, games }: { articles: Target[]; games: Target[] }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    const target = String(data.get("target") || "");
    if (!(file instanceof File) || !target) { setMessage("Choose an image and one target record."); return; }
    setBusy(true);
    setMessage("Checking image dimensions...");
    try {
      const url = URL.createObjectURL(file);
      const image = new Image();
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("The selected file is not a readable image.")); image.src = url; });
      data.set("width", String(image.naturalWidth));
      data.set("height", String(image.naturalHeight));
      URL.revokeObjectURL(url);
      data.delete("target");
      if (target.startsWith("article:")) data.set("articleId", target.slice(8)); else data.set("gameId", target.slice(5));
      const response = await fetch("/api/admin/media/upload", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload could not be saved.");
      form.reset();
      setMessage("Private media record created. Review and approve it before it can appear publicly.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Upload could not be saved."); }
    finally { setBusy(false); }
  }

  return <form className="director-console-form" onSubmit={submit}>
    <h3 style={{ gridColumn: "1 / -1", margin: 0 }}>Owner upload to private media storage</h3>
    <p className="director-console-helper" style={{ gridColumn: "1 / -1", marginTop: -6 }}>JPEG, PNG, WebP, or AVIF only; 6 MB maximum. Uploads stay private until the Owner approves both the media and its target record.</p>
    <select name="target" required defaultValue=""><option value="" disabled>Attach to...</option>{articles.map((article) => <option key={`article:${article.id}`} value={`article:${article.id}`}>Article: {article.title}</option>)}{games.map((game) => <option key={`game:${game.id}`} value={`game:${game.id}`}>Game: {game.title}</option>)}</select>
    <select name="placement" required defaultValue="lead"><option value="lead">Lead visual</option><option value="supporting">Supporting visual (article only)</option><option value="game-card">Game-card visual</option><option value="directory-card">Directory-card visual</option></select>
    <input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required />
    <input name="credit" placeholder="Credit / copyright line" />
    <input name="rightsNotes" placeholder="Rights / reuse notes" required />
    <input name="altText" placeholder="Descriptive alt text" required />
    <input name="caption" placeholder="Visible caption (optional)" />
    <button className="director-console-primary" disabled={busy}>{busy ? "Uploading..." : "Upload as pending media"}</button>
    {message && <p className="director-console-message" style={{ gridColumn: "1 / -1" }}>{message}</p>}
  </form>;
}
