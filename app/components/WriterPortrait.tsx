"use client";

import { useState } from "react";
import type { Writer } from "./writers";

export function WriterPortrait({ writer, compact = false }: { writer: Writer; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  const size = compact ? 52 : 280;
  if (failed) return <div aria-label={`${writer.name} portrait unavailable`} style={{ width: "100%", height: size, minHeight: size, display: "grid", placeItems: "center", background: "linear-gradient(135deg,#152132,#0c111b)", color: writer.color, border: `1px solid ${writer.color}55`, textAlign: "center" }}><div><strong style={{ fontSize: compact ? 17 : 32 }}>{writer.initials}</strong><small style={{ display: "block", color: "#b8c5d4", marginTop: 5 }}>{compact ? writer.name : "MyRPG editorial persona"}</small></div></div>;
  return <img src={writer.image} alt={`Fictional AI editorial portrait of ${writer.name}`} width={compact ? 104 : 768} height={compact ? 104 : 1024} loading={compact ? "eager" : "lazy"} onError={() => setFailed(true)} style={{ display: "block", width: "100%", height: size, objectFit: "cover", objectPosition: "center top", background: "#101623" }} />;
}
