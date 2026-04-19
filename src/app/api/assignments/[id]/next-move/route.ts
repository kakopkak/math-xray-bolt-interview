import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { suggestNextMove, computeDistributionHash, type ClusterDistributionEntry } from "@/lib/ai/next-move";
import { getErrorMessage } from "@/lib/ai/error-utils";
import { Assignment } from "@/lib/models/assignment";
import { Cluster } from "@/lib/models/cluster";
import {
  NextMoveRequestSchema,
  formatSchemaFieldErrors,
  isInvalidJsonBodyError,
  readOptionalJsonBody,
} from "@/lib/schemas";
import { getMisconceptionByCode } from "@/lib/taxonomy";
import { resolveTeacherRequestContext } from "@/lib/request-context";
import { createLogger, resolveRequestId } from "@/lib/logger";
import { teacherTenantFilter } from "@/lib/teacher-scope";

const CACHE_TTL_MS = 60 * 60 * 1000;
const LOCK_FRESH_MS = 30_000;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isFreshCache(
  cached: { distributionHash?: string; generatedAt?: Date | string | null } | null | undefined,
  distributionHash: string,
  forceRefresh?: boolean
) {
  const generatedAtEpoch = cached?.generatedAt ? new Date(cached.generatedAt).getTime() : NaN;
  return (
    !forceRefresh &&
    cached?.distributionHash === distributionHash &&
    Number.isFinite(generatedAtEpoch) &&
    Date.now() - generatedAtEpoch < CACHE_TTL_MS
  );
}

async function acquireGenerationLock(
  assignmentId: string,
  context: { teacherId: string; organizationKey: string }
) {
  const lockAt = new Date();
  return Assignment.findOneAndUpdate(
    {
      _id: assignmentId,
      ...teacherTenantFilter(context),
      $or: [
        { nextMove: null },
        { nextMove: { $exists: false } },
        { "nextMove.generationLockAt": { $exists: false } },
        { "nextMove.generationLockAt": null },
        { "nextMove.generationLockAt": { $lt: new Date(Date.now() - LOCK_FRESH_MS) } },
      ],
    },
    [
      {
        $set: {
          nextMove: {
            $mergeObjects: [{ $ifNull: ["$nextMove", {}] }, { generationLockAt: lockAt }],
          },
        },
      },
    ],
    { new: false, updatePipeline: true }
  );
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const requestId = resolveRequestId(request);
  const log = createLogger("api/assignments/next-move", { requestId, assignmentId: id });
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid assignment id" }, { status: 400 });
  }

  try {
    const body = await readOptionalJsonBody(request);
    const parsed = NextMoveRequestSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        {
          error: "Järgmise sammu päring on vigane.",
          fieldErrors: formatSchemaFieldErrors(parsed.error),
        },
        { status: 400 }
      );
    }
    const requestBody = parsed.data;

    await connectDB();
    const context = await resolveTeacherRequestContext(request);
    if (!context) {
      return Response.json({ error: "Õpetaja autentimine on vajalik." }, { status: 401 });
    }

    const assignment = await Assignment.findOne({
      _id: id,
      teacherId: context.teacherId,
      organizationKey: context.organizationKey,
    });
    if (!assignment) {
      return Response.json({ error: "Assignment not found" }, { status: 404 });
    }

    const clusters = await Cluster.find({ assignmentId: id }).lean();
    const distribution: ClusterDistributionEntry[] = clusters.map((cluster) => {
      const taxonomy = getMisconceptionByCode(cluster.misconceptionCode);
      return {
        misconceptionCode: cluster.misconceptionCode,
        label: taxonomy?.label || cluster.label || cluster.misconceptionCode,
        labelEt: taxonomy?.labelEt || cluster.labelEt || cluster.misconceptionCode,
        count: cluster.clusterSize || 0,
        severity: cluster.severity || "none",
      };
    });

    const distributionHash = computeDistributionHash(distribution);
    const cached = assignment.nextMove ?? null;
    const hasFreshCache = isFreshCache(cached, distributionHash, requestBody.forceRefresh);

    if (hasFreshCache) {
      return Response.json(cached);
    }

    let ownsLock = false;
    try {
      let lockAcquired = await acquireGenerationLock(id, context);

      if (!lockAcquired) {
        await new Promise((r) => setTimeout(r, 1500));
        const fresh = await Assignment.findOne({
          _id: id,
          ...teacherTenantFilter(context),
        }).lean();
        if (isFreshCache(fresh?.nextMove, distributionHash, false)) {
          return Response.json(fresh?.nextMove);
        }

        lockAcquired = await acquireGenerationLock(id, context);
      }

      if (!lockAcquired) {
        return Response.json(
          { error: "Järgmise sammu soovitust juba koostatakse. Proovi hetke pärast uuesti." },
          { status: 409 }
        );
      }
      ownsLock = true;

      const suggestion = await suggestNextMove({
        gradeLevel: assignment.gradeLevel,
        topic: assignment.topic,
        totalStudents:
          assignment.submissionCount || distribution.reduce((sum, cluster) => sum + cluster.count, 0),
        clusters: distribution,
      });

      assignment.nextMove = {
        ...suggestion,
        generationLockAt: null,
      };
      await assignment.save();
      return Response.json(suggestion);
    } catch (error) {
      const raw = getErrorMessage(error) ?? "";
      log.error("next_move_generation_failed", { raw }, error);
      const safe = raw
        .replace(/sk-[A-Za-z0-9_-]{10,}/g, "***")
        .replace(/https?:\/\/\S+/g, "***")
        .slice(0, 120);

      return Response.json(
        { error: safe || "Järgmise sammu soovitust ei õnnestunud luua." },
        { status: 500 }
      );
    } finally {
      if (ownsLock) {
        await Assignment.updateOne(
          { _id: id, ...teacherTenantFilter(context) },
          [
            {
              $set: {
                nextMove: {
                  $mergeObjects: [{ $ifNull: ["$nextMove", {}] }, { generationLockAt: null }],
                },
              },
            },
          ],
          { updatePipeline: true }
        );
      }
    }
  } catch (error) {
    if (isInvalidJsonBodyError(error)) {
      return Response.json({ error: "Vigane JSON-keha." }, { status: 400 });
    }

    log.error("next_move_request_failed", undefined, error);
    return Response.json({ error: "Järgmise sammu päringut ei õnnestunud töödelda." }, { status: 500 });
  }
}
