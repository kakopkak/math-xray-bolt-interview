import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { createLogger, resolveRequestId } from "@/lib/logger";

type ProbeResult = {
  status: "ok" | "degraded" | "down";
  latencyMs: number;
  detail?: string;
};

async function probeDatabase(): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const conn = await connectDB();
    const ping = await conn.connection.db?.admin().ping();
    if (!ping || ping.ok !== 1) {
      return {
        status: "degraded",
        latencyMs: Date.now() - start,
        detail: "ping returned non-ok",
      };
    }
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (error: unknown) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function probeOpenAi(): ProbeResult {
  // We don't fire a network call to avoid spending tokens on health checks.
  // Instead we verify the credential is present and well-formed.
  const start = Date.now();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      detail: "OPENAI_API_KEY not set",
    };
  }
  if (apiKey.length < 20) {
    return {
      status: "degraded",
      latencyMs: Date.now() - start,
      detail: "OPENAI_API_KEY looks truncated",
    };
  }
  return { status: "ok", latencyMs: Date.now() - start };
}

function aggregateStatus(...probes: ProbeResult[]): "healthy" | "degraded" | "down" {
  if (probes.some((p) => p.status === "down")) return "down";
  if (probes.some((p) => p.status === "degraded")) return "degraded";
  return "healthy";
}

export async function GET(request: Request) {
  const requestId = resolveRequestId(request);
  const log = createLogger("api/health", { requestId });
  const start = Date.now();

  const [database, openai] = await Promise.all([
    probeDatabase(),
    Promise.resolve(probeOpenAi()),
  ]);

  const overall = aggregateStatus(database, openai);
  const totalLatencyMs = Date.now() - start;

  const body = {
    status: overall,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    pipelineVersion: "2026-04-trust-v3",
    checks: {
      database,
      openai,
      mongooseReadyState: mongoose.connection.readyState,
    },
    totalLatencyMs,
    requestId,
  };

  log.info("health_probe", { status: overall, totalLatencyMs });

  const httpStatus = overall === "down" ? 503 : 200;
  return Response.json(body, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-store",
      "X-Request-Id": requestId,
    },
  });
}
