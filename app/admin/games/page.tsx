import { requireChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { calendarItems, games, sources, users } from "../../../db/schema";
import { eq } from "drizzle-orm";
import GameManager from "./manager";

export const dynamic = "force-dynamic";

export default async function AdminGames() {
  const user = await requireChatGPTUser("/admin/games");
  let rows: any[] = []; let sourceRows: any[] = []; let calendarRows: any[] = []; let role = "editor";
  try {
    const db = getDb();
    role = (await db.select().from(users).where(eq(users.email, user.email)).limit(1))[0]?.role || role;
    rows = await db.select().from(games);
    sourceRows = await db.select().from(sources);
    calendarRows = await db.select().from(calendarItems);
  } catch {}
  return <GameManager role={role} games={rows} sources={sourceRows} calendarItems={calendarRows} />;
}
