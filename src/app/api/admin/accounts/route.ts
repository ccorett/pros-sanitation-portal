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
import { NextResponse } from "next/server";

export async function GET() {
  const authResult = await requireAdminApiActor();
  if ("error" in authResult) {
    return authResult.error;
  }

  const { actor } = authResult;
  const [accounts, summary] = await Promise.all([
    listAdminAccounts(),
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
