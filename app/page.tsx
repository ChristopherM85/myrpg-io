import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { articles, calendarItems, games, mediaAssets, siteSettings } from "../db/schema";
import { editorialGraphic, publicEditorialAssetUrl } from "./components/editorial-media";
import { NetworkFeature, PublicFooter, PublicHeader } from "./components/PublicChrome";
import "./home-news.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "MyRPG.IO — Find your next MMO", description: "Discover MMORPG news, release dates, factual game profiles, comparisons, and personalized MMO matches.", alternates: { canonical: "/" } };

export default async function Home() {
  let news: any[] = [], featured: any[] = [], releases: any[] = [], showNetwork = true;
  const articleVisuals = new Map<string, any>(), gameVisuals = new Map<string, any>();
  try {
    const db = getDb();
    const [articleRows, gameRows, releaseRows, settings, approved] = await Promise.all([
      db.select().from(articles).where(eq(articles.status, "published")).orderBy(desc(articles.publishedAt)).limit(4),
      db.select().from(games).where(eq(games.published, true)).limit(6),
      db.select({ item: calendarItems, game: games }).from(calendarItems).innerJoin(games, eq(calendarItems.gameId, games.id)).where(and(eq(calendarItems.published, true), eq(games.published, true), eq(calendarItems.dateConfidence, "confirmed"))).limit(4),
      db.select().from(siteSettings).limit(1),
      db.select().from(mediaAssets).where(and(eq(mediaAssets.status, "approved"), eq(mediaAssets.placement, "lead"))),
    ]);
    news = articleRows; featured = gameRows; releases = releaseRows; showNetwork = settings[0]?.networkPromotionsEnabled ?? true;
    for (const asset of approved) { if (asset.articleId && !articleVisuals.has(asset.articleId)) articleVisuals.set(asset.articleId, asset); if (asset.gameId && !gameVisuals.has(asset.gameId)) gameVisuals.set(asset.gameId, asset); }
  } catch { /* Public empty states intentionally conceal storage failures. */ }

  return <><PublicHeader /><main id="main-content" className="home-cinematic">
    <section className="home-hero"><div className="home-hero-art" aria-hidden="true" /><div className="home-hero-grid" aria-hidden="true" /><div className="home-hero-copy"><p className="home-eyebrow">THE MMO INTELLIGENCE NETWORK</p><h1><span>Find the world </span><br /><em>worth living in.</em></h1><p className="home-lede">Breaking MMO updates, release intelligence, and player-first discovery—built from official sources and reviewed by humans.</p><div className="home-actions"><Link className="home-primary" href="/find-my-mmo">Find My MMO <span aria-hidden="true">→</span></Link><Link className="home-secondary" href="/mmo-radar">Open MMO Radar</Link></div><div className="home-trust"><span><b>01</b> Official sources</span><span><b>02</b> Human approval</span><span><b>03</b> No content spam</span></div></div><aside className="home-hero-panel"><p>LIVE INTELLIGENCE</p><strong>{featured.length || "—"}</strong><span>published game profiles</span><Link href="/games">Explore the directory →</Link></aside></section>
    <section className="home-command"><Link href="/games"><span>EXPLORE</span><strong>Game Directory</strong><small>Factual profiles and official links</small></Link><Link href="/calendar"><span>TRACK</span><strong>Release Calendar</strong><small>Confirmed dates versus estimates</small></Link><Link href="/compare"><span>COMPARE</span><strong>Up to 3 MMOs</strong><small>Structured facts side by side</small></Link><Link href="/official-updates"><span>FOLLOW</span><strong>Official Updates</strong><small>Source-linked news timeline</small></Link></section>
    {showNetwork && <section className="home-network home-network-priority"><NetworkFeature /></section>}
    <section className="home-section home-news"><div className="home-section-head"><div><p className="home-eyebrow">LATEST TRANSMISSIONS</p><h2>What changed in the worlds you play</h2></div><Link href="/news">All MMO news →</Link></div>{news.length ? <div className="home-news-grid">{news.map((article, index) => <article className={index === 0 ? "home-story home-story-featured" : "home-story"} key={article.id}><CardVisual image={articleVisuals.get(article.id)} graphic={article.editorialGraphic} eager={index === 0} /><div className="home-story-body"><small>OFFICIAL UPDATE · {article.factCheckedAt?.slice(0, 10)}</small><h3><Link href={`/articles/${article.slug}`}>{article.title}</Link></h3><p>{article.summary}</p><Link href={`/articles/${article.slug}`}>Read intelligence →</Link></div></article>)}</div> : <VisualEmpty type="news" title="News desk standing by" body="Source-linked MMO coverage will appear here after human review." action="Explore official updates" href="/official-updates" />}</section>
    <section className="home-section"><div className="home-section-head"><div><p className="home-eyebrow">WORLD INDEX</p><h2>Choose your next obsession</h2></div><Link href="/games">Full directory →</Link></div>{featured.length ? <div className="home-game-grid">{featured.map((game) => <article className="home-game-card" key={game.id}><CardVisual image={gameVisuals.get(game.id)} graphic={game.editorialGraphic} /><div><small>{game.status.toUpperCase()}</small><h3><Link href={`/games/${game.slug}`}>{game.name}</Link></h3><p>{game.setting} · {game.combat}</p><span>{game.platforms}</span></div></article>)}</div> : <VisualEmpty type="games" title="The next worlds are being mapped" body="Only owner-published, fact-checked MMO profiles appear in the directory." action="Try Find My MMO" href="/find-my-mmo" />}</section>
    <section className="home-split"><div className="home-release"><p className="home-eyebrow">RELEASE SIGNAL</p><h2>Confirmed arrivals</h2>{releases.length ? releases.map(({ item, game }) => <Link key={item.id} href={`/games/${game.slug}`}><time>{item.dateLabel}</time><span>{item.title}</span><b>CONFIRMED</b></Link>) : <div className="home-mini-empty"><strong>No confirmed dates yet.</strong><span>Unconfirmed rumors never enter this feed.</span></div>}<Link className="home-text-link" href="/calendar">Open release calendar →</Link></div><div className="home-philosophy"><p className="home-eyebrow">WHY MYRPG</p><h2>Signal over noise.</h2><p>Every public record starts with an official source and ends with a human decision. AI helps organize the work; it never decides what deserves your trust.</p><div><Link href="/editorial-standards">Editorial standards</Link><Link href="/ai-transparency">AI transparency</Link></div></div></section>
  </main><PublicFooter /></>;
}

function CardVisual({ image, graphic, eager = false }: { image?: any; graphic?: string | null; eager?: boolean }) { const approved = publicEditorialAssetUrl(image); const fallback = editorialGraphic(graphic); return <figure className="home-card-art"><img src={approved || fallback.src} alt={approved ? image.altText : fallback.alt} width={approved ? image.width || 1200 : 1600} height={approved ? image.height || 675 : 900} loading={eager ? "eager" : "lazy"} /><figcaption>{approved ? image.credit || image.caption || "Approved editorial media" : "MyRPG editorial graphic — not gameplay."}</figcaption></figure>; }
function VisualEmpty({ type, title, body, action, href }: { type: string; title: string; body: string; action: string; href: string }) { return <article className={`home-visual-empty home-visual-empty-${type}`}><div><p className="home-eyebrow">CURATED · HUMAN-REVIEWED</p><h3>{title}</h3><p>{body}</p><Link href={href}>{action} →</Link></div></article>; }
