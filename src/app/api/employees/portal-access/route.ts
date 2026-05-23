import { auth } from "@/lib/auth";
import { getEmployeePortalAccess } from "@/lib/employee-portal-access";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

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
    employee: {
      employeeId: access.employee.employeeId,
      firstName: access.employee.firstName,
      accountStatus: access.employee.accountStatus,
    },
  });
}
