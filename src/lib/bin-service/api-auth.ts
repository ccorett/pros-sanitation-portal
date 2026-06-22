import { getEmployeePortalAccess } from "@/lib/employee-portal-access";
import {
  canAccessBinManagement,
  canManageBinLocationSetup,
  canPerformBinFieldUpdates,
  type EmployeeAccessContext,
} from "@/lib/operational-access";
import { toEmployeeAccessContext } from "@/lib/portal-route-access";
import {
  resolveAuthenticatedSession,
  sessionExpiredApiResponse,
  unauthorizedApiResponse,
  type AuthenticatedSessionResult,
} from "@/lib/require-authenticated-session";
import { recordUnauthorizedApiAccess } from "@/lib/security-audit-log";
import { getRequestIp } from "@/lib/request-ip";
import type { Employee } from "@prisma/client";
import { NextResponse } from "next/server";

type BinApiAccessSuccess = {
  session: Extract<AuthenticatedSessionResult, { status: "ok" }>["session"];
  employee: Employee;
  accessContext: EmployeeAccessContext;
};

async function resolveBinApiAccess(): Promise<
  BinApiAccessSuccess | { error: NextResponse }
> {
  const authResult = await resolveAuthenticatedSession();

  if (authResult.status === "unauthenticated") {
    return { error: unauthorizedApiResponse() };
  }

  if (authResult.status === "expired") {
    return { error: sessionExpiredApiResponse() };
  }

  const { session } = authResult;
  const access = await getEmployeePortalAccess(session.user.id);

  if (!access.allowed || access.pendingVerification) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    };
  }

  const accessContext = await toEmployeeAccessContext(access.employee);

  return {
    session,
    employee: access.employee,
    accessContext,
  };
}

async function denyBinApiAccess(input: {
  request?: Request;
  employee: Employee;
  resource: string;
  reason: string;
}) {
  await recordUnauthorizedApiAccess({
    email: input.employee.companyEmail,
    accessLevel: input.employee.accessLevel,
    resource: input.resource,
    ipAddress: input.request ? getRequestIp(input.request) : null,
    message: input.reason,
  });

  return NextResponse.json({ error: "Forbidden." }, { status: 403 });
}

export async function requireBinApiAccess(_request?: Request) {
  return resolveBinApiAccess();
}

export async function requireBinOperationalApiAccess(
  request?: Request,
  resource = "bin-service",
) {
  const access = await resolveBinApiAccess();
  if ("error" in access) {
    return access;
  }

  if (!canAccessBinManagement(access.accessContext)) {
    return {
      error: await denyBinApiAccess({
        request,
        employee: access.employee,
        resource,
        reason: "Bin operational access required.",
      }),
    };
  }

  return access;
}

export async function requireBinSetupApiAccess(
  request?: Request,
  resource = "bin-service/setup",
) {
  const access = await resolveBinApiAccess();
  if ("error" in access) {
    return access;
  }

  if (!canManageBinLocationSetup(access.employee.accessLevel)) {
    return {
      error: await denyBinApiAccess({
        request,
        employee: access.employee,
        resource,
        reason: "Bin setup access required.",
      }),
    };
  }

  return access;
}

export async function requireBinFieldApiAccess(
  request?: Request,
  resource = "bin-service/field",
) {
  const access = await requireBinOperationalApiAccess(request, resource);
  if ("error" in access) {
    return access;
  }

  if (!canPerformBinFieldUpdates(access.accessContext)) {
    return {
      error: await denyBinApiAccess({
        request,
        employee: access.employee,
        resource,
        reason: "Bin field update access required.",
      }),
    };
  }

  return access;
}
