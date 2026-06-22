import { getEmployeePortalAccess } from "@/lib/employee-portal-access";
import { isManagerOrAbove } from "@/lib/operational-access";
import {
  resolveAuthenticatedSession,
  sessionExpiredApiResponse,
  unauthorizedApiResponse,
} from "@/lib/require-authenticated-session";
import { NextResponse } from "next/server";

export async function requireManagerApiActor() {
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

  if (!isManagerOrAbove(access.employee.accessLevel)) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    } as const;
  }

  return { actor: access.employee, session } as const;
}
