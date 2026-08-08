/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  MEDIA: R2Bucket;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

interface ScheduledController { scheduledTime: number; cron: string; }

const DAILY_DESKS = [
  ["signal", "Maya Chen — Signal Desk"],
  ["systems", "Marcus Vale — Systems Desk"],
  ["world_atlas", "Elena Rossi — World Atlas Desk"],
  ["archive", "Theo Grant — Archive Desk"],
] as const;

const iso = () => new Date().toISOString();
const runDate = (time: number) => new Date(time).toISOString().slice(0, 10);

async function guardedDailyEditorialRun(env: Env, scheduledTime: number) {
  const now = iso(); const date = runDate(scheduledTime);
  const policy = await env.DB.prepare("SELECT daily_limit_cents AS dailyCap, per_job_limit_cents AS perJobCap, live_agents_enabled AS liveEnabled, emergency_stop AS emergencyStop FROM budget_policies ORDER BY created_at LIMIT 1").first<{ dailyCap: number; perJobCap: number; liveEnabled: number; emergencyStop: number }>();
  if (policy?.emergencyStop) return;
  const existing = await env.DB.prepare("SELECT id FROM agent_runs WHERE item_id = ?1 LIMIT 1").bind(`daily:${date}:signal`).first<{ id: string }>();
  if (existing) return;
  const blocker = "No validated, approved-source evidence packet is queued for this desk. No model call or draft was created.";
  const dailyCap = Math.min(Math.max(0, policy?.dailyCap ?? 1000), 1000);
  const perSlotCap = Math.min(Math.max(0, policy?.perJobCap ?? 250), 250, Math.floor(dailyCap / DAILY_DESKS.length));
  await env.DB.batch([
    ...DAILY_DESKS.map(([desk, writer]) => env.DB.prepare("INSERT INTO agent_runs (id,agent,status,item_id,planned_cost_cents,actual_cost_cents,output_json,stopped_reason,created_at,updated_at) VALUES (?1,'editor','blocked',?2,0,0,?3,?4,?5,?5)").bind(crypto.randomUUID(), `daily:${date}:${desk}`, JSON.stringify({ writer, desk, date, dailyCapCents: dailyCap, perSlotCapCents: perSlotCap, privateOnly: true, noPublish: true, noModelCall: true }), blocker, now)),
    env.DB.prepare("INSERT INTO audit_events (id,actor_email,action,entity_type,entity_id,details,created_at) VALUES (?1,'system@myrpg.io','daily_editorial_source_gate','daily_editorial_run',?2,?3,?4)").bind(crypto.randomUUID(), date, JSON.stringify({ date, capCents: dailyCap, perSlotCapCents: perSlotCap, slots: 4, noPublish: true, noModelCall: true }), now),
  ]);
}

function withSecurityHeaders(response: Response): Response {
  const secured = new Response(response.body, response);
  secured.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("X-Frame-Options", "DENY");
  secured.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  secured.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  return secured;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const response = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return withSecurityHeaders(response);
    }

    return withSecurityHeaders(await handler.fetch(request, env, ctx));
  },
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(guardedDailyEditorialRun(env, controller.scheduledTime));
  },
};

export default worker;
