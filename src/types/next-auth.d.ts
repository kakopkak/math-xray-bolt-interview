import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      teacherId: string;
      organizationKey: string;
      role: "teacher" | "admin";
    };
  }

  interface User {
    teacherId: string;
    organizationKey: string;
    role: "teacher" | "admin";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    teacherId?: string;
    organizationKey?: string;
    role?: "teacher" | "admin";
    displayName?: string | null;
    email?: string | null;
  }
}
