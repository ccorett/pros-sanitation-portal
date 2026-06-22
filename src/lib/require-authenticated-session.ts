import { auth } from "@/lib/auth";
import {
  enforceSessionActivity,
  invalidateSessionCookies,
  isBackgroundSessionRequest,
  SESSION_EXPIRED_MESSAGE,
} from "@/lib/session-inactivity";
import { recordSecurityAuditEvent } from "@/lib/security-audit-log";
import { SecurityAuditEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export type AuthenticatedSessionResult =
  | { status: "ok"; session: AuthSession; requestHeaders: Headers }
  | { status: "unauthenticated" }
  | { status: "expired" };

export async function resolveAuthenticatedSession(options?: {
  headers?: Headers;
  touch?: boolean;
}): Promise<AuthenticatedSessionResult> {
  const requestHeaders = options?.headers ?? (await headers());
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session?.session?.id) {
    return { status: "unauthenticated" };
  }

  const shouldTouch =
    options?.touch ?? !isBackgroundSessionRequest(requestHeaders);

  const activity = await enforceSessionActivity({
    sessionId: session.session.id,
    touch: shouldTouch,
  });

  if (activity === "expired" || activity === "missing") {
    if (activity === "expired" && session.user?.email) {
      const employee = await prisma.employee.findUnique({
        where: { userId: session.user.id },
        select: { companyEmail: true, accessLevel: true },
      });

      await recordSecurityAuditEvent({
        eventType: SecurityAuditEventType.SESSION_EXPIRED,
        email: employee?.companyEmail ?? session.user.email,
        accessLevel: employee?.accessLevel ?? null,
        message: SESSION_EXPIRED_MESSAGE,
        result: "expired",
      });
    }

    await invalidateSessionCookies(requestHeaders);
    return { status: "expired" };
  }

  return { status: "ok", session, requestHeaders };
}

export function sessionExpiredApiResponse() {
  return NextResponse.json(
    { error: SESSION_EXPIRED_MESSAGE, code: "SESSION_EXPIRED" },
    { status: 401 },
  );
}

export function unauthorizedApiResponse() {
  return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
}
