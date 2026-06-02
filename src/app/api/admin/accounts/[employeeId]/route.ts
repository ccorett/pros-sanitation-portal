import { mutateAdminAccount } from "@/lib/admin-accounts-service";
import { requireAdminApiActor } from "@/lib/require-admin-api";
import { AccessLevel } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ employeeId: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { employeeId } = await params;
  const body = (await request.json()) as {
    action?: "approve" | "changeAccessLevel" | "disable" | "remove";
    accessLevel?: AccessLevel;
    notes?: string;
  };

  if (
    !body.action ||
    !["approve", "changeAccessLevel", "disable", "remove"].includes(body.action)
  ) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  try {
    const account = await mutateAdminAccount(authResult.actor, employeeId, {
      action: body.action,
      accessLevel: body.accessLevel,
      notes: body.notes,
    });

    return NextResponse.json({ account });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to update account.";
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
