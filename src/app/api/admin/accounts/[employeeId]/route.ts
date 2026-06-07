import { mutateAdminAccount } from "@/lib/admin-accounts-service";
import { requireAdminApiActor } from "@/lib/require-admin-api";
import { AccessLevel, EmployeeResponsibility } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ employeeId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { employeeId } = await params;
  const body = (await request.json()) as {
    action?:
      | "approve"
      | "changeAccessLevel"
      | "updateWorkProfile"
      | "changeResponsibilities"
      | "disable"
      | "deleteAccount"
      | "restoreAccount";
    accessLevel?: AccessLevel;
    responsibilities?: EmployeeResponsibility[];
    notes?: string;
    confirmPin?: string;
    jobTitle?: string;
    department?: string;
    locationAssignment?: string;
  };

  if (
    !body.action ||
    ![
      "approve",
      "changeAccessLevel",
      "updateWorkProfile",
      "changeResponsibilities",
      "disable",
      "deleteAccount",
      "restoreAccount",
    ].includes(body.action)
  ) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  try {
    const account = await mutateAdminAccount(authResult.actor, employeeId, {
      action: body.action,
      accessLevel: body.accessLevel,
      responsibilities: body.responsibilities,
      notes: body.notes,
      confirmPin: body.confirmPin,
      workProfile:
        body.action === "updateWorkProfile"
          ? {
              jobTitle: body.jobTitle?.trim() ?? "",
              department: body.department?.trim() ?? "",
              locationAssignment: body.locationAssignment?.trim() ?? "",
            }
          : undefined,
    });

    return NextResponse.json({ account });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update account.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
