import {
  getAssignableAccessLevels,
  isAdminOrSuperAdmin,
} from "@/lib/admin-account-permissions";
import {
  getAdminAccountsSummary,
  listAdminAccounts,
} from "@/lib/admin-accounts-service";
import { requireAdminApiActor } from "@/lib/require-admin-api";
import { AccessLevel } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { actor } = authResult;
  const includeRemoved =
    request.nextUrl.searchParams.get("includeRemoved") === "1" &&
    actor.accessLevel === AccessLevel.SUPER_ADMIN;

  const [accounts, summary] = await Promise.all([
    listAdminAccounts({ includeRemoved }),
    getAdminAccountsSummary(),
  ]);

  return NextResponse.json({
    accounts,
    summary,
    actor: {
      accessLevel: actor.accessLevel,
      name: `${actor.firstName} ${actor.lastName}`.trim(),
    },
    assignableLevels: getAssignableAccessLevels(actor.accessLevel),
    isSuperAdmin: actor.accessLevel === AccessLevel.SUPER_ADMIN,
    isAdmin: isAdminOrSuperAdmin(actor.accessLevel),
  });
}
