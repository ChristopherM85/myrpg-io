import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "../../../db";
import { games, mediaAssets } from "../../../db/schema";
import { EditorialVisual } from "../../components/EditorialVisual";
import { PublicPage } from "../../components/PublicChrome";

export const dynamic = "force-dynamic";

export default async function Game({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; let game: any; let visual: any;
  try { const db = getDb(); game = (await db.select().from(games).where(and(eq(games.slug, slug), eq(games.published, true))).limit(1))[0]; if (game) visual = (await db.select().from(mediaAssets).where(and(eq(mediaAssets.gameId, game.id), eq(mediaAssets.placement, "lead"), eq(mediaAssets.status, "approved"))).limit(1))[0]; } catch { /* not found remains public 404 */ }
  if (!game) return notFound();
  return <PublicPage><nav aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/games">Games</a> / {game.name}</nav><p style={eyebrow}>HUMAN-APPROVED GAME PROFILE</p><h1 style={heading}>{game.name}</h1><p style={muted}>Recently fact-checked: {game.factCheckedAt?.slice(0, 10)}</p><EditorialVisual title={game.name} category={game.setting || "MMO game profile"} label="Human-approved factual profile" image={visual} /><dl style={facts}>{[["Status", game.status], ["Platforms", game.platforms], ["Business model", game.businessModel], ["Combat", game.combat], ["Setting", game.setting], ["Focus", game.focus], ["Release", game.releaseDate || "Not confirmed"]].map(([label, value]) => <div key={label as string}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>{game.officialUrl && <p><a href={game.officialUrl} target="_blank" rel="noopener noreferrer" style={link}>Official website →</a></p>}<section style={source}><h2>Source & editorial notes</h2><p>This profile uses visible, owner-approved factual fields only. <a href={game.sourceUrl} target="_blank" rel="noopener noreferrer" style={link}>Official source</a></p></section><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "VideoGame", name: game.name, gamePlatform: game.platforms, datePublished: game.releaseDate || undefined }) }} /></PublicPage>;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return { title: `${slug.replaceAll("-", " ")} | MyRPG.IO`, alternates: { canonical: `https://myrpg.io/games/${slug}` } }; }
const eyebrow = { color: "#76f5e3", fontSize: 11, fontWeight: 800, letterSpacing: 1.5, marginTop: 30 }; const heading = { fontSize: "clamp(2.6rem,7vw,5rem)", letterSpacing: "-.06em", margin: "12px 0" }; const muted = { color: "#aeb6c7" }; const facts = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12, borderTop: "1px solid #273044", marginTop: 30, paddingTop: 20 }; const link = { color: "#76f5e3" }; const source = { borderLeft: "3px solid #76f5e3", padding: "16px 20px", marginTop: 32, background: "#101521", color: "#aeb6c7" };
