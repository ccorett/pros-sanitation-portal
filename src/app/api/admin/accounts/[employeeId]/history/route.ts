import { getAccessHistoryForEmployee } from "@/lib/admin-accounts-service";
import {
  canPerformAccountAction,
  isAdminOrSuperAdmin,
} from "@/lib/admin-account-permissions";
import { requireAdminApiActor } from "@/lib/require-admin-api";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ employeeId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { employeeId } = await params;
  const target = await prisma.employee.findUnique({ where: { id: employeeId } });

  if (!target) {
    return NextResponse.json({ error: "Employee not found." }, { status: 404 });
  }

  if (
    !isAdminOrSuperAdmin(authResult.actor.accessLevel) ||
    !canPerformAccountAction(
      authResult.actor.accessLevel,
      target.accessLevel,
      target.accountStatus,
      "viewHistory",
    )
  ) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const history = await getAccessHistoryForEmployee(employeeId);

  return NextResponse.json({ history });
}
