import Image from "next/image";
import type { Metadata } from "next";
import { PublicFooter, PublicHeader } from "../components/PublicChrome";

export const metadata: Metadata = { title: "MyRPG Writers | AI editorial personas", description: "Meet the AI editorial personas behind MyRPG's human-reviewed MMO coverage.", alternates: { canonical: "/writers" } };
const writers = [
  { name: "Maya Chen", title: "The Signal Editor", image: "/writers/maya.png", color: "#76f5e3", focus: "Breaking MMO news, official announcements, studio updates, and release dates.", voice: "Concise, factual, calm, and source-first." },
  { name: "Marcus Vale", title: "The World Builder", image: "/writers/marcus.png", color: "#65d4cc", focus: "Systems, communities, sandbox games, and long-term game health.", voice: "Thoughtful, practical, and analytical." },
  { name: "Elena Rossi", title: "The Player Advocate", image: "/writers/elena.png", color: "#e8c37d", focus: "Beginner guides, recommendations, accessibility, and return-to-game explainers.", voice: "Warm, clear, helpful, never condescending." },
  { name: "Theo Grant", title: "The Launch Scout", image: "/writers/theo.png", color: "#8bd88e", focus: "Upcoming MMOs, early access, betas, alphas, and overlooked projects.", voice: "Curious, energetic, and cautious about hype." },
];

export default function WritersPage() {
  return <><PublicHeader /><main style={{ minHeight: "60vh", maxWidth: 1100, margin: "0 auto", background: "#090b12", color: "#f0f0ed", fontFamily: "Arial, sans-serif", padding: "72px 24px" }}>
    <p style={{ color: "#76f5e3", letterSpacing: 2, fontSize: 12 }}>MYRPG EDITORIAL DESK</p>
    <h1 style={{ fontSize: "clamp(42px,6vw,74px)", margin: "12px 0" }}>Meet the writers behind the signal.</h1>
    <p style={{ maxWidth: 650, color: "#aab1c1", lineHeight: 1.6 }}>Four AI editorial personas, each with a clear coverage lane. Every draft is source-linked and overseen by MyRPG.IO&apos;s human Director before publication.</p>
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 20, marginTop: 48 }}>{writers.map((writer) => <article key={writer.name} style={{ border: "1px solid #293142", background: "#121722", overflow: "hidden" }}><Image src={writer.image} alt={`Fictional AI editorial portrait of ${writer.name}`} width={768} height={1024} style={{ width: "100%", height: 280, objectFit: "cover", objectPosition: "center top" }} /><div style={{ padding: 22, borderTop: `3px solid ${writer.color}` }}><p style={{ color: writer.color, fontSize: 11, letterSpacing: 1.3, margin: 0 }}>{writer.title.toUpperCase()}</p><h2 style={{ fontSize: 25, margin: "8px 0" }}>{writer.name}</h2><p style={{ fontSize: 14, lineHeight: 1.55, color: "#c3c8d4" }}>{writer.focus}</p><p style={{ fontSize: 12, color: "#8f98ab" }}><b>Voice:</b> {writer.voice}</p><p style={{ fontSize: 11, color: "#76f5e3", lineHeight: 1.45 }}>AI editorial persona, overseen by MyRPG.IO&apos;s human Director.</p></div></article>)}</section>
    <section style={{ marginTop: 48, padding: 24, borderLeft: "3px solid #76f5e3", background: "#111a27" }}><h2>How daily coverage works</h2><p style={{ color: "#aab1c1", lineHeight: 1.6 }}>A budget-capped workflow moves approved sources through Scout, Research, Validator, Editor, and human review. Live generation and automatic publishing are disabled until the Owner enables them.</p></section>
  </main><PublicFooter /></>;
}
