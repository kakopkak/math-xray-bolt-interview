import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { resolveTeacherRequestContext } from "@/lib/request-context";
import { findTeacherSubmissionById } from "@/lib/teacher-scope";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const STREAM_POLL_MS = 700;
const TERMINAL_STATUSES = new Set(["complete", "needs_manual_review", "error"]);

function encodeSseChunk(event: string, payload: unknown) {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return Response.json({ error: "Invalid submission id" }, { status: 400 });
  }

  await connectDB();
  const context = await resolveTeacherRequestContext(request);
  if (!context) {
    return Response.json({ error: "Õpetaja autentimine on vajalik." }, { status: 401 });
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      let isClosed = false;
      let lastPayload = "";

      const closeStream = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (!isClosed) {
          isClosed = true;
          controller.close();
        }
      };

      const poll = async () => {
        try {
          const submission = await findTeacherSubmissionById(
            id,
            context,
            "_id processingStatus processingError extractedSteps analysis analysisMeta intelligence clusterId updatedAt"
          );

          if (!submission) {
            controller.enqueue(encodeSseChunk("error", { error: "Submission not found" }));
            closeStream();
            return;
          }

          const payload = {
            _id: String(submission._id),
            processingStatus: submission.processingStatus,
            processingError: submission.processingError,
            extractedSteps: submission.extractedSteps || [],
            analysis: submission.analysis || null,
            analysisMeta: submission.analysisMeta || null,
            intelligence: submission.intelligence || null,
            clusterId: submission.clusterId || null,
            updatedAt: submission.updatedAt,
          };

          const serialized = JSON.stringify(payload);
          if (serialized !== lastPayload) {
            lastPayload = serialized;
            controller.enqueue(encodeSseChunk("update", payload));
          }

          if (TERMINAL_STATUSES.has(submission.processingStatus)) {
            controller.enqueue(encodeSseChunk("done", { processingStatus: submission.processingStatus }));
            closeStream();
            return;
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error);
          controller.enqueue(encodeSseChunk("error", { error: message }));
          closeStream();
          return;
        }

        timeoutId = setTimeout(() => {
          void poll();
        }, STREAM_POLL_MS);
      };

      void poll();
    },
    cancel() {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
