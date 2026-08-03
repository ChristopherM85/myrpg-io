import { eq } from "drizzle-orm";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { articles, calendarItems, gameTimelineEvents, games, publicCorrections, users } from "../../../db/schema";
import TimelineManager from "./manager";
export const dynamic="force-dynamic"; export const metadata={robots:{index:false,follow:false}};
export default async function TimelineAdmin(){const user=await requireChatGPTUser("/admin/timeline");let role="editor",gameRows:any[]=[],events:any[]=[],articleRows:any[]=[],calendarRows:any[]=[],corrections:any[]=[];try{const db=getDb();role=(await db.select().from(users).where(eq(users.email,user.email)).limit(1))[0]?.role||role;[gameRows,events,articleRows,calendarRows,corrections]=await Promise.all([db.select().from(games).where(eq(games.published,true)),db.select().from(gameTimelineEvents),db.select().from(articles).where(eq(articles.status,"published")),db.select().from(calendarItems),db.select().from(publicCorrections)]);}catch{}return <TimelineManager role={role} games={gameRows} events={events} articles={articleRows} calendarItems={calendarRows} corrections={corrections}/>}
