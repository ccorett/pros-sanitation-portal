import { canAccessAdminModule } from "@/lib/access-levels";
import { getEmployeePortalAccess } from "@/lib/employee-portal-access";
import {
  buildInvoiceAccessContext,
  hasAdminAssistantResponsibility,
  resolveEmployeeResponsibilitiesForActor,
} from "@/lib/invoice-access";
import {
  resolveAuthenticatedSession,
  sessionExpiredApiResponse,
  unauthorizedApiResponse,
} from "@/lib/require-authenticated-session";
import { NextResponse } from "next/server";

export async function requireAdminApiActor() {
  const authResult = await resolveAuthenticatedSession();

  if (authResult.status === "unauthenticated") {
    return { error: unauthorizedApiResponse() } as const;
  }

  if (authResult.status === "expired") {
    return { error: sessionExpiredApiResponse() } as const;
  }

  const { session } = authResult;
  const access = await getEmployeePortalAccess(session.user.id);

  if (!access.allowed || access.pendingVerification) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    } as const;
  }

  if (!canAccessAdminModule(access.employee.accessLevel)) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    } as const;
  }

  return { actor: access.employee, session } as const;
}

export async function requireAdminHubApiActor() {
  const authResult = await resolveAuthenticatedSession();

  if (authResult.status === "unauthenticated") {
    return { error: unauthorizedApiResponse() } as const;
  }

  if (authResult.status === "expired") {
    return { error: sessionExpiredApiResponse() } as const;
  }

  const { session } = authResult;
  const access = await getEmployeePortalAccess(session.user.id);

  if (!access.allowed || access.pendingVerification) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    } as const;
  }

  const responsibilities = await resolveEmployeeResponsibilitiesForActor(
    access.employee,
  );
  const accessContext = buildInvoiceAccessContext(access.employee, responsibilities);
  const canAccessHub =
    canAccessAdminModule(access.employee.accessLevel) ||
    hasAdminAssistantResponsibility(accessContext);

  if (!canAccessHub) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    } as const;
  }

  return { actor: access.employee, session } as const;
}
