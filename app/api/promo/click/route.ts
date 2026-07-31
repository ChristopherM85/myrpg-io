import { getDb } from "../../../../db";
import { promotionClicks } from "../../../../db/schema";
export const dynamic="force-dynamic";
const destination="https://mymafia.io?utm_source=myrpg.io&utm_medium=network_promo&utm_campaign=mymafia_beta";
export async function GET(request:Request){const placement=new URL(request.url).searchParams.get("placement")||"network";try{await getDb().insert(promotionClicks).values({id:crypto.randomUUID(),placement:placement.slice(0,64),createdAt:new Date().toISOString()});}catch{}return Response.redirect(destination,302);}
