import { withAuth } from "next-auth/middleware";
import { NextResponse, type NextRequest } from "next/server";
import {
  classifyRateLimitedPath,
  consumeRateLimit,
  RATE_LIMIT_RULES
} from "@/lib/rate-limit";

export const config = {
  // Intercept teacher/admin surfaces for auth and the most expensive write APIs
  // for rate limiting. Static assets and everything else bypass the proxy.
  matcher: [
    "/teacher/:path*",
    "/admin/:path*",
    "/student/result/:path*",
    "/demo",
    "/api/assignments/seed",
    "/api/assignments/:id/submit",
    "/api/assignments/:id/next-move/:path*",
    "/api/submissions/:id/retry",
    "/api/clusters/:id/remediate",
  ],
};

function clientIpFromRequest(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

function shouldAllowTeacherWithoutAuth(pathname: string) {
  if (process.env.ALLOW_DEMO_AUTH !== "1") {
    return false;
  }

  return pathname.startsWith("/teacher") || pathname.startsWith("/student/result") || pathname === "/demo";
}

function handleRateLimit(request: NextRequest) {
  const route = classifyRateLimitedPath(request.nextUrl.pathname);
  if (!route) return NextResponse.next();

  // Only enforce on mutating verbs — GETs to these endpoints are cheap reads.
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return NextResponse.next();
  }

  const rule = RATE_LIMIT_RULES[route];
  const ip = clientIpFromRequest(request);
  const bucketKey = `${route}:${ip}`;
  const result = consumeRateLimit(bucketKey, rule);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: "Päringuid on liiga palju. Palun proovi natukese aja pärast uuesti.",
        retryAfterSeconds: result.retryAfterSeconds,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(result.retryAfterSeconds),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  return response;
}

export default withAuth(
  function proxy(request) {
    const pathname = request.nextUrl.pathname;
    const token = request.nextauth.token;

    if (pathname.startsWith("/admin")) {
      if (!token) {
        return NextResponse.redirect(new URL("/login", request.url));
      }

      if (token.role !== "admin") {
        return NextResponse.redirect(new URL("/teacher", request.url));
      }
    }

    if (pathname.startsWith("/teacher") && !token && !shouldAllowTeacherWithoutAuth(pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (pathname.startsWith("/student/result") && !token && !shouldAllowTeacherWithoutAuth(pathname)) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (pathname === "/demo" && !token && process.env.ALLOW_DEMO_AUTH !== "1") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return handleRateLimit(request);
  },
  {
    pages: {
      signIn: "/login",
    },
    callbacks: {
      authorized: () => true,
    },
  }
);
