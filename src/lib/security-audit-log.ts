import { AccessLevel, SecurityAuditEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function recordSecurityAuditEvent(input: {
  eventType: SecurityAuditEventType;
  email?: string | null;
  accessLevel?: AccessLevel | null;
  ipAddress?: string | null;
  message?: string | null;
  result?: string | null;
}): Promise<void> {
  await prisma.securityAuditLog.create({
    data: {
      eventType: input.eventType,
      email: input.email?.trim().toLowerCase() || null,
      accessLevel: input.accessLevel ?? null,
      ipAddress: input.ipAddress?.trim() || null,
      message: input.message ?? null,
      result: input.result ?? null,
    },
  });
}

export async function recordUnauthorizedApiAccess(input: {
  email: string;
  accessLevel: AccessLevel;
  resource: string;
  ipAddress?: string | null;
  message?: string | null;
}) {
  await recordSecurityAuditEvent({
    eventType: SecurityAuditEventType.UNAUTHORIZED_API_ACCESS,
    email: input.email,
    accessLevel: input.accessLevel,
    ipAddress: input.ipAddress,
    message: input.message ?? `Unauthorized API access: ${input.resource}`,
    result: "denied",
  });
}

export async function recordUnauthorizedRouteAccess(input: {
  email: string;
  accessLevel: AccessLevel;
  pathname: string;
  ipAddress?: string | null;
}) {
  await recordSecurityAuditEvent({
    eventType: SecurityAuditEventType.UNAUTHORIZED_ROUTE_ACCESS,
    email: input.email,
    accessLevel: input.accessLevel,
    ipAddress: input.ipAddress,
    message: `Unauthorized route access: ${input.pathname}`,
    result: "denied",
  });
}
