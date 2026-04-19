import { runAdminSweep } from "@/lib/admin-sweep";
import { createLogger, resolveRequestId } from "@/lib/logger";

/**
 * Operational sweeper: reconciles stuck submissions and stale assignment locks
 * left behind by serverless wallclock kills. Token-gated.
 *
 * Wire to a cron (Vercel Cron / external) hitting POST every minute.
 */
function isAuthorized(request: Request): boolean {
  const expected = process.env.ADMIN_SWEEP_TOKEN;
  if (!expected) {
    // No token configured → endpoint is disabled in this environment.
    return false;
  }
  const provided = request.headers.get("x-admin-token");
  return Boolean(provided && provided === expected);
}

export async function POST(request: Request) {
  const requestId = resolveRequestId(request);
  const log = createLogger("api/admin/sweep", { requestId });
  if (!isAuthorized(request)) {
    return Response.json(
      { error: "Admin sweep is disabled or token is missing/incorrect." },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "1";

  try {
    const report = await runAdminSweep({ dryRun });
    log.info("sweep_done", { ...report });
    return Response.json(report, { status: 200, headers: { "X-Request-Id": requestId } });
  } catch (error: unknown) {
    log.error("sweep_failed", { dryRun }, error);
    return Response.json({ error: "Admin sweep failed." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const log = createLogger("api/admin/sweep", { requestId });
  // GET = dry-run for monitoring without side effects.
  if (!isAuthorized(request)) {
    return Response.json(
      { error: "Admin sweep is disabled or token is missing/incorrect." },
      { status: 401 }
    );
  }

  try {
    const report = await runAdminSweep({ dryRun: true });
    return Response.json(report, { status: 200, headers: { "X-Request-Id": requestId } });
  } catch (error: unknown) {
    log.error("sweep_dryrun_failed", undefined, error);
    return Response.json({ error: "Admin sweep dry-run failed." }, { status: 500 });
  }
}
