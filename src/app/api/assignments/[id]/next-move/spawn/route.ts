import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Assignment } from "@/lib/models/assignment";
import { buildSpawnPayload } from "@/lib/ai/next-move-spawn";
import { getErrorMessage } from "@/lib/ai/error-utils";
import { resolveTeacherRequestContext } from "@/lib/request-context";
import { createLogger, resolveRequestId } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const requestId = resolveRequestId(request);
  const log = createLogger("api/assignments/next-move/spawn", { requestId, assignmentId: id });
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid assignment id" }, { status: 400 });
  }

  try {
    await connectDB();
    const context = await resolveTeacherRequestContext(request);
    if (!context) {
      return Response.json({ error: "Õpetaja autentimine on vajalik." }, { status: 401 });
    }

    const parent = await Assignment.findOne({
      _id: id,
      teacherId: context.teacherId,
      organizationKey: context.organizationKey,
    });
    if (!parent) {
      return Response.json({ error: "Assignment not found" }, { status: 404 });
    }

    if (!parent.nextMove?.nextProblem?.promptEt) {
      return Response.json(
        { error: "Koosta kõigepealt järgmise sammu soovitus." },
        { status: 409 }
      );
    }

    const payload = buildSpawnPayload(parent);
    const created = await Assignment.create(payload);

    return Response.json({ assignmentId: String(created._id) }, { status: 201 });
  } catch (error) {
    const raw = getErrorMessage(error) ?? "";
    log.error("next_move_spawn_failed", { raw }, error);
    const safe = raw
      .replace(/sk-[A-Za-z0-9_-]{10,}/g, "***")
      .replace(/https?:\/\/\S+/g, "***")
      .slice(0, 120);

    return Response.json(
      { error: safe || "Järgmise sammu põhjal ülesande loomine ebaõnnestus." },
      { status: 500 }
    );
  }
}
