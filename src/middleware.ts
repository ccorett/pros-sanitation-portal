import { AUTH_COOKIE_PREFIX } from "@/lib/auth-config";
import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request, {
    cookiePrefix: AUTH_COOKIE_PREFIX,
  });

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/employee-login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/staff-dashboard",
    "/staff-dashboard/(.*)",
    "/staff/(.*)",
    "/jobs",
    "/jobs/(.*)",
    "/hr",
    "/hr/(.*)",
    "/equipment-supplies",
    "/equipment-supplies/(.*)",
    "/settings",
    "/settings/(.*)",
    "/admin",
    "/admin/(.*)",
    "/policies/(.*)",
    "/notices/(.*)",
  ],
};
