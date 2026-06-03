import { canAccessAdminModule } from "@/lib/access-levels";
import { auth } from "@/lib/auth";
import { getEmployeePortalAccess } from "@/lib/employee-portal-access";
import { canAccessEquipmentSupplies } from "@/lib/operational-access";
import { toEmployeeAccessContext } from "@/lib/portal-route-access";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

/** Staff supervisors+ and admins may read active inventory (GET /api/inventory). */
export async function requireInventoryReadActor() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return {
      error: NextResponse.json({ error: "Unauthorized." }, { status: 401 }),
    } as const;
  }

  const access = await getEmployeePortalAccess(session.user.id);

  if (!access.allowed || access.pendingVerification) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    } as const;
  }

  const accessContext = toEmployeeAccessContext(access.employee);
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
