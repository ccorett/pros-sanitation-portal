import { SecurityAuditEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { recordSecurityAuditEvent } from "@/lib/security-audit-log";

export const INVALID_CREDENTIALS_MESSAGE = "Invalid credentials.";
export const IP_RATE_LIMIT_MESSAGE =
  "Too many login attempts. Please try again later.";

export const MAX_IP_ATTEMPTS = 10;
export const IP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export const PROGRESSIVE_DELAY_ATTEMPT_6_MS = 30 * 1000;
export const PROGRESSIVE_DELAY_ATTEMPT_7_MS = 60 * 1000;
export const PROGRESSIVE_DELAY_ATTEMPT_8_PLUS_MS = 5 * 60 * 1000;

export function normalizeLoginEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getProgressiveDelayMs(attemptCount: number): number {
  if (attemptCount <= 5) {
    return 0;
  }

  if (attemptCount === 6) {
    return PROGRESSIVE_DELAY_ATTEMPT_6_MS;
  }

  if (attemptCount === 7) {
    return PROGRESSIVE_DELAY_ATTEMPT_7_MS;
  }

  return PROGRESSIVE_DELAY_ATTEMPT_8_PLUS_MS;
}

export async function applyProgressiveDelay(attemptCount: number): Promise<number> {
  const delayMs = getProgressiveDelayMs(attemptCount);

  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return delayMs;
}

export async function isIpRateLimited(ipAddress: string): Promise<boolean> {
  const ip = ipAddress.trim() || "unknown";
  const record = await prisma.loginIpRateLimit.findUnique({
    where: { ipAddress: ip },
  });

  if (!record) {
    return false;
  }

  const windowExpired =
    Date.now() - record.windowStart.getTime() > IP_RATE_LIMIT_WINDOW_MS;

  if (windowExpired) {
    await prisma.loginIpRateLimit.delete({ where: { ipAddress: ip } }).catch(() => undefined);
    return false;
  }

  return record.attempts >= MAX_IP_ATTEMPTS;
}

export async function recordIpLoginAttempt(ipAddress: string): Promise<boolean> {
  const ip = ipAddress.trim() || "unknown";
  const now = new Date();
  const record = await prisma.loginIpRateLimit.upsert({
    where: { ipAddress: ip },
    create: {
      ipAddress: ip,
      attempts: 1,
      windowStart: now,
    },
    update: {
      attempts: { increment: 1 },
    },
  });

  const windowExpired =
    Date.now() - record.windowStart.getTime() > IP_RATE_LIMIT_WINDOW_MS;

  if (windowExpired) {
    await prisma.loginIpRateLimit.update({
      where: { ipAddress: ip },
      data: {
        attempts: 1,
        windowStart: now,
      },
    });
    return false;
  }

  const limited = record.attempts >= MAX_IP_ATTEMPTS;
  if (limited) {
    await recordSecurityAuditEvent({
      eventType: SecurityAuditEventType.IP_RATE_LIMITED,
      ipAddress: ip,
      message: "IP login rate limit exceeded.",
      result: "rate_limited",
    });
  }

  return limited;
}

export type LoginFailureResult = {
  message: string;
  rateLimited: boolean;
  delayMs: number;
  attemptCount: number;
};

export async function recordLoginFailure(input: {
  email: string;
  ipAddress: string;
}): Promise<LoginFailureResult> {
  const normalized = normalizeLoginEmail(input.email);
  const ip = input.ipAddress.trim() || "unknown";

  const recentFailure = await prisma.securityAuditLog.findFirst({
    where: {
      eventType: SecurityAuditEventType.LOGIN_FAILURE,
      email: normalized,
      ipAddress: ip,
      createdAt: { gte: new Date(Date.now() - 300) },
    },
    select: { id: true },
  });

  if (recentFailure) {
    const existing = await prisma.loginAttempt.findUnique({
      where: { email_ipAddress: { email: normalized, ipAddress: ip } },
      select: { attempts: true },
    });

    return {
      message: INVALID_CREDENTIALS_MESSAGE,
      rateLimited: false,
      delayMs: 0,
      attemptCount: existing?.attempts ?? 0,
    };
  }

  const ipLimited = await recordIpLoginAttempt(ip);
  if (ipLimited) {
    return {
      message: IP_RATE_LIMIT_MESSAGE,
      rateLimited: true,
      delayMs: 0,
      attemptCount: 0,
    };
  }

  const now = new Date();
  const record = await prisma.loginAttempt.upsert({
    where: { email_ipAddress: { email: normalized, ipAddress: ip } },
    create: {
      email: normalized,
      ipAddress: ip,
      attempts: 1,
      lastFailedAt: now,
    },
    update: {
      attempts: { increment: 1 },
      lastFailedAt: now,
    },
  });

  await recordSecurityAuditEvent({
    eventType: SecurityAuditEventType.LOGIN_FAILURE,
    email: normalized,
    ipAddress: ip,
    message: "Failed login attempt.",
    result: "failure",
  });

  const delayMs = getProgressiveDelayMs(record.attempts);

  if (delayMs > 0) {
    await recordSecurityAuditEvent({
      eventType: SecurityAuditEventType.LOGIN_DELAY_APPLIED,
      email: normalized,
      ipAddress: ip,
      message: `Progressive login delay applied: ${delayMs}ms after ${record.attempts} failed attempts.`,
      result: `${delayMs}`,
    });

    await applyProgressiveDelay(record.attempts);
  }

  return {
    message: INVALID_CREDENTIALS_MESSAGE,
    rateLimited: false,
    delayMs,
    attemptCount: record.attempts,
  };
}

export async function resetLoginAttempts(input: {
  email: string;
  ipAddress?: string | null;
}): Promise<void> {
  const normalized = normalizeLoginEmail(input.email);

  if (input.ipAddress) {
    const ip = input.ipAddress.trim() || "unknown";
    await prisma.loginAttempt
      .delete({
        where: { email_ipAddress: { email: normalized, ipAddress: ip } },
      })
      .catch(() => undefined);
  } else {
    await prisma.loginAttempt.deleteMany({
      where: { email: normalized },
    });
  }

  await recordSecurityAuditEvent({
    eventType: SecurityAuditEventType.LOGIN_SUCCESS,
    email: normalized,
    ipAddress: input.ipAddress ?? null,
    message: "Successful login.",
    result: "success",
  });
}

export async function assertLoginAllowed(input: {
  email: string;
  ipAddress: string;
}): Promise<void> {
  if (await isIpRateLimited(input.ipAddress)) {
    await recordSecurityAuditEvent({
      eventType: SecurityAuditEventType.IP_RATE_LIMITED,
      email: normalizeLoginEmail(input.email),
      ipAddress: input.ipAddress,
      message: "Sign-in blocked by IP rate limit.",
      result: "rate_limited",
    });
    throw new LoginSecurityError(IP_RATE_LIMIT_MESSAGE);
  }
}

export class LoginSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LoginSecurityError";
  }
}
