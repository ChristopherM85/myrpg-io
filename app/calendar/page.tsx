import { getDb } from "../../db";
import { calendarItems, games } from "../../db/schema";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function Calendar() {
  let rows: Array<{ item: typeof calendarItems.$inferSelect; game: typeof games.$inferSelect }> = [];
  try {
    rows = await getDb().select({ item: calendarItems, game: games }).from(calendarItems)
      .innerJoin(games, eq(calendarItems.gameId, games.id))
      .where(and(eq(calendarItems.published, true), eq(games.published, true)));
  } catch {}

  return <main style={{ maxWidth: 900, margin: "auto", padding: 48 }}>
    <p>MYRPG / RELEASE CALENDAR</p>
    <h1>MMO releases</h1>
    <p>Dates are shown exactly as confirmed by their official sources. Estimated and unconfirmed dates are clearly labelled.</p>
    {rows.length ? rows.map(({ item, game }) => <article key={item.id}>
      <h2><a href={`/games/${game.slug}`}>{item.title}</a></h2>
      <p>{item.dateLabel} <strong>— {item.dateConfidence}</strong></p>
      <small>Fact-checked {item.factCheckedAt.slice(0, 10)} · <a href={item.sourceUrl} rel="noopener noreferrer">Official source</a></small>
    </article>) : <p>Reviewed calendar entries will appear here after publication.</p>}
  </main>;
}
