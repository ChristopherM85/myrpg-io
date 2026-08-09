import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { gameSubmissions, submissionCaptures } from "../../../db/schema";
import SubmissionCaptureManager from "./manager";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function SubmissionCapturePage() {
  let submissions: any[] = []; let captures: any[] = [];
  try { const db = getDb(); [submissions, captures] = await Promise.all([db.select().from(gameSubmissions).orderBy(desc(gameSubmissions.createdAt)).limit(50), db.select().from(submissionCaptures).orderBy(desc(submissionCaptures.createdAt)).limit(80)]); } catch { /* Protected page uses a safe empty state on storage errors. */ }
  return <SubmissionCaptureManager submissions={submissions} captures={captures} />;
}
