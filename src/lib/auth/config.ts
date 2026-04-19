import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { normalizeOrganizationKey } from "@/lib/class-key";
import { connectDB } from "@/lib/mongodb";
import { Invite } from "@/lib/models/invite";
import { Teacher, type ITeacher } from "@/lib/models/teacher";

function normalizeTeacherId(value: string | null | undefined): string {
  const normalized = (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");

  return normalized || "default-teacher";
}

function normalizeEmail(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase();
}

function teacherPayload(teacher: Pick<ITeacher, "teacherId" | "email" | "organizationKey" | "displayName" | "role">) {
  return {
    teacherId: teacher.teacherId,
    email: teacher.email,
    organizationKey: teacher.organizationKey,
    displayName: teacher.displayName,
    role: teacher.role,
  };
}

async function findOrProvisionTeacher(email: string, displayName: string | null | undefined) {
  await connectDB();

  const normalizedEmail = normalizeEmail(email);
  const normalizedDisplayName = (displayName || normalizedEmail).trim() || normalizedEmail;

  const existingTeacher = await Teacher.findOne({ email: normalizedEmail });
  if (existingTeacher) {
    let didChange = false;

    if (!existingTeacher.activatedAt) {
      existingTeacher.activatedAt = new Date();
      didChange = true;
    }

    if (normalizedDisplayName && existingTeacher.displayName !== normalizedDisplayName) {
      existingTeacher.displayName = normalizedDisplayName;
      didChange = true;
    }

    if (didChange) {
      await existingTeacher.save();
    }

    return teacherPayload(existingTeacher);
  }

  const invite = await Invite.findOne({ email: normalizedEmail }).sort({ createdAt: -1 });
  if (!invite) {
    return null;
  }

  const createdTeacher = await Teacher.create({
    teacherId: normalizeTeacherId(normalizedEmail.split("@")[0] || normalizedEmail),
    email: normalizedEmail,
    organizationKey: normalizeOrganizationKey(invite.organizationKey),
    displayName: normalizedDisplayName,
    role: "teacher",
    invitedAt: invite.createdAt,
    activatedAt: new Date(),
  });

  if (!invite.acceptedAt) {
    invite.acceptedAt = new Date();
    await invite.save();
  }

  return teacherPayload(createdTeacher);
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") {
        return false;
      }

      const email = normalizeEmail(user.email);
      if (!email) {
        return false;
      }

      const teacher = await findOrProvisionTeacher(email, user.name);
      if (!teacher) {
        return false;
      }

      user.email = teacher.email;
      user.name = teacher.displayName;
      user.teacherId = teacher.teacherId;
      user.organizationKey = teacher.organizationKey;
      user.role = teacher.role;

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.teacherId = user.teacherId;
        token.organizationKey = user.organizationKey;
        token.role = user.role;
        token.displayName = user.name ?? null;
        token.email = user.email ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        session.user = {
          name: null,
          email: null,
          image: null,
          teacherId: "",
          organizationKey: "",
          role: "teacher",
        };
      }

      session.user.teacherId = typeof token.teacherId === "string" ? token.teacherId : "";
      session.user.organizationKey =
        typeof token.organizationKey === "string" ? token.organizationKey : "";
      session.user.role = token.role === "admin" ? "admin" : "teacher";
      session.user.name =
        typeof token.displayName === "string" && token.displayName.length > 0
          ? token.displayName
          : session.user.name;
      session.user.email =
        typeof token.email === "string" && token.email.length > 0 ? token.email : session.user.email;

      return session;
    },
  },
};

export async function getAuthSession() {
  return getServerSession(authOptions);
}
