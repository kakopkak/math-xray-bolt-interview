import { NextRequest } from "next/server";
import { z } from "zod";
import { getAuthSession } from "@/lib/auth/config";
import { normalizeOrganizationKey } from "@/lib/class-key";
import { createLogger, resolveRequestId } from "@/lib/logger";
import { connectDB } from "@/lib/mongodb";
import { Invite } from "@/lib/models/invite";
import { Teacher } from "@/lib/models/teacher";

const InviteBodySchema = z.object({
  email: z.string().trim().email(),
});

function toInvitePayload(invite: {
  _id: { toString(): string };
  email: string;
  organizationKey: string;
  invitedBy: string;
  createdAt: Date | string;
  acceptedAt?: Date | string | null;
}) {
  return {
    _id: invite._id.toString(),
    email: invite.email,
    organizationKey: invite.organizationKey,
    invitedBy: invite.invitedBy,
    createdAt: new Date(invite.createdAt).toISOString(),
    acceptedAt: invite.acceptedAt ? new Date(invite.acceptedAt).toISOString() : null,
  };
}

async function requireAdminSession() {
  const session = await getAuthSession();

  if (!session?.user?.teacherId || session.user.role !== "admin") {
    return null;
  }

  return session;
}

export async function GET(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const log = createLogger("api/admin/invites", { requestId });
  const session = await requireAdminSession();
  if (!session?.user?.organizationKey) {
    return Response.json({ error: "Admini autentimine on vajalik." }, { status: 403 });
  }

  try {
    await connectDB();
    const invites = await Invite.find({
      organizationKey: session.user.organizationKey,
    })
      .sort({ createdAt: -1 })
      .lean();

    return Response.json(invites.map(toInvitePayload), {
      headers: { "X-Request-Id": requestId },
    });
  } catch (error) {
    log.error("invites_load_failed", undefined, error);
    return Response.json({ error: "Kutsete laadimine ebaõnnestus." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request);
  const log = createLogger("api/admin/invites", { requestId });
  const session = await requireAdminSession();
  if (!session?.user?.organizationKey || !session.user.teacherId) {
    return Response.json({ error: "Admini autentimine on vajalik." }, { status: 403 });
  }

  try {
    const body = InviteBodySchema.safeParse(await request.json());
    if (!body.success) {
      return Response.json({ error: "Kutse andmed on vigased." }, { status: 400 });
    }

    await connectDB();

    const email = body.data.email.trim().toLowerCase();
    const organizationKey = normalizeOrganizationKey(session.user.organizationKey);
    const existingTeacher = await Teacher.findOne({ email }).lean();
    if (existingTeacher) {
      if (existingTeacher.organizationKey !== organizationKey) {
        return Response.json({ error: "See e-post on juba seotud teise kooliga." }, { status: 409 });
      }

      return Response.json({ error: "Õpetaja on juba aktiveeritud." }, { status: 409 });
    }

    const existingInvite = await Invite.findOne({
      email,
      organizationKey,
      acceptedAt: null,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (existingInvite) {
      return Response.json(toInvitePayload(existingInvite), {
        status: 200,
        headers: { "X-Request-Id": requestId },
      });
    }

    const invite = await Invite.create({
      email,
      organizationKey,
      invitedBy: session.user.teacherId,
      acceptedAt: null,
    });

    return Response.json(toInvitePayload(invite), {
      status: 201,
      headers: { "X-Request-Id": requestId },
    });
  } catch (error) {
    log.error("invite_create_failed", undefined, error);
    return Response.json({ error: "Kutse loomine ebaõnnestus." }, { status: 500 });
  }
}
