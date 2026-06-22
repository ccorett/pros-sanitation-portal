import { getEmployeePortalAccess } from "@/lib/employee-portal-access";
import {
  resolveAuthenticatedSession,
  sessionExpiredApiResponse,
  unauthorizedApiResponse,
} from "@/lib/require-authenticated-session";
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await resolveAuthenticatedSession();

  if (authResult.status === "unauthenticated") {
    return unauthorizedApiResponse();
  }

  if (authResult.status === "expired") {
    return sessionExpiredApiResponse();
  }

  const { session } = authResult;
  const access = await getEmployeePortalAccess(session.user.id);

  if (!access.allowed) {
    return NextResponse.json({
      allowed: false,
      code: access.code,
      message: access.message,
    });
  }

  return NextResponse.json({
    allowed: true,
    redirectTo: access.redirectTo,
    pendingVerification: access.pendingVerification,
    employee: {
      employeeId: access.employee.employeeId,
      firstName: access.employee.firstName,
      accessLevel: access.employee.accessLevel,
      accountStatus: access.employee.accountStatus,
    },
  });
}
