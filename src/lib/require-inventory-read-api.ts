import { canAccessAdminModule } from "@/lib/access-levels";
import { getEmployeePortalAccess } from "@/lib/employee-portal-access";
import { canAccessEquipmentSupplies } from "@/lib/operational-access";
import { toEmployeeAccessContext } from "@/lib/portal-route-access";
import {
  resolveAuthenticatedSession,
  sessionExpiredApiResponse,
  unauthorizedApiResponse,
} from "@/lib/require-authenticated-session";
import { NextResponse } from "next/server";

/** Staff supervisors+ and admins may read active inventory (GET /api/inventory). */
export async function requireInventoryReadActor() {
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

  const accessContext = await toEmployeeAccessContext(access.employee);
  const canRead =
    canAccessAdminModule(access.employee.accessLevel) ||
    canAccessEquipmentSupplies(accessContext);

  if (!canRead) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    } as const;
  }

  return { actor: access.employee, session } as const;
}
