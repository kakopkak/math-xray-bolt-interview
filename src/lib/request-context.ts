import { getAuthSession } from "@/lib/auth/config";
import { normalizeOrganizationKey } from '@/lib/class-key';

export type TeacherRequestContext = {
  teacherId: string;
  organizationKey: string;
};

type ResolveTeacherRequestContextOptions = {
  allowFallback?: boolean;
};

function normalizeTeacherId(value: string | null | undefined): string {
  const normalized = (value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  return normalized || 'default-teacher';
}

export function resolveTeacherRequestContext(
  request:
    | {
        headers: Headers;
      }
    | null
    | undefined,
  fallback?: {
    teacherId?: string;
    organizationKey?: string;
  },
  options?: ResolveTeacherRequestContextOptions
): Promise<TeacherRequestContext | null> {
  return resolveTeacherRequestContextInternal(request, fallback, options);
}

async function resolveTeacherRequestContextInternal(
  request:
    | {
        headers: Headers;
      }
    | null
    | undefined,
  fallback?: {
    teacherId?: string;
    organizationKey?: string;
  },
  options?: ResolveTeacherRequestContextOptions
) {
  if (!request && fallback) {
    return {
      teacherId: normalizeTeacherId(fallback.teacherId || process.env.DEFAULT_TEACHER_ID),
      organizationKey: normalizeOrganizationKey(
        fallback.organizationKey || process.env.DEFAULT_ORGANIZATION_KEY
      ),
    };
  }

  const session = await getAuthSession();
  if (session?.user?.teacherId && session.user.organizationKey) {
    return {
      teacherId: normalizeTeacherId(session.user.teacherId),
      organizationKey: normalizeOrganizationKey(session.user.organizationKey),
    };
  }

  if (options?.allowFallback && fallback?.teacherId && fallback.organizationKey) {
    return {
      teacherId: normalizeTeacherId(fallback.teacherId),
      organizationKey: normalizeOrganizationKey(fallback.organizationKey),
    };
  }

  if (process.env.ALLOW_DEMO_AUTH === '1') {
    const teacherHeader = request?.headers?.get('x-teacher-id');
    const organizationHeader = request?.headers?.get('x-organization-key');

    return {
      teacherId: normalizeTeacherId(teacherHeader || fallback?.teacherId || process.env.DEFAULT_TEACHER_ID),
      organizationKey: normalizeOrganizationKey(
        organizationHeader || fallback?.organizationKey || process.env.DEFAULT_ORGANIZATION_KEY
      ),
    };
  }

  return null;
}

export async function requireTeacherRequestContext(
  request:
    | {
        headers: Headers;
      }
    | null
    | undefined,
  fallback?: {
    teacherId?: string;
    organizationKey?: string;
  },
  options?: ResolveTeacherRequestContextOptions
): Promise<TeacherRequestContext> {
  const context = await resolveTeacherRequestContext(request, fallback, options);
  if (!context) {
    throw new Error('Teacher session missing');
  }

  return context;
}
