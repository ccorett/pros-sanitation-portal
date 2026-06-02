import { auth } from "@/lib/auth";
import { canAccessAdminModule } from "@/lib/access-levels";
import { getEmployeePortalAccess } from "@/lib/employee-portal-access";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function requireAdminApiActor() {
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

  if (!canAccessAdminModule(access.employee.accessLevel)) {
    return {
      error: NextResponse.json({ error: "Forbidden." }, { status: 403 }),
    } as const;
  }

  return { actor: access.employee, session } as const;
}
