import { getDb } from "../../db";
import { calendarItems, games } from "../../db/schema";
import { and, eq } from "drizzle-orm";
import { PublicPage } from "../components/PublicChrome";

export const dynamic = "force-dynamic";
export const metadata = { title: "MMO Release Calendar | MyRPG.IO", description: "Officially sourced MMO release dates and windows.", alternates: { canonical: "https://myrpg.io/calendar" } };

type CalendarRow = { item: typeof calendarItems.$inferSelect; game: typeof games.$inferSelect };
const asTime = (value: string) => { const parsed = Date.parse(value); return Number.isFinite(parsed) ? parsed : null; };

export default async function Calendar() {
  let rows: CalendarRow[] = [];
  try { rows = await getDb().select({ item: calendarItems, game: games }).from(calendarItems).innerJoin(games, eq(calendarItems.gameId, games.id)).where(and(eq(calendarItems.published, true), eq(games.published, true))); } catch { /* Public page keeps its safe empty state. */ }
  const today = new Date(); today.setHours(0, 0, 0, 0); const current = today.valueOf();
  const dated = rows.map((row) => ({ ...row, releaseTime: asTime(row.item.dateLabel) })); const upcoming = dated.filter((row) => row.releaseTime !== null && row.releaseTime >= current).sort((a, b) => a.releaseTime! - b.releaseTime!); const recorded = dated.filter((row) => !upcoming.includes(row)).sort((a, b) => (b.releaseTime || 0) - (a.releaseTime || 0));
  const cards = (items: typeof dated) => <div className="calendar-release-grid">{items.map(({ item, game }) => <article className="calendar-release-card" key={item.id}><div className="calendar-release-date"><small>{item.dateConfidence.toUpperCase()}</small><strong>{item.dateLabel}</strong></div><div className="calendar-release-details"><h2><a href={`/games/${game.slug}`}>{item.title}</a></h2><p>{game.name}</p><div><span>Fact-checked {item.factCheckedAt.slice(0, 10)}</span><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Official source</a></div></div></article>)}</div>;
  return <PublicPage className="calendar-page"><nav aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">/</span><span>Calendar</span></nav><header className="calendar-intro"><div><p>MYRPG / RELEASE CALENDAR</p><h1>Release signals,<br /><em>not hype.</em></h1><p>Confirmed, estimated, and unconfirmed dates stay visibly distinct. Only Owner-published records with official sources appear here.</p></div><aside aria-label="Calendar summary"><strong>{upcoming.length}</strong><span>confirmed or dated release signal{upcoming.length === 1 ? "" : "s"} ahead</span><small>{recorded.length} recorded release date{recorded.length === 1 ? "" : "s"} kept for context</small></aside></header>{rows.length ? <><section className="calendar-release-section" aria-labelledby="upcoming-release-signals"><div className="calendar-section-head"><div><p>RELEASE SIGNALS</p><h2 id="upcoming-release-signals">What is next</h2></div><span>Official date or stored official window only</span></div>{upcoming.length ? cards(upcoming) : <div className="calendar-empty">No future official release date or window is currently published. MyRPG leaves this clear rather than filling it with estimates.</div>}</section>{recorded.length > 0 && <section className="calendar-release-section calendar-recorded-section" aria-labelledby="recorded-release-dates"><div className="calendar-section-head"><div><p>RECORDED DATES</p><h2 id="recorded-release-dates">Release context</h2></div><span>Published historical and launch-reference dates</span></div>{cards(recorded)}</section>}</> : <section className="calendar-empty"><h2>No reviewed release items yet</h2><p>Only Owner-published dates backed by official sources appear here.</p></section>}</PublicPage>;
}
