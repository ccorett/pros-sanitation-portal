import { buildEmployeeLoginUrl } from "@/lib/portal-auth-redirect";
import { AUTH_COOKIE_PREFIX } from "@/lib/auth-config";
import {
  DEV_APP_ORIGIN,
  isDevCanonicalOrigin,
  isDevEnvironment,
} from "@/lib/app-url";
import {
  isKnownPortalPathname,
  isProtectedPortalPathname,
  PORTAL_ACCESS_DENIED_REDIRECT,
} from "@/lib/portal-route-access";
import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

function isProtectedPath(pathname: string): boolean {
  return isProtectedPortalPathname(pathname);
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
      new URL(buildEmployeeLoginUrl(returnTo), request.nextUrl.origin),
    );
  }

  const pathname = request.nextUrl.pathname;
  if (isProtectedPath(pathname) && !isKnownPortalPathname(pathname)) {
    return NextResponse.redirect(
      new URL(PORTAL_ACCESS_DENIED_REDIRECT, request.nextUrl.origin),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
