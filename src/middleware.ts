import { buildEmployeeLoginUrl } from "@/lib/portal-auth-redirect";
import { AUTH_COOKIE_PREFIX } from "@/lib/auth-config";
import {
  DEV_APP_ORIGIN,
  isDevCanonicalOrigin,
  isDevEnvironment,
} from "@/lib/app-url";
import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PATH_MATCHERS = [
  "/pending-verification",
  "/staff-dashboard",
  "/staff/",
  "/jobs",
  "/hr",
  "/human-resources",
  "/equipment-supplies",
  "/my-profile",
  "/admin",
  "/manager",
  "/policies/",
  "/notices/",
] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_MATCHERS.some((prefix) => {
    if (prefix.endsWith("/")) {
      return pathname.startsWith(prefix);
    }
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  });
}

function redirectToDevCanonical(request: NextRequest): NextResponse | null {
  if (!isDevEnvironment()) {
    return null;
  }

  const { hostname, port, pathname, search } = request.nextUrl;

  if (isDevCanonicalOrigin(hostname, port)) {
    return null;
  }

  const target = new URL(`${pathname}${search}`, DEV_APP_ORIGIN);
  return NextResponse.redirect(target);
}

export function middleware(request: NextRequest) {
  const devRedirect = redirectToDevCanonical(request);
  if (devRedirect) {
    return devRedirect;
  }

  if (!isProtectedPath(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request, {
    cookiePrefix: AUTH_COOKIE_PREFIX,
  });

  if (!sessionCookie) {
    const returnTo = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    return NextResponse.redirect(
      new URL(buildEmployeeLoginUrl(returnTo), DEV_APP_ORIGIN),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
