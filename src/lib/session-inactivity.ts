import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const SESSION_INACTIVITY_MS = 30 * 60 * 1000;
export const SESSION_EXPIRED_REASON = "session-expired";
export const SESSION_EXPIRED_MESSAGE =
  "Your session has expired due to inactivity. Please sign in again.";
export const SESSION_BACKGROUND_HEADER = "x-session-background";

export function buildSessionExpiredLoginUrl(): string {
  return `/employee-login?reason=${SESSION_EXPIRED_REASON}`;
}

export function isBackgroundSessionRequest(requestHeaders: Headers): boolean {
  return requestHeaders.get(SESSION_BACKGROUND_HEADER) === "1";
}

export async function enforceSessionActivity(input: {
  sessionId: string;
  touch: boolean;
}): Promise<"active" | "expired" | "missing"> {
  const record = await prisma.session.findUnique({
    where: { id: input.sessionId },
    select: { id: true, createdAt: true, lastActivityAt: true },
  });

  if (!record) {
    return "missing";
  }

  const lastActivity = record.lastActivityAt ?? record.createdAt;
  if (Date.now() - lastActivity.getTime() > SESSION_INACTIVITY_MS) {
    await prisma.session.delete({ where: { id: input.sessionId } }).catch(() => undefined);
    return "expired";
  }

  if (input.touch) {
    await prisma.session.update({
      where: { id: input.sessionId },
      data: { lastActivityAt: new Date() },
    });
  }

  return "active";
}

export async function touchSessionActivity(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { lastActivityAt: new Date() },
  });
}

export async function invalidateSessionCookies(requestHeaders: Headers): Promise<void> {
  try {
    await auth.api.signOut({ headers: requestHeaders });
  } catch {
    // Best-effort cookie cleanup when a session expires.
  }
}

export async function initializeSessionActivity(sessionId: string): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { lastActivityAt: new Date() },
  }).catch(() => undefined);
}
